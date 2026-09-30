/**
 * Migração de Dados — Central JB Cunha v2 → v3.0
 * Converte o modelo antigo (atendimentos com tarefas) para
 * o novo modelo (equipamentos com serviços e atividades).
 * Salva backup automático antes de migrar.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'api-gateway', 'data', 'database.json');
const BACKUP_PATH = path.join(__dirname, '..', 'api-gateway', 'data', 'database.backup.json');

// Mapeamento de etapas antigas → novos estados
const ETAPA_PARA_ESTADO = {
  'Entrada':              'recebido',
  'Diagnóstico':          'em_diagnostico',
  'Aguardando Peça':      'aguardando_peca',
  'Aguardando peça':      'aguardando_peca',
  'Aguardando Aprovação': 'aguardando_aprovacao',
  'Em Execução':          'em_execucao',
  'Usinagem':             'em_fabricacao',
  'Soldagem':             'em_soldagem',
  'Montagem':             'em_montagem',
  'Teste':                'em_teste',
  'Pronto':               'pronto',
  'Entregue':             'entregue',
};

// Mapeamento de status de tarefa → estado de atividade
const STATUS_PARA_ESTADO_ATIV = {
  'pendente':     'pendente',
  'em_andamento': 'em_andamento',
  'concluida':    'concluida',
  'bloqueada':    'bloqueada',
};

function migrar() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('[MIGRAÇÃO] database.json não encontrado. Nada a migrar.');
    return;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const dados = JSON.parse(raw);

  // Backup
  fs.writeFileSync(BACKUP_PATH, raw, 'utf8');
  console.log(`[MIGRAÇÃO] Backup salvo em: ${BACKUP_PATH}`);

  if (dados.versao === '3.0') {
    console.log('[MIGRAÇÃO] Banco já está na versão 3.0. Nenhuma alteração necessária.');
    return;
  }

  const atendimentos = dados.atendimentos || [];
  console.log(`[MIGRAÇÃO] Processando ${atendimentos.length} registros...`);

  const novosEquipamentos = atendimentos.map(atd => {
    const estado = ETAPA_PARA_ESTADO[atd.etapa] || 'recebido';

    // Identificar motivo do estado a partir de tarefas bloqueadas
    let estado_motivo = '';
    if (Array.isArray(atd.tarefas)) {
      const bloqueada = atd.tarefas.find(t => t.status === 'bloqueada' && t.bloqueio_motivo);
      if (bloqueada) estado_motivo = bloqueada.bloqueio_motivo;
    }

    // Converter tarefas em um serviço padrão com atividades
    const atividades = Array.isArray(atd.tarefas) ? atd.tarefas.map(t => ({
      id: t.id,
      descricao: t.descricao || '',
      responsavel: t.concluida_por || atd.responsavel_tecnico || atd.responsavel || '',
      estado: STATUS_PARA_ESTADO_ATIV[t.status] || (t.concluida ? 'concluida' : 'pendente'),
      estado_motivo: t.bloqueio_motivo || '',
      inicio: t.historico && t.historico.length > 0 ? t.historico[0].data : atd.data_entrada,
      atualizacao: t.concluida_em || (t.historico && t.historico.length > 0 ? t.historico[t.historico.length - 1].data : atd.data_entrada),
      concluida: t.concluida || t.status === 'concluida',
      concluida_em: t.concluida_em || null,
      historico: t.historico || []
    })) : [];

    const servicos = atd.servico ? [{
      id: 1,
      titulo: atd.servico,
      descricao: atd.observacoes_iniciais || '',
      responsavel: atd.responsavel_tecnico || atd.responsavel || '',
      estado: estado,
      estado_motivo: estado_motivo,
      criado_em: atd.data_entrada,
      atualizado_em: atd.etapa_inicio || atd.data_entrada,
      atividades: atividades
    }] : [];

    return {
      id: atd.id,
      numero: atd.numero || `ATD-${String(atd.id).padStart(3, '0')}`,
      tag: atd.tag || `EQ-${String(atd.id).padStart(4, '0')}`,
      empresa: atd.empresa || '',
      responsavel_cliente: atd.responsavel_cliente || atd.responsavel || '',
      responsavel_tecnico: atd.responsavel_tecnico || atd.responsavel || '',
      equipamento: atd.equipamento || '',
      placa: atd.placa || '',
      horimetro: atd.horimetro || '',
      km: atd.km || '',
      localizacao: atd.localizacao || 'Baia 01',
      estado: estado,
      estado_motivo: estado_motivo,
      prioridade: atd.prioridade || 'Normal',
      queixa_inicial: atd.observacoes_iniciais || atd.servico || '',
      data_entrada: atd.data_entrada || new Date().toISOString(),
      previsao_entrega: atd.previsao_entrega || null,
      data_conclusao: atd.data_conclusao || null,
      data_entrega: atd.data_entrega || null,
      // Campos opcionais de OS/NF
      num_orcamento: atd.num_orcamento || '',
      num_os: atd.num_os || '',
      num_nf: atd.num_nf || '',
      servicos: servicos,
      dossie: atd.dossie || [],
      fotos: atd.fotos || []
    };
  });

  const novoBanco = {
    versao: '3.0',
    migrado_em: new Date().toISOString(),
    equipamentos: novosEquipamentos
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(novoBanco, null, 2), 'utf8');
  console.log(`[MIGRAÇÃO] Concluída! ${novosEquipamentos.length} equipamentos migrados para v3.0.`);
}

migrar();
