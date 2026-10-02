/**
 * glpiDb.js — Conector e Camada de Persistência Relacional GLPI 10.x
 * Mapeamento ITIL Corporativo (glpi_tickets, glpi_computers, glpi_tickettasks, glpi_users, glpi_jbc_compras)
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

class GlpiDatabase {
  constructor() {
    this.pool = null;
    this.conectado = false;
    this.host = process.env.DB_HOST || 'glpi-db';
    this.port = Number(process.env.DB_PORT) || 3306;
    this.user = process.env.DB_USER || 'glpi';
    this.password = process.env.DB_PASSWORD || 'jbcunha_glpi_secret_pass';
    this.database = process.env.DB_NAME || 'glpidb';
  }

  async conectar() {
    try {
      this.pool = mysql.createPool({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        database: this.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
      });

      // Testar conexão
      const [rows] = await this.pool.query('SELECT 1 as teste');
      this.conectado = true;
      console.log(`[GLPI DB] ✅ Conexão estabelecida com sucesso com o banco de dados GLPI (${this.host}:${this.port}/${this.database}).`);
      
      await this.inicializarSchemaSeNecessario();
      return true;
    } catch (err) {
      this.conectado = false;
      console.warn(`[GLPI DB] ⚠️ Banco relacional GLPI indisponível no momento (${err.code || err.message}). Operando em modo de resiliência local.`);
      return false;
    }
  }

  async inicializarSchemaSeNecessario() {
    if (!this.conectado || !this.pool) return;
    try {
      const [tabelas] = await this.pool.query("SHOW TABLES LIKE 'glpi_tickets'");
      if (tabelas.length === 0) {
        console.log('[GLPI DB] Executando DDL de inicialização do schema GLPI...');
        const sqlPath = path.join(__dirname, '..', '..', '..', 'database', 'init-glpi.sql');
        if (fs.existsSync(sqlPath)) {
          const sqlContent = fs.readFileSync(sqlPath, 'utf8');
          const queries = sqlContent.split(';').map(q => q.trim()).filter(q => q.length > 0);
          for (const q of queries) {
            await this.pool.query(q);
          }
          console.log('[GLPI DB] ✅ Schema oficial GLPI 10.x provisionado com sucesso.');
        }
      }
    } catch (e) {
      console.error('[GLPI DB] Erro ao verificar schema:', e.message);
    }
  }

  // Obter todos os atendimentos/equipamentos do GLPI
  async carregarAtendimentos() {
    if (!this.conectado) return null;
    try {
      const [tickets] = await this.pool.query(`
        SELECT t.*, c.name as tag, c.serial, c.otherserial as horimetro, c.contact as resp_cliente,
               l.name as localizacao_nome
        FROM glpi_tickets t
        LEFT JOIN glpi_items_tickets it ON (it.tickets_id = t.id AND it.itemtype = 'Computer')
        LEFT JOIN glpi_computers c ON c.id = it.items_id
        LEFT JOIN glpi_locations l ON l.id = t.locations_id
        WHERE t.is_deleted = 0
        ORDER BY t.id DESC
      `);

      const lista = [];
      for (const t of tickets) {
        // Carregar tarefas/serviços
        const [tasks] = await this.pool.query(
          'SELECT * FROM glpi_tickettasks WHERE tickets_id = ? ORDER BY id ASC',
          [t.id]
        );

        // Carregar timeline / followups
        const [followups] = await this.pool.query(
          'SELECT * FROM glpi_ticketfollowups WHERE tickets_id = ? ORDER BY id ASC',
          [t.id]
        );

        // Carregar fotos/evidências
        const [docs] = await this.pool.query(`
          SELECT d.* FROM glpi_documents d
          JOIN glpi_documents_items di ON di.documents_id = d.id
          WHERE di.items_id = ? AND di.itemtype = 'Ticket'
        `, [t.id]);

        lista.push({
          id: t.id,
          numero: `ATD-${String(t.id).padStart(3, '0')}`,
          tag: t.tag || t.name,
          empresa: t.entities_id ? `Cliente ${t.entities_id}` : '',
          responsavel_cliente: t.resp_cliente || '',
          responsavel_tecnico: '',
          equipamento: t.name,
          placa: t.tag || '',
          horimetro: t.horimetro || '',
          km: '',
          localizacao: t.localizacao_nome || 'Entrada / Recepção',
          estado: this.traduzirStatusGlpiParaEstado(t.status),
          estado_motivo: '',
          prioridade: t.priority >= 4 ? 'Alta' : t.priority === 3 ? 'Média' : 'Baixa',
          queixa_inicial: t.content || '',
          data_entrada: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
          previsao_entrega: t.time_to_resolve ? new Date(t.time_to_resolve).toISOString() : '',
          data_conclusao: t.solvedate ? new Date(t.solvedate).toISOString() : null,
          data_entrega: t.closedate ? new Date(t.closedate).toISOString() : null,
          num_orcamento: t.num_orcamento || '',
          num_os: t.num_os || '',
          num_nf: t.num_nf || '',
          custo_direto: Number(t.custo_direto) || 0,
          fotos: docs.map(d => ({
            id: d.id,
            arquivo_url: d.filepath,
            arquivo_nome: d.filename,
            tipo_evidencia: d.tag || 'vistoria',
            data_upload: new Date(d.date_creation).toISOString()
          })),
          servicos: tasks.map(tk => ({
            id: tk.id,
            titulo: tk.titulo_servico || tk.content || 'Serviço',
            descricao: tk.content || '',
            responsavel: '',
            estado: tk.estado_interno || (tk.state === 2 ? 'concluido' : tk.state === 1 ? 'em_execucao' : 'pendente'),
            estado_motivo: '',
            atividades: []
          })),
          historico_movimentacoes: followups.map(f => ({
            data: new Date(f.date).toISOString(),
            usuario: 'Operação',
            acao: 'atualizacao',
            nota: f.content
          }))
        });
      }

      return lista;
    } catch (err) {
      console.error('[GLPI DB] Erro ao carregar atendimentos:', err.message);
      return null;
    }
  }

  // Carregar compras diretamente do GLPI
  async carregarCompras() {
    if (!this.conectado) return null;
    try {
      const [rows] = await this.pool.query('SELECT * FROM glpi_jbc_compras ORDER BY id DESC');
      return rows.map(r => ({
        id: r.id,
        tickets_id: r.tickets_id,
        solicitante: r.solicitante,
        solicitante_id: r.solicitante_id,
        descricao: r.descricao,
        quantidade: r.quantidade,
        valor_unitario: Number(r.valor_unitario),
        valor_total: Number(r.valor_total),
        fornecedor: r.fornecedor || '',
        status: r.status,
        urgencia: r.urgencia || 'Normal',
        aprovado_por: r.aprovado_por || null,
        motivo_recusa: r.motivo_recusa || null,
        data_solicitacao: r.data_solicitacao ? new Date(r.data_solicitacao).toISOString() : new Date().toISOString(),
        data_aprovacao: r.data_aprovacao ? new Date(r.data_aprovacao).toISOString() : null
      }));
    } catch (err) {
      console.error('[GLPI DB] Erro ao carregar compras:', err.message);
      return null;
    }
  }

  // Salvar compra no GLPI
  async salvarCompra(c) {
    if (!this.conectado) return;
    try {
      if (c.id) {
        const [existe] = await this.pool.query('SELECT id FROM glpi_jbc_compras WHERE id = ?', [c.id]);
        if (existe.length > 0) {
          await this.pool.query(`
            UPDATE glpi_jbc_compras
            SET status = ?, aprovado_por = ?, motivo_recusa = ?, data_aprovacao = ?
            WHERE id = ?
          `, [
            c.status,
            c.aprovado_por || null,
            c.motivo_recusa || null,
            c.data_aprovacao ? new Date(c.data_aprovacao) : null,
            c.id
          ]);
          return;
        }
      }

      await this.pool.query(`
        INSERT INTO glpi_jbc_compras
        (id, tickets_id, solicitante, solicitante_id, descricao, quantidade, valor_unitario, valor_total, fornecedor, status, urgencia, data_solicitacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        c.id || null,
        c.tickets_id || null,
        c.solicitante,
        c.solicitante_id || null,
        c.descricao,
        c.quantidade || 1,
        c.valor_unitario || 0,
        c.valor_total || (c.quantidade * c.valor_unitario),
        c.fornecedor || '',
        c.status || 'pendente',
        c.urgencia || 'Normal',
        c.data_solicitacao ? new Date(c.data_solicitacao) : new Date()
      ]);
    } catch (err) {
      console.error('[GLPI DB] Erro ao persistir compra:', err.message);
    }
  }

  // Deletar compra do GLPI
  async deletarCompra(id) {
    if (!this.conectado) return;
    try {
      await this.pool.query('DELETE FROM glpi_jbc_compras WHERE id = ?', [id]);
    } catch (err) {
      console.error('[GLPI DB] Erro ao deletar compra:', err.message);
    }
  }

  // Salvar ou atualizar atendimento no GLPI
  async salvarAtendimento(eq) {
    if (!this.conectado) return;
    try {
      const statusGlpi = this.traduzirEstadoParaStatusGlpi(eq.estado);
      const prioridadeGlpi = eq.prioridade === 'Alta' ? 4 : eq.prioridade === 'Urgente' ? 5 : 3;

      // 1. Inserir ou atualizar glpi_computers
      let computerId = null;
      const [compRows] = await this.pool.query(
        'SELECT id FROM glpi_computers WHERE name = ? LIMIT 1',
        [eq.tag || eq.equipamento]
      );

      if (compRows.length > 0) {
        computerId = compRows[0].id;
        await this.pool.query(`
          UPDATE glpi_computers 
          SET otherserial = ?, contact = ?, comment = ?
          WHERE id = ?
        `, [eq.horimetro || eq.km || '', eq.responsavel_cliente || '', eq.queixa_inicial || '', computerId]);
      } else {
        const [insComp] = await this.pool.query(`
          INSERT INTO glpi_computers (name, otherserial, contact, comment)
          VALUES (?, ?, ?, ?)
        `, [eq.tag || eq.equipamento, eq.horimetro || eq.km || '', eq.responsavel_cliente || '', eq.queixa_inicial || '']);
        computerId = insComp.insertId;
      }

      // 2. Inserir ou atualizar glpi_tickets
      const [ticketRows] = await this.pool.query('SELECT id FROM glpi_tickets WHERE id = ?', [eq.id]);
      if (ticketRows.length > 0) {
        await this.pool.query(`
          UPDATE glpi_tickets
          SET name = ?, status = ?, priority = ?, content = ?,
              num_orcamento = ?, num_os = ?, num_nf = ?, custo_direto = ?,
              time_to_resolve = ?, solvedate = ?, closedate = ?
          WHERE id = ?
        `, [
          eq.equipamento,
          statusGlpi,
          prioridadeGlpi,
          eq.queixa_inicial || '',
          eq.num_orcamento || '',
          eq.num_os || '',
          eq.num_nf || '',
          Number(eq.custo_direto) || 0,
          eq.previsao_entrega ? new Date(eq.previsao_entrega) : null,
          eq.data_conclusao ? new Date(eq.data_conclusao) : null,
          eq.data_entrega ? new Date(eq.data_entrega) : null,
          eq.id
        ]);
      } else {
        await this.pool.query(`
          INSERT INTO glpi_tickets
          (id, name, date, status, priority, content, num_orcamento, num_os, num_nf, custo_direto, time_to_resolve)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          eq.id,
          eq.equipamento,
          eq.data_entrada ? new Date(eq.data_entrada) : new Date(),
          statusGlpi,
          prioridadeGlpi,
          eq.queixa_inicial || '',
          eq.num_orcamento || '',
          eq.num_os || '',
          eq.num_nf || '',
          Number(eq.custo_direto) || 0,
          eq.previsao_entrega ? new Date(eq.previsao_entrega) : null
        ]);

        // Vínculo Computer -> Ticket
        if (computerId) {
          await this.pool.query(`
            INSERT IGNORE INTO glpi_items_tickets (items_id, itemtype, tickets_id)
            VALUES (?, 'Computer', ?)
          `, [computerId, eq.id]);
        }
      }

      // 3. Atualizar tarefas/serviços
      if (Array.isArray(eq.servicos)) {
        for (const s of eq.servicos) {
          const stateGlpi = s.estado === 'concluido' ? 2 : s.estado === 'em_execucao' ? 1 : 0;
          if (s.id) {
            const [tRows] = await this.pool.query('SELECT id FROM glpi_tickettasks WHERE id = ?', [s.id]);
            if (tRows.length > 0) {
              await this.pool.query(`
                UPDATE glpi_tickettasks
                SET titulo_servico = ?, content = ?, state = ?, estado_interno = ?
                WHERE id = ?
              `, [s.titulo, s.descricao || '', stateGlpi, s.estado, s.id]);
              continue;
            }
          }
          await this.pool.query(`
            INSERT INTO glpi_tickettasks
            (id, tickets_id, date, titulo_servico, content, state, estado_interno)
            VALUES (?, ?, NOW(), ?, ?, ?, ?)
          `, [s.id || null, eq.id, s.titulo, s.descricao || '', stateGlpi, s.estado]);
        }
      }
    } catch (err) {
      console.error('[GLPI DB] Erro ao persistir atendimento:', err.message);
    }
  }

  // Deletar atendimento no GLPI
  async deletarAtendimento(id) {
    if (!this.conectado) return;
    try {
      await this.pool.query('UPDATE glpi_tickets SET is_deleted = 1 WHERE id = ?', [id]);
    } catch (err) {
      console.error('[GLPI DB] Erro ao marcar ticket como deletado:', err.message);
    }
  }

  // Tradução dos estados de workflow JB Cunha para o ITIL GLPI
  traduzirStatusGlpiParaEstado(status) {
    switch (Number(status)) {
      case 1: return 'recebido';
      case 2: return 'em_execucao';
      case 3: return 'em_diagnostico';
      case 4: return 'aguardando_peca';
      case 5: return 'pronto';
      case 6: return 'entregue';
      default: return 'em_execucao';
    }
  }

  traduzirEstadoParaStatusGlpi(estado) {
    switch (estado) {
      case 'recebido': return 1;
      case 'em_inspecao':
      case 'em_diagnostico': return 3;
      case 'em_execucao':
      case 'em_desmontagem':
      case 'em_montagem':
      case 'em_reparo':
      case 'em_fabricacao':
      case 'em_soldagem':
      case 'em_teste': return 2;
      case 'aguardando_peca':
      case 'aguardando_material':
      case 'aguardando_cliente':
      case 'aguardando_diagnostico':
      case 'aguardando_aprovacao':
      case 'aguardando_execucao': return 4;
      case 'pronto':
      case 'concluida':
      case 'concluido': return 5;
      case 'entregue': return 6;
      default: return 2;
    }
  }
}

module.exports = new GlpiDatabase();
