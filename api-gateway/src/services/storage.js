/**
 * Storage — Central JB Cunha v3.0
 * Hierarquia: Equipamento → Serviços → Atividades → Estado+Motivo
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const config = require('../config');
const glpiDb = require('./glpiDb');

// ────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────

const ESTADOS_VALIDOS = [
  'recebido', 'em_inspecao', 'em_diagnostico',
  'em_execucao', 'em_desmontagem', 'em_montagem',
  'em_reparo', 'em_fabricacao', 'em_soldagem', 'em_teste',
  'aguardando_peca', 'aguardando_material', 'aguardando_cliente',
  'aguardando_diagnostico', 'aguardando_aprovacao', 'aguardando_execucao',
  'pronto', 'concluida', 'concluido', 'entregue'
];

const LABEL_ESTADO = {
  recebido:               'Recebido',
  em_inspecao:            'Em inspeção',
  em_diagnostico:         'Em diagnóstico',
  em_execucao:            'Em execução',
  em_desmontagem:         'Em desmontagem',
  em_montagem:            'Em montagem',
  em_reparo:              'Em reparo',
  em_fabricacao:          'Em fabricação',
  em_soldagem:            'Em soldagem',
  em_teste:               'Em teste',
  aguardando_peca:        'Aguardando peça',
  aguardando_material:    'Aguardando material',
  aguardando_cliente:     'Aguardando cliente',
  aguardando_diagnostico: 'Aguardando diagnóstico',
  aguardando_aprovacao:   'Aguardando aprovação',
  aguardando_execucao:    'Aguardando execução',
  pronto:                 'Pronto para entrega',
  concluida:              'Concluído',
  concluido:              'Concluído',
  entregue:               'Entregue'
};

const GRUPO_ESTADO = {
  em_andamento: ['em_execucao','em_desmontagem','em_montagem','em_reparo','em_fabricacao','em_soldagem','em_teste','em_inspecao','em_diagnostico'],
  aguardando:   ['aguardando_peca','aguardando_material','aguardando_cliente','aguardando_diagnostico','aguardando_aprovacao','aguardando_execucao'],
  pronto:       ['pronto','concluida','concluido'],
  entregue:     ['entregue'],
  recebido:     ['recebido']
};

// ────────────────────────────────────────────────────────────
// Dados de exemplo (seed)
// ────────────────────────────────────────────────────────────

function gerarSeedData() {
  const agora = new Date();
  return {
    versao: '3.1',
    migrado_em: agora.toISOString(),
    compras_diretas: [],
    equipamentos: []
  };
}

// ────────────────────────────────────────────────────────────
// Classe Storage (Compatibilidade Híbrida JSON + GLPI DB)
// ────────────────────────────────────────────────────────────

class Storage extends EventEmitter {
  constructor() {
    super();
    this.dataFilePath = path.join(config.DATA_DIR, 'database.json');
    this.uploadsDir = path.join(config.UPLOADS_DIR);
    this.data = null;
    this.init();
  }

  init() {
    const dir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.uploadsDir)) fs.mkdirSync(this.uploadsDir, { recursive: true });

    // Inicialização da conexão com o banco de dados GLPI
    setTimeout(async () => {
      try {
        const ok = await glpiDb.conectar();
        if (ok) {
          const tickets = await glpiDb.carregarAtendimentos();
          if (tickets && tickets.length > 0) {
            this.sincronizarComGlpi(tickets);
            this.save();
          }
          const compras = await glpiDb.carregarCompras();
          if (compras && compras.length > 0) {
            this.sincronizarComprasGlpi(compras);
            this.save();
          }
        }
      } catch (err) {
        console.warn('[Storage] Conexão assíncrona ao GLPI DB:', err.message);
      }
    }, 200);

    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data || !Array.isArray(this.data.equipamentos)) {
          console.log('[Storage] Banco em formato inválido ou vazio. Inicializando com segurança...');
          this.data = gerarSeedData();
          this.save();
        } else {
          // Atualiza versão sem nunca apagar dados de produção
          this.data.versao = '3.1';
          this.cleanChatLogs();
        }
      } catch (err) {
        console.error('[Storage] Erro ao ler database.json, reinicializando:', err.message);
        this.data = gerarSeedData();
        this.save();
      }
    } else {
      this.data = gerarSeedData();
      this.save();
    }
  }

  sincronizarComGlpi(tickets) {
    if (!Array.isArray(tickets) || tickets.length === 0) return;
    if (!this.data) this.data = gerarSeedData();
    if (!Array.isArray(this.data.equipamentos)) this.data.equipamentos = [];

    tickets.forEach(ticket => {
      const idx = this.data.equipamentos.findIndex(e => e.id === ticket.id);
      if (idx !== -1) {
        const eq = this.data.equipamentos[idx];
        // Preserva atributos ricos locais que o GLPI padrão não contempla
        const responsavelTecnico = eq.responsavel_tecnico || ticket.responsavel_tecnico || '';
        const localizacao = (eq.localizacao && eq.localizacao !== 'Entrada / Recepção') ? eq.localizacao : (ticket.localizacao || eq.localizacao || 'Entrada / Recepção');
        const estado = (eq.estado && eq.estado !== 'recebido') ? eq.estado : (ticket.estado || eq.estado || 'recebido');
        const estadoMotivo = eq.estado_motivo || ticket.estado_motivo || '';
        const chat = (Array.isArray(eq.chat) && eq.chat.length > 0) ? eq.chat : (ticket.chat || []);
        const fotos = (Array.isArray(eq.fotos) && eq.fotos.length > 0) ? eq.fotos : (ticket.fotos || []);
        const progressoManual = (typeof eq.progresso === 'number' && eq.progresso > 0) ? eq.progresso : null;

        // Mesclar serviços preservando atividades filhas detalhadas
        const servicosMesclados = Array.isArray(eq.servicos) && eq.servicos.length > 0 ? [...eq.servicos] : [];
        if (Array.isArray(ticket.servicos)) {
          ticket.servicos.forEach(sGlpi => {
            const sIdx = servicosMesclados.findIndex(s => s.id === sGlpi.id || (s.titulo && s.titulo.toLowerCase() === (sGlpi.titulo || '').toLowerCase()));
            if (sIdx !== -1) {
              const sExist = servicosMesclados[sIdx];
              servicosMesclados[sIdx] = {
                ...sGlpi,
                ...sExist,
                estado: sExist.estado || sGlpi.estado,
                responsavel: sExist.responsavel || sGlpi.responsavel || '',
                atividades: (Array.isArray(sExist.atividades) && sExist.atividades.length > 0) ? sExist.atividades : (sGlpi.atividades || [])
              };
            } else {
              servicosMesclados.push(sGlpi);
            }
          });
        }

        this.data.equipamentos[idx] = {
          ...ticket,
          ...eq,
          responsavel_tecnico: responsavelTecnico,
          localizacao: localizacao,
          estado: estado,
          estado_motivo: estadoMotivo,
          chat: chat,
          dossie: chat,
          fotos: fotos,
          servicos: servicosMesclados
        };

        if (progressoManual !== null) {
          this.data.equipamentos[idx].progresso = progressoManual;
        }
        this._calcularTempos(this.data.equipamentos[idx]);
      } else {
        this._calcularTempos(ticket);
        this.data.equipamentos.push(ticket);
      }
    });
  }

  sincronizarComprasGlpi(compras) {
    if (!Array.isArray(compras) || compras.length === 0) return;
    if (!this.data) this.data = gerarSeedData();
    if (!Array.isArray(this.data.compras_diretas)) this.data.compras_diretas = [];

    compras.forEach(c => {
      const idx = this.data.compras_diretas.findIndex(x => x.id === c.id);
      if (idx !== -1) {
        this.data.compras_diretas[idx] = { ...this.data.compras_diretas[idx], ...c };
      } else {
        this.data.compras_diretas.push(c);
      }
    });
  }

  cleanChatLogs() {
    if (this.data && Array.isArray(this.data.equipamentos)) {
      let changed = false;
      this.data.equipamentos.forEach(eq => {
        const limpos = (eq.chat || eq.dossie || []).filter(m => {
          const t = m.texto || '';
          if (t.includes('Dados cadastrais atualizados')) return false;
          if (t.includes('Estado alterado de')) return false;
          if (t.includes('Status do serviço')) return false;
          if (t.includes('Equipamento movido de')) return false;
          if (t.includes('Novo serviço adicionado:')) return false;
          return true;
        });
        if (limpos.length !== (eq.chat || eq.dossie || []).length) {
          eq.chat = limpos;
          eq.dossie = limpos;
          changed = true;
        }
      });
      if (changed) this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.data, null, 2), 'utf8');
      this.emit('change');
      if (glpiDb && glpiDb.conectado && this.data) {
        if (Array.isArray(this.data.equipamentos)) {
          this.data.equipamentos.forEach(eq => glpiDb.salvarAtendimento(eq).catch(() => {}));
        }
        if (Array.isArray(this.data.compras_diretas)) {
          this.data.compras_diretas.forEach(c => glpiDb.salvarCompra(c).catch(() => {}));
        }
      }
    } catch (err) {
      console.error('[Storage] Erro ao salvar:', err.message);
    }
  }

  // ──────────────────────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────────────────────

  _encontrarEquipamento(id) {
    return this.data.equipamentos.find(e => e.id === parseInt(id));
  }

  _encontrarServico(eq, sid) {
    return eq.servicos.find(s => s.id === parseInt(sid));
  }

  _encontrarAtividade(srv, aid) {
    return srv.atividades.find(a => a.id === parseInt(aid));
  }

  _calcularTempos(eq) {
    const agora = new Date();
    const entrada = new Date(eq.data_entrada);

    const diffMin = Math.max(0, Math.floor((agora - entrada) / 60000));
    const dias = Math.floor(diffMin / (60 * 24));
    const horas = Math.floor((diffMin % (60 * 24)) / 60);
    const minutos = diffMin % 60;
    eq.tempo_oficina = dias > 0 ? `${dias}d ${horas}h` : `${horas}h ${minutos}m`;

    // Sincronizar chat e dossiê (feed unificado de mensagens e evidências)
    if (!eq.chat) {
      eq.chat = Array.isArray(eq.dossie) ? [...eq.dossie] : [];
    }
    eq.dossie = eq.chat;

    // Atualização mais recente em qualquer atividade, serviço ou chat
    let ultimaAtualMs = entrada.getTime();
    (eq.servicos || []).forEach(s => {
      (s.atividades || []).forEach(a => {
        const ua = a.atualizacao ? new Date(a.atualizacao).getTime() : 0;
        if (ua > ultimaAtualMs) ultimaAtualMs = ua;
      });
      const ua = s.atualizado_em ? new Date(s.atualizado_em).getTime() : 0;
      if (ua > ultimaAtualMs) ultimaAtualMs = ua;
    });
    const chatUlt = eq.chat.length > 0 ? new Date(eq.chat[eq.chat.length - 1].data).getTime() : 0;
    if (chatUlt > ultimaAtualMs) ultimaAtualMs = chatUlt;

    const diffUltMin = Math.max(0, Math.floor((agora.getTime() - ultimaAtualMs) / 60000));
    const dU = Math.floor(diffUltMin / (60 * 24));
    const hU = Math.floor((diffUltMin % (60 * 24)) / 60);
    const mU = diffUltMin % 60;
    eq.ultima_atualizacao_label = dU > 0 ? `${dU}d ${hU}h` : hU > 0 ? `${hU}h ${mU}m` : `${mU}m`;

    // Atraso
    eq.atrasado = eq.estado !== 'entregue' && eq.previsao_entrega
      ? agora > new Date(eq.previsao_entrega)
      : false;

    // Progresso geral baseado em atividades, serviços ou estado operacional
    let totalAtiv = 0, concluidasAtiv = 0;
    const srvs = eq.servicos || [];
    srvs.forEach(s => {
      const atvs = s.atividades || [];
      totalAtiv += atvs.length;
      concluidasAtiv += atvs.filter(a => a.estado === 'concluida' || a.concluida).length;
    });

    if (eq.estado === 'pronto' || eq.estado === 'entregue') {
      eq.progresso = 100;
    } else if (totalAtiv > 0) {
      eq.progresso = Math.round((concluidasAtiv / totalAtiv) * 100);
    } else if (srvs.length > 0) {
      // Quando há serviços sem atividades detalhadas cadastradas
      let somaProgSrv = 0;
      srvs.forEach(s => {
        if (['concluida', 'concluido'].includes(s.estado)) somaProgSrv += 100;
        else if (['em_execucao', 'em_reparo', 'em_montagem', 'em_desmontagem', 'em_fabricacao', 'em_soldagem'].includes(s.estado)) somaProgSrv += 50;
        else if (s.estado === 'em_teste') somaProgSrv += 85;
        else if (['em_diagnostico', 'em_inspecao'].includes(s.estado)) somaProgSrv += 20;
        else if ((s.estado || '').startsWith('aguardando')) somaProgSrv += 25;
        else somaProgSrv += 0;
      });
      eq.progresso = Math.round(somaProgSrv / srvs.length);
    } else if (typeof eq.progresso === 'number' && eq.progresso > 0) {
      // Preserva progresso manual se definido
      eq.progresso = Math.min(100, Math.max(0, Math.round(eq.progresso)));
    } else {
      // Estágio geral de fluxo do equipamento
      const ESTADO_PROG = {
        recebido: 0, em_inspecao: 15, em_diagnostico: 20,
        aguardando_aprovacao: 25, aguardando_peca: 30, aguardando_material: 30,
        aguardando_cliente: 25, aguardando_execucao: 35,
        em_desmontagem: 45, em_execucao: 55, em_reparo: 60,
        em_fabricacao: 65, em_soldagem: 65, em_montagem: 75,
        em_teste: 85, pronto: 100, entregue: 100
      };
      eq.progresso = ESTADO_PROG[eq.estado] || 0;
    }
    eq.total_atividades = totalAtiv;
    eq.atividades_concluidas = concluidasAtiv;

    // Múltiplos serviços em paralelo: gerar lista enriquecida e métricas
    const servicosLista = (eq.servicos || []).map(s => {
      const atvs = s.atividades || [];
      const tAtv = atvs.length;
      const cAtv = atvs.filter(a => a.estado === 'concluida' || a.concluida).length;
      const atvAtiva = atvs.find(a => a.estado === 'em_andamento');
      const progSrv = tAtv > 0
        ? Math.round((cAtv / tAtv) * 100)
        : (['concluida','concluido'].includes(s.estado) ? 100 : ['em_execucao','em_reparo','em_montagem','em_desmontagem','em_fabricacao','em_soldagem'].includes(s.estado) ? 50 : s.estado === 'em_teste' ? 85 : ['em_diagnostico','em_inspecao'].includes(s.estado) ? 20 : (s.estado || '').startsWith('aguardando') ? 25 : 0);
      return {
        id: s.id,
        titulo: s.titulo,
        descricao: s.descricao || '',
        responsavel: s.responsavel || '',
        estado: s.estado || 'em_diagnostico',
        estado_motivo: s.estado_motivo || '',
        estado_label: LABEL_ESTADO[s.estado] || s.estado,
        total_atividades: tAtv,
        atividades_concluidas: cAtv,
        atividade_ativa: atvAtiva ? atvAtiva.descricao : null,
        progresso: progSrv
      };
    });

    const totalSrv = servicosLista.length;
    const concluidosSrv = servicosLista.filter(s => ['concluida','concluido'].includes(s.estado)).length;
    const andamentoSrv = servicosLista.filter(s => GRUPO_ESTADO.em_andamento.includes(s.estado)).length;
    const aguardandoSrv = servicosLista.filter(s => GRUPO_ESTADO.aguardando.includes(s.estado)).length;
    const diagnosticoSrv = servicosLista.filter(s => s.estado === 'em_diagnostico').length;

    eq.servicos_resumo = {
      total: totalSrv,
      concluidos: concluidosSrv,
      em_andamento: andamentoSrv,
      aguardando: aguardandoSrv,
      diagnostico: diagnosticoSrv
    };
    eq.servicos_lista = servicosLista;

    // Manter compatibilidade com leitores legados de servico_atual
    const servicosAtivos = eq.servicos.filter(s => s.estado !== 'concluida' && s.estado !== 'concluido' && s.estado !== 'entregue');
    if (servicosAtivos.length > 0) {
      eq.servico_atual = servicosAtivos.map(s => s.titulo).join(' · ');
      eq.responsavel_atual = servicosAtivos[0].responsavel || eq.responsavel_tecnico || '';
      const atividadeAtiva = servicosAtivos[0].atividades.find(a => a.estado === 'em_andamento');
      eq.atividade_atual = atividadeAtiva ? atividadeAtiva.descricao : null;
    } else if (eq.servicos.length > 0) {
      eq.servico_atual = eq.servicos.map(s => s.titulo).join(' · ');
      eq.responsavel_atual = eq.servicos[eq.servicos.length - 1].responsavel || '';
      eq.atividade_atual = null;
    } else {
      eq.servico_atual = 'Sem serviço definido';
      eq.responsavel_atual = eq.responsavel_tecnico || '';
      eq.atividade_atual = null;
    }

    eq.estado_label = LABEL_ESTADO[eq.estado] || eq.estado;
  }

  // ──────────────────────────────────────────────────────────
  // CRUD Equipamentos
  // ──────────────────────────────────────────────────────────

  getEquipamentos(filtro = null) {
    this.data.equipamentos.forEach(e => this._calcularTempos(e));

    let lista = this.data.equipamentos;
    if (filtro === 'Patio') {
      lista = lista.filter(e => e.estado !== 'entregue');
    } else if (filtro === 'Entregues' || filtro === 'entregue') {
      lista = lista.filter(e => e.estado === 'entregue');
    } else if (filtro && filtro !== 'Todos') {
      lista = lista.filter(e => e.estado === filtro);
    }
    return lista;
  }

  getEquipamentoById(id) {
    const eq = this._encontrarEquipamento(id);
    if (eq) this._calcularTempos(eq);
    return eq;
  }

  createEquipamento(payload) {
    const nextId = this.data.equipamentos.length > 0
      ? Math.max(...this.data.equipamentos.map(e => e.id)) + 1 : 1;
    const agora = new Date().toISOString();

    const novo = {
      id: nextId,
      numero: `ATD-${String(nextId).padStart(3, '0')}`,
      tag: payload.tag || `EQ-${String(nextId).padStart(4, '0')}`,
      empresa: payload.empresa || 'Empresa não informada',
      responsavel_cliente: payload.responsavel_cliente || '',
      responsavel_tecnico: payload.responsavel_tecnico || '',
      equipamento: payload.equipamento || 'Equipamento',
      placa: payload.placa ? payload.placa.toUpperCase() : '',
      horimetro: payload.horimetro || '',
      km: payload.km || '',
      localizacao: payload.localizacao || 'Baia 01',
      estado: payload.estado || 'recebido',
      estado_motivo: payload.estado_motivo || '',
      prioridade: payload.prioridade || 'Normal',
      queixa_inicial: payload.queixa_inicial || '',
      data_entrada: agora,
      previsao_entrega: payload.previsao_entrega || null,
      data_conclusao: null,
      data_entrega: null,
      num_orcamento: payload.num_orcamento || '',
      num_os: payload.num_os || '',
      num_nf: payload.num_nf || '',
      servicos: [],
      dossie: [{
        id: 1,
        autor: payload.responsavel_tecnico || 'Chefe de Oficina',
        data: agora,
        texto: `Equipamento recebido. Alocado em ${payload.localizacao || 'Baia 01'}. Queixa: ${payload.queixa_inicial || 'a verificar.'}`,
        foto: ''
      }],
      fotos: []
    };

    if (payload.progresso !== undefined && payload.progresso !== null) {
      novo.progresso = Math.min(100, Math.max(0, parseInt(payload.progresso, 10) || 0));
    }

    this._calcularTempos(novo);
    this.data.equipamentos.unshift(novo);
    this.save();
    return novo;
  }

  updateEquipamento(id, payload, usuario = 'Chefe de Oficina') {
    const eq = this._encontrarEquipamento(id);
    if (!eq) return null;
    const campos = [
      'tag', 'empresa', 'responsavel_cliente', 'responsavel_tecnico',
      'equipamento', 'placa', 'horimetro', 'km', 'localizacao',
      'prioridade', 'previsao_entrega', 'num_orcamento', 'num_os', 'num_nf',
      'queixa_inicial', 'estado', 'estado_motivo', 'obs_orcamento', 'condicoes_comerciais',
      'progresso'
    ];
    campos.forEach(c => {
      if (payload[c] !== undefined && payload[c] !== null) {
        eq[c] = payload[c];
      }
    });
    if (payload.placa !== undefined) eq.placa = (payload.placa || '').toUpperCase();
    if (payload.tag !== undefined) eq.tag = (payload.tag || '').trim();
    if (payload.progresso !== undefined && payload.progresso !== null) {
      eq.progresso = Math.min(100, Math.max(0, parseInt(payload.progresso, 10) || 0));
    }

    const agora = new Date().toISOString();
    if (eq.estado === 'pronto' && !eq.data_conclusao) eq.data_conclusao = agora;
    if (eq.estado === 'entregue' && !eq.data_entrega) eq.data_entrega = agora;

    // Sem logs automáticos de sistema no chat/dossiê
    this._calcularTempos(eq);
    this.save();
    return eq;
  }

  updateEstado(id, estado, motivo = '', usuario = 'Chefe de Oficina') {
    const eq = this._encontrarEquipamento(id);
    if (!eq) return null;

    eq.estado = estado;
    eq.estado_motivo = motivo || '';
    const agora = new Date().toISOString();

    if (estado === 'pronto') eq.data_conclusao = agora;
    if (estado === 'entregue') eq.data_entrega = agora;

    // Sem logs automáticos de sistema no chat/dossiê
    this._calcularTempos(eq);
    this.save();
    return eq;
  }

  updateLocalizacao(id, localizacao, usuario = 'Chefe de Oficina') {
    const eq = this._encontrarEquipamento(id);
    if (!eq) return null;
    eq.localizacao = localizacao;
    this.save();
    return eq;
  }

  deleteEquipamento(id) {
    const idx = this.data.equipamentos.findIndex(e => e.id === parseInt(id));
    if (idx !== -1) { this.data.equipamentos.splice(idx, 1); this.save(); return true; }
    return false;
  }

  duplicarEquipamento(id, overrides = {}) {
    const original = this._encontrarEquipamento(id);
    if (!original) return null;

    const nextId = this.data.equipamentos.length > 0
      ? Math.max(...this.data.equipamentos.map(e => e.id)) + 1 : 1;
    const agora = new Date().toISOString();

    // Clonar serviços e atividades com novos IDs seqüenciais
    const servicosClonados = (original.servicos || []).map((srv, si) => {
      const ativsClonadas = (srv.atividades || []).map((atv, ai) => ({
        id: ai + 1,
        descricao: atv.descricao,
        responsavel: atv.responsavel || '',
        estado: 'pendente',
        estado_motivo: '',
        inicio: null,
        atualizacao: agora,
        concluida: false,
        concluida_em: null,
        historico: [{ acao: 'criada', usuario: overrides.usuario || 'Chefe de Oficina', data: agora, nota: 'Duplicada de ' + (original.tag || original.numero) }]
      }));
      return {
        id: si + 1,
        titulo: srv.titulo,
        descricao: srv.descricao || '',
        responsavel: srv.responsavel || '',
        estado: 'em_diagnostico',
        estado_motivo: '',
        criado_em: agora,
        atualizado_em: agora,
        atividades: ativsClonadas
      };
    });

    const novo = {
      id: nextId,
      numero: `ATD-${String(nextId).padStart(3, '0')}`,
      tag: overrides.tag || (original.tag + '-CÓPIA'),
      empresa: overrides.empresa !== undefined ? overrides.empresa : original.empresa,
      responsavel_cliente: overrides.responsavel_cliente !== undefined ? overrides.responsavel_cliente : (original.responsavel_cliente || ''),
      responsavel_tecnico: overrides.responsavel_tecnico !== undefined ? overrides.responsavel_tecnico : (original.responsavel_tecnico || ''),
      equipamento: overrides.equipamento !== undefined ? overrides.equipamento : original.equipamento,
      placa: overrides.placa !== undefined ? (overrides.placa || '').toUpperCase() : (original.placa || ''),
      horimetro: overrides.horimetro !== undefined ? overrides.horimetro : (original.horimetro || ''),
      km: overrides.km !== undefined ? overrides.km : (original.km || ''),
      localizacao: overrides.localizacao !== undefined ? overrides.localizacao : (original.localizacao || 'Baia 01'),
      estado: 'recebido',
      estado_motivo: '',
      prioridade: overrides.prioridade !== undefined ? overrides.prioridade : (original.prioridade || 'Normal'),
      queixa_inicial: overrides.queixa_inicial !== undefined ? overrides.queixa_inicial : (original.queixa_inicial || ''),
      data_entrada: agora,
      previsao_entrega: overrides.previsao_entrega !== undefined ? overrides.previsao_entrega : (original.previsao_entrega || null),
      data_conclusao: null,
      data_entrega: null,
      num_orcamento: overrides.num_orcamento !== undefined ? overrides.num_orcamento : '',
      num_os: overrides.num_os !== undefined ? overrides.num_os : '',
      num_nf: overrides.num_nf !== undefined ? overrides.num_nf : '',
      servicos: servicosClonados,
      chat: [{
        id: 1,
        autor: overrides.usuario || 'Chefe de Oficina',
        data: agora,
        texto: `Equipamento duplicado a partir de ${original.tag || original.numero}. Todos os serviços e atividades foram copiados.`,
        servico_id: null,
        servico_titulo: '',
        midia_url: '',
        midia_tipo: null,
        midia_nome: '',
        foto: ''
      }],
      dossie: [],
      fotos: []
    };

    // Sincronizar dossie com chat
    novo.dossie = novo.chat;

    this.data.equipamentos.unshift(novo);
    this._calcularTempos(novo);
    this.save();
    return novo;
  }

  // ──────────────────────────────────────────────────────────
  // CRUD Serviços
  // ──────────────────────────────────────────────────────────

  addServico(equipId, payload) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return null;
    const nextId = eq.servicos.length > 0 ? Math.max(...eq.servicos.map(s => s.id)) + 1 : 1;
    const agora = new Date().toISOString();
    const novo = {
      id: nextId,
      titulo: payload.titulo || 'Novo serviço',
      descricao: payload.descricao || '',
      responsavel: payload.responsavel || '',
      estado: payload.estado || 'em_diagnostico',
      estado_motivo: payload.estado_motivo || '',
      valor: parseFloat(payload.valor) || 0,
      horas: parseFloat(payload.horas) || 0,
      criado_em: agora,
      atualizado_em: agora,
      atividades: []
    };
    eq.servicos.push(novo);
    // Sem logs automáticos de sistema no chat/dossiê
    this._calcularTempos(eq);
    this.save();
    return novo;
  }

  updateServico(equipId, servicoId, payload) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return null;
    const srv = this._encontrarServico(eq, servicoId);
    if (!srv) return null;

    ['titulo','descricao','responsavel','estado','estado_motivo','valor','horas'].forEach(c => {
      if (payload[c] !== undefined) srv[c] = payload[c];
    });
    if (payload.valor !== undefined) srv.valor = parseFloat(payload.valor) || 0;
    if (payload.horas !== undefined) srv.horas = parseFloat(payload.horas) || 0;
    srv.atualizado_em = new Date().toISOString();

    // Sem logs automáticos de sistema no chat/dossiê
    this.save();
    this._calcularTempos(eq);
    return srv;
  }

  deleteServico(equipId, servicoId) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return false;
    const idx = eq.servicos.findIndex(s => s.id === parseInt(servicoId));
    if (idx !== -1) { eq.servicos.splice(idx, 1); this.save(); return true; }
    return false;
  }

  // ──────────────────────────────────────────────────────────
  // CRUD Atividades
  // ──────────────────────────────────────────────────────────

  addAtividade(equipId, servicoId, payload) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return null;
    const srv = this._encontrarServico(eq, servicoId);
    if (!srv) return null;

    const nextId = srv.atividades.length > 0 ? Math.max(...srv.atividades.map(a => a.id)) + 1 : 1;
    const agora = new Date().toISOString();
    const nova = {
      id: nextId,
      descricao: payload.descricao || '',
      responsavel: payload.responsavel || srv.responsavel || '',
      estado: payload.estado || 'pendente',
      estado_motivo: '',
      inicio: payload.estado === 'em_andamento' ? agora : null,
      atualizacao: agora,
      concluida: payload.estado === 'concluida',
      concluida_em: payload.estado === 'concluida' ? agora : null,
      historico: [{ acao: 'criada', usuario: payload.usuario || payload.responsavel || 'Chefe de Oficina', data: agora, nota: 'Atividade adicionada' }]
    };
    srv.atividades.push(nova);
    srv.atualizado_em = agora;
    this._calcularTempos(eq);
    this.save();
    return nova;
  }

  updateAtividade(equipId, servicoId, atividadeId, payload) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return null;
    const srv = this._encontrarServico(eq, servicoId);
    if (!srv) return null;
    const atv = this._encontrarAtividade(srv, atividadeId);
    if (!atv) return null;

    const agora = new Date().toISOString();
    const estadoAnterior = atv.estado;

    if (payload.estado !== undefined) atv.estado = payload.estado;
    if (payload.estado_motivo !== undefined) atv.estado_motivo = payload.estado_motivo;
    if (payload.responsavel !== undefined) atv.responsavel = payload.responsavel;
    if (payload.descricao !== undefined) atv.descricao = payload.descricao;

    if (payload.estado === 'em_andamento' && !atv.inicio) atv.inicio = agora;
    if (payload.estado === 'concluida') { atv.concluida = true; atv.concluida_em = agora; }
    if (payload.estado === 'pendente') { atv.concluida = false; atv.concluida_em = null; }

    atv.atualizacao = agora;
    atv.historico.push({
      acao: payload.estado || 'atualizada',
      usuario: payload.usuario || 'Chefe de Oficina',
      data: agora,
      nota: payload.nota || `Atualização: ${payload.descricao ? '"' + payload.descricao + '"' : ''} ${payload.responsavel ? '[' + payload.responsavel + ']' : ''} ${payload.estado ? '(' + estadoAnterior + ' → ' + payload.estado + ')' : ''}`
    });

    srv.atualizado_em = agora;
    this._calcularTempos(eq);
    this.save();
    return atv;
  }

  deleteAtividade(equipId, servicoId, atividadeId) {
    const eq = this._encontrarEquipamento(equipId);
    if (!eq) return false;
    const srv = this._encontrarServico(eq, servicoId);
    if (!srv) return false;
    const idx = srv.atividades.findIndex(a => a.id === parseInt(atividadeId));
    if (idx !== -1) {
      srv.atividades.splice(idx, 1);
      srv.atualizado_em = new Date().toISOString();
      this._calcularTempos(eq);
      this.save();
      return true;
    }
    return false;
  }

  // ──────────────────────────────────────────────────────────
  // Chat & Backlog Operacional (Mural de Evidências)
  // ──────────────────────────────────────────────────────────

  addMensagemChat(id, payload = {}) {
    const eq = this._encontrarEquipamento(id);
    if (!eq) return null;
    if (!eq.chat) eq.chat = Array.isArray(eq.dossie) ? [...eq.dossie] : [];

    const agora = new Date().toISOString();
    const nextId = eq.chat.length > 0 ? Math.max(...eq.chat.map(m => m.id || 0)) + 1 : 1;

    let servicoTitulo = '';
    if (payload.servico_id) {
      const srv = eq.servicos.find(s => s.id === parseInt(payload.servico_id));
      if (srv) servicoTitulo = srv.titulo;
    }

    const item = {
      id: nextId,
      autor: payload.autor || 'Chefe de Oficina',
      data: agora,
      texto: payload.texto || '',
      servico_id: payload.servico_id ? parseInt(payload.servico_id) : null,
      servico_titulo: servicoTitulo || payload.servico_titulo || '',
      midia_url: payload.midia_url || payload.foto || '',
      midia_tipo: payload.midia_tipo || (payload.foto ? 'foto' : null), // 'foto' | 'video' | null
      midia_nome: payload.midia_nome || ''
    };

    // Retrocompatibilidade com dossie legados
    item.foto = item.midia_tipo === 'foto' ? item.midia_url : '';

    eq.chat.push(item);
    eq.dossie = eq.chat;

    if (item.midia_url && item.midia_tipo === 'foto') {
      if (!eq.fotos) eq.fotos = [];
      if (!eq.fotos.includes(item.midia_url)) eq.fotos.push(item.midia_url);
    }

    this.save();
    return item;
  }

  deleteMensagemChat(id, msgId) {
    const eq = this._encontrarEquipamento(id);
    if (!eq) return false;
    if (!eq.chat) eq.chat = Array.isArray(eq.dossie) ? [...eq.dossie] : [];
    const idx = eq.chat.findIndex(m => m.id === parseInt(msgId));
    if (idx !== -1) {
      eq.chat.splice(idx, 1);
      eq.dossie = eq.chat;
      this.save();
      return true;
    }
    return false;
  }

  addNotaDossie(id, texto, fotoUrl = '', autor = 'Chefe de Oficina') {
    return this.addMensagemChat(id, {
      texto,
      autor,
      midia_url: fotoUrl,
      midia_tipo: fotoUrl ? 'foto' : null
    });
  }

  // ──────────────────────────────────────────────────────────
  // Dashboard / Modo TV
  // ──────────────────────────────────────────────────────────

  getDashboardData() {
    this.data.equipamentos.forEach(e => this._calcularTempos(e));
    const noPatio = this.data.equipamentos.filter(e => e.estado !== 'entregue');

    const totais = {
      total_patio: noPatio.length,
      em_andamento: noPatio.filter(e => GRUPO_ESTADO.em_andamento.includes(e.estado)).length,
      aguardando: noPatio.filter(e => GRUPO_ESTADO.aguardando.includes(e.estado)).length,
      prontos: noPatio.filter(e => e.estado === 'pronto').length,
      atrasados: noPatio.filter(e => e.atrasado).length,
      entregues: this.data.equipamentos.filter(e => e.estado === 'entregue').length
    };

    // Ordenação: atrasados → urgentes → andamento → aguardando → pronto → recebido
    const PESO = {
      em_execucao: 100, em_desmontagem: 95, em_montagem: 95, em_reparo: 90,
      em_fabricacao: 88, em_soldagem: 87, em_teste: 85, em_diagnostico: 82, em_inspecao: 80,
      aguardando_peca: 70, aguardando_material: 69, aguardando_cliente: 65,
      aguardando_diagnostico: 62, aguardando_aprovacao: 60, aguardando_execucao: 55,
      recebido: 40, pronto: 10, entregue: 0
    };

    const ordenados = [...noPatio].sort((a, b) => {
      if (a.atrasado && !b.atrasado) return -1;
      if (!a.atrasado && b.atrasado) return 1;
      if (a.prioridade === 'Urgente' && b.prioridade !== 'Urgente') return -1;
      if (a.prioridade !== 'Urgente' && b.prioridade === 'Urgente') return 1;
      const pA = PESO[a.estado] || 50;
      const pB = PESO[b.estado] || 50;
      if (pA !== pB) return pB - pA;
      return new Date(a.data_entrada) - new Date(b.data_entrada);
    });

    const entreguesOrdenados = this.data.equipamentos
      .filter(e => e.estado === 'entregue')
      .sort((a, b) => new Date(b.data_entrega || b.data_entrada) - new Date(a.data_entrega || a.data_entrada));

    return {
      totais,
      equipamentos: ordenados,
      entregues: entreguesOrdenados,
      timestamp: new Date().toISOString()
    };
  }

  getListaTecnicos() {
    const tecnicosSet = new Set(['Manuel', 'Raimundo', 'Rodrigo', 'João Silva', 'Geraldo Alcântara']);
    if (this.data && Array.isArray(this.data.equipamentos)) {
      this.data.equipamentos.forEach(eq => {
        if (eq.responsavel_tecnico) tecnicosSet.add(eq.responsavel_tecnico.trim());
        (eq.servicos || []).forEach(s => {
          if (s.responsavel) tecnicosSet.add(s.responsavel.trim());
          (s.atividades || []).forEach(a => {
            if (a.responsavel) tecnicosSet.add(a.responsavel.trim());
          });
        });
        (eq.chat || eq.dossie || []).forEach(m => {
          if (m.autor && !m.autor.includes('Sistema')) tecnicosSet.add(m.autor.trim());
        });
      });
    }
    return Array.from(tecnicosSet).filter(Boolean).sort();
  }

  getLabelEstado(estado) { return LABEL_ESTADO[estado] || estado; }
  getEstadosValidos() { return ESTADOS_VALIDOS; }
  getLabelEstados() { return LABEL_ESTADO; }

  // ──────────────────────────────────────────────────────────
  // Compras Diretas
  // ──────────────────────────────────────────────────────────

  _ensureComprasDiretas() {
    if (!Array.isArray(this.data.compras_diretas)) {
      this.data.compras_diretas = [];
    }
  }

  getComprasDiretas(filtro = null) {
    this._ensureComprasDiretas();
    let lista = this.data.compras_diretas;
    if (filtro === 'pendente') lista = lista.filter(c => c.status === 'pendente');
    else if (filtro === 'autorizado') lista = lista.filter(c => c.status === 'autorizado');
    else if (filtro === 'declinado') lista = lista.filter(c => c.status === 'declinado');
    return lista.slice().reverse(); // mais recentes primeiro
  }

  getComprasDiretasPendentesCount() {
    this._ensureComprasDiretas();
    return this.data.compras_diretas.filter(c => c.status === 'pendente').length;
  }

  createCompraDireta(payload) {
    this._ensureComprasDiretas();
    const nextId = this.data.compras_diretas.length > 0
      ? Math.max(...this.data.compras_diretas.map(c => c.id)) + 1 : 1;
    const agora = new Date().toISOString();

    // Resolver tags dos equipamentos informados
    const eqIds = Array.isArray(payload.equipamentos_ids) ? payload.equipamentos_ids.map(Number) : [];
    const equipamentosTags = eqIds.map(id => {
      const eq = this._encontrarEquipamento(id);
      return eq ? eq.tag : `#${id}`;
    }).filter(Boolean);

    const nova = {
      id: nextId,
      numero: `CD-${String(nextId).padStart(3, '0')}`,
      solicitante: payload.solicitante || 'Técnico',
      descricao: payload.descricao || '',
      valor_estimado: parseFloat(payload.valor_estimado) || 0,
      valor_final: null,
      foto_url: payload.foto_url || '',
      equipamentos_ids: eqIds,
      equipamentos_tags: equipamentosTags,
      rateio: payload.rateio || 'igual',
      status: 'pendente',
      solicitado_em: agora,
      autorizado_em: null,
      autorizado_por: null,
      motivo_declinio: null,
      obs_aprovador: ''
    };

    this.data.compras_diretas.push(nova);
    this.save();
    return nova;
  }

  autorizarCompraDireta(id, payload) {
    this._ensureComprasDiretas();
    const compra = this.data.compras_diretas.find(c => c.id === parseInt(id));
    if (!compra) return null;
    if (compra.status !== 'pendente') return null;

    const agora = new Date().toISOString();
    const valorFinal = parseFloat(payload.valor_final) || compra.valor_estimado;

    compra.status = 'autorizado';
    compra.autorizado_em = agora;
    compra.autorizado_por = payload.autorizado_por || 'Chefe';
    compra.obs_aprovador = payload.obs_aprovador || '';
    compra.valor_final = valorFinal;

    // Atribuir custo aos equipamentos via rateio
    const eqIds = compra.equipamentos_ids;
    const numEqs = eqIds.length || 1;
    const valorPorEq = parseFloat((valorFinal / numEqs).toFixed(2));

    eqIds.forEach((eqId, idx) => {
      const eq = this._encontrarEquipamento(eqId);
      if (!eq) return;
      if (!Array.isArray(eq.custos_diretos)) eq.custos_diretos = [];

      // Ajuste de centavos no último item para não perder arredondamento
      const valor = idx === eqIds.length - 1
        ? parseFloat((valorFinal - valorPorEq * (numEqs - 1)).toFixed(2))
        : valorPorEq;

      eq.custos_diretos.push({
        compra_id: compra.id,
        numero_compra: compra.numero,
        descricao: compra.descricao,
        valor_atribuido: valor,
        solicitante: compra.solicitante,
        autorizado_por: compra.autorizado_por,
        data: agora,
        foto_url: compra.foto_url
      });
    });

    this.save();
    return compra;
  }

  declinarCompraDireta(id, payload) {
    this._ensureComprasDiretas();
    const compra = this.data.compras_diretas.find(c => c.id === parseInt(id));
    if (!compra) return null;
    if (compra.status !== 'pendente') return null;

    compra.status = 'declinado';
    compra.autorizado_por = payload.autorizado_por || 'Chefe';
    compra.motivo_declinio = payload.motivo_declinio || '';
    compra.autorizado_em = new Date().toISOString();

    this.save();
    return compra;
  }

  deleteCompraDireta(id) {
    this._ensureComprasDiretas();
    const idx = this.data.compras_diretas.findIndex(c => c.id === parseInt(id));
    if (idx === -1) return false;
    // Se já autorizado, remover custos dos equipamentos vinculados
    const compra = this.data.compras_diretas[idx];
    if (compra.status === 'autorizado') {
      (compra.equipamentos_ids || []).forEach(eqId => {
        const eq = this._encontrarEquipamento(eqId);
        if (eq && Array.isArray(eq.custos_diretos)) {
          eq.custos_diretos = eq.custos_diretos.filter(c => c.compra_id !== compra.id);
        }
      });
    }
    this.data.compras_diretas.splice(idx, 1);
    this.save();
    return true;
  }
}

module.exports = new Storage();
