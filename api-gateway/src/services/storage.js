/**
 * Storage — Central JB Cunha v3.0
 * Hierarquia: Equipamento → Serviços → Atividades → Estado+Motivo
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const config = require('../config');

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
  const h = (d) => d.toISOString();
  const diasAtras = (n) => { const d = new Date(agora); d.setDate(d.getDate() - n); return d; };
  const horasAtras = (n) => { const d = new Date(agora); d.setHours(d.getHours() - n); return d; };

  return {
    versao: '3.0',
    migrado_em: h(agora),
    compras_diretas: [],
    equipamentos: [
      {
        id: 1,
        numero: 'ATD-001',
        tag: 'CAT-320',
        empresa: 'Empresa ABC Mineração',
        responsavel_cliente: 'Fábio Mendes',
        responsavel_tecnico: 'João Silva',
        equipamento: 'Escavadeira Hidráulica CAT 320D',
        placa: 'CAT-320',
        horimetro: '7.890 h',
        km: '',
        localizacao: 'Baia 03',
        estado: 'em_execucao',
        estado_motivo: '',
        prioridade: 'Alta',
        queixa_inicial: 'Máquina parou no talude com vazamento severo de óleo no comando hidráulico.',
        data_entrada: h(diasAtras(2)),
        previsao_entrega: h(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 2)),
        data_conclusao: null,
        data_entrega: null,
        num_orcamento: '2026-0187',
        num_os: '2026-0098',
        num_nf: '',
        servicos: [
          {
            id: 1,
            titulo: 'Reparo hidráulico — Comando de lança',
            descricao: 'Vazamento identificado no bloco de comando. Necessário desmontagem completa.',
            responsavel: 'João Silva',
            estado: 'em_execucao',
            estado_motivo: '',
            criado_em: h(diasAtras(2)),
            atualizado_em: h(horasAtras(3)),
            atividades: [
              { id: 1, descricao: 'Desmontar mangueiras e coletor de retorno', responsavel: 'João Silva', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(2)), atualizacao: h(diasAtras(1)), concluida: true, concluida_em: h(diasAtras(1)), historico: [{ acao: 'concluida', usuario: 'João Silva', data: h(diasAtras(1)), nota: 'Desmontagem concluída sem avarias' }] },
              { id: 2, descricao: 'Retirar bloco de comando para bancada', responsavel: 'João Silva', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(1)), atualizacao: h(horasAtras(12)), concluida: true, concluida_em: h(horasAtras(12)), historico: [{ acao: 'concluida', usuario: 'João Silva', data: h(horasAtras(12)), nota: 'Instalado na bancada' }] },
              { id: 3, descricao: 'Substituição das vedações e retífica dos carretéis', responsavel: 'João Silva', estado: 'em_andamento', estado_motivo: '', inicio: h(horasAtras(3)), atualizacao: h(horasAtras(1)), concluida: false, concluida_em: null, historico: [{ acao: 'iniciada', usuario: 'João Silva', data: h(horasAtras(3)), nota: 'Iniciada montagem do kit de vedação' }] },
              { id: 4, descricao: 'Teste hidrostático de pressão a 250 bar', responsavel: 'João Silva', estado: 'pendente', estado_motivo: '', inicio: null, atualizacao: null, concluida: false, concluida_em: null, historico: [] },
              { id: 5, descricao: 'Liberação final e teste de ciclagem da lança', responsavel: 'João Silva', estado: 'pendente', estado_motivo: '', inicio: null, atualizacao: null, concluida: false, concluida_em: null, historico: [] }
            ]
          }
        ],
        dossie: [
          { id: 1, autor: 'Carlos (Chefe de Oficina)', data: h(diasAtras(2)), texto: 'Equipamento posicionado na Baia 03 para inspeção.', foto: '' },
          { id: 2, autor: 'João Silva', data: h(horasAtras(12)), texto: 'Comando hidráulico removido para bancada de teste.', foto: '' },
          { id: 3, autor: 'João Silva', data: h(horasAtras(1)), texto: 'Kit de vedação em montagem. Previsto conclusão hoje à tarde.', foto: '' }
        ],
        fotos: []
      },
      {
        id: 2,
        numero: 'ATD-002',
        tag: 'CIL-TEL-03',
        empresa: 'XYZ Siderúrgica',
        responsavel_cliente: 'Roberto Alcântara',
        responsavel_tecnico: 'Geraldo Alcântara',
        equipamento: 'Haste do Cilindro Basculante Telescópico',
        placa: '',
        horimetro: '',
        km: '',
        localizacao: 'Setor de Usinagem',
        estado: 'em_fabricacao',
        estado_motivo: '',
        prioridade: 'Normal',
        queixa_inicial: 'Haste com riscos longitudinais e perda de cromo duro.',
        data_entrada: h(diasAtras(3)),
        previsao_entrega: h(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)),
        data_conclusao: null,
        data_entrega: null,
        num_orcamento: '2026-0170',
        num_os: '2026-0091',
        num_nf: '',
        servicos: [
          {
            id: 1,
            titulo: 'Retífica, brunimento e metalização da haste',
            descricao: '3ª seção da haste hidráulica. Polimento espelhado e proteção superficial.',
            responsavel: 'Geraldo Alcântara',
            estado: 'em_fabricacao',
            estado_motivo: '',
            criado_em: h(diasAtras(3)),
            atualizado_em: h(horasAtras(2)),
            atividades: [
              { id: 1, descricao: 'Alinhamento no torno horizontal pesado', responsavel: 'Geraldo Alcântara', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(3)), atualizacao: h(diasAtras(2)), concluida: true, concluida_em: h(diasAtras(2)), historico: [{ acao: 'concluida', usuario: 'Geraldo Alcântara', data: h(diasAtras(2)), nota: 'Centragem conferida com relógio comparador' }] },
              { id: 2, descricao: 'Passe de desbaste e retífica cilíndrica', responsavel: 'Geraldo Alcântara', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(2)), atualizacao: h(diasAtras(1)), concluida: true, concluida_em: h(diasAtras(1)), historico: [{ acao: 'concluida', usuario: 'Geraldo Alcântara', data: h(diasAtras(1)), nota: 'Desbaste com tolerância de 0.02mm' }] },
              { id: 3, descricao: 'Polimento espelhado e banho de proteção', responsavel: 'Geraldo Alcântara', estado: 'em_andamento', estado_motivo: '', inicio: h(horasAtras(4)), atualizacao: h(horasAtras(2)), concluida: false, concluida_em: null, historico: [{ acao: 'iniciada', usuario: 'Geraldo Alcântara', data: h(horasAtras(4)), nota: 'Iniciado polimento com pasta diamantada' }] }
            ]
          }
        ],
        dossie: [
          { id: 1, autor: 'Carlos (Chefe de Oficina)', data: h(diasAtras(3)), texto: 'Componente recebido. Alocado no setor de usinagem.', foto: '' },
          { id: 2, autor: 'Geraldo Alcântara', data: h(horasAtras(2)), texto: 'Retífica finalizada. Polimento em andamento.', foto: '' }
        ],
        fotos: []
      },
      {
        id: 3,
        numero: 'ATD-003',
        tag: 'VOL-FMX-89',
        empresa: 'GHI Construções Pesadas',
        responsavel_cliente: 'Marcos Pinheiro',
        responsavel_tecnico: 'Carlos Eduardo',
        equipamento: 'Caminhão Basculante Volvo FMX 500 8x4',
        placa: 'JBC-4890',
        horimetro: '4.120 h',
        km: '184.200 km',
        localizacao: 'Setor de Solda',
        estado: 'aguardando_material',
        estado_motivo: 'Aguardando entrega das chapas Hardox 450 pelo fornecedor metalúrgico. Previsão: amanhã.',
        prioridade: 'Urgente',
        queixa_inicial: 'Trinca próxima ao mancal de basculamento da caçamba. Risco de ruptura.',
        data_entrada: h(diasAtras(6)),
        previsao_entrega: h(diasAtras(2)),
        data_conclusao: null,
        data_entrega: null,
        num_orcamento: '2026-0192',
        num_os: '2026-0105',
        num_nf: '',
        servicos: [
          {
            id: 1,
            titulo: 'Reforço estrutural — viga da caçamba',
            descricao: 'Soldagem de trincas na viga principal com chapa Hardox 450.',
            responsavel: 'Carlos Eduardo',
            estado: 'aguardando_material',
            estado_motivo: 'Aguardando chapas Hardox 450 cortadas',
            criado_em: h(diasAtras(6)),
            atualizado_em: h(diasAtras(2)),
            atividades: [
              { id: 1, descricao: 'Goivagem das trincas e biselamento', responsavel: 'Carlos Eduardo', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(5)), atualizacao: h(diasAtras(5)), concluida: true, concluida_em: h(diasAtras(5)), historico: [{ acao: 'concluida', usuario: 'Carlos Eduardo', data: h(diasAtras(5)), nota: 'Trinca exposta e limpa' }] },
              { id: 2, descricao: 'Receber chapas Hardox 450 cortadas a laser', responsavel: 'Carlos Eduardo', estado: 'bloqueada', estado_motivo: 'Fornecedor atrasou o corte a laser', inicio: h(diasAtras(2)), atualizacao: h(diasAtras(2)), concluida: false, concluida_em: null, historico: [{ acao: 'bloqueada', usuario: 'Carlos Eduardo', data: h(diasAtras(2)), nota: 'Fornecedor atrasou corte. Ligado cobrando prazo.' }] },
              { id: 3, descricao: 'Soldagem MIG com arame tubular E71T-1', responsavel: 'Carlos Eduardo', estado: 'pendente', estado_motivo: '', inicio: null, atualizacao: null, concluida: false, concluida_em: null, historico: [] },
              { id: 4, descricao: 'Teste de estanqueidade e pintura de proteção', responsavel: 'Carlos Eduardo', estado: 'pendente', estado_motivo: '', inicio: null, atualizacao: null, concluida: false, concluida_em: null, historico: [] }
            ]
          }
        ],
        dossie: [
          { id: 1, autor: 'Carlos (Chefe de Oficina)', data: h(diasAtras(6)), texto: 'Caminhão posicionado no setor de solda. Prioridade urgente confirmada.', foto: '' },
          { id: 2, autor: 'Carlos Eduardo', data: h(diasAtras(2)), texto: 'ATRASO: Chapas Hardox ainda não entregues. Entrei em contato com fornecedor.', foto: '' }
        ],
        fotos: []
      },
      {
        id: 4,
        numero: 'ATD-004',
        tag: 'LIE-L580',
        empresa: 'DEF Agroflorestal',
        responsavel_cliente: 'Paulo Souza',
        responsavel_tecnico: 'Marcos Vinicius',
        equipamento: 'Pá Carregadeira Liebherr L580',
        placa: 'AGR-5800',
        horimetro: '3.410 h',
        km: '',
        localizacao: 'Pátio Externo',
        estado: 'pronto',
        estado_motivo: '',
        prioridade: 'Normal',
        queixa_inicial: 'Revisão periódica de 3.000 horas, troca de filtros e óleos térmicos.',
        data_entrada: h(diasAtras(8)),
        previsao_entrega: h(diasAtras(1)),
        data_conclusao: h(diasAtras(1)),
        data_entrega: null,
        num_orcamento: '2026-0140',
        num_os: '2026-0072',
        num_nf: 'NF-89211',
        servicos: [
          {
            id: 1,
            titulo: 'Revisão periódica de 3.000 h',
            descricao: 'Revisão preventiva padrão de contrato anual.',
            responsavel: 'Marcos Vinicius',
            estado: 'concluida',
            estado_motivo: '',
            criado_em: h(diasAtras(8)),
            atualizado_em: h(diasAtras(1)),
            atividades: [
              { id: 1, descricao: 'Troca de óleo motor, transmissão e eixos', responsavel: 'Marcos Vinicius', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(6)), atualizacao: h(diasAtras(4)), concluida: true, concluida_em: h(diasAtras(4)), historico: [] },
              { id: 2, descricao: 'Substituição de filtros de combustível e ar', responsavel: 'Marcos Vinicius', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(4)), atualizacao: h(diasAtras(2)), concluida: true, concluida_em: h(diasAtras(2)), historico: [] },
              { id: 3, descricao: 'Teste de pressão hidráulica e frenagem', responsavel: 'Marcos Vinicius', estado: 'concluida', estado_motivo: '', inicio: h(diasAtras(2)), atualizacao: h(diasAtras(1)), concluida: true, concluida_em: h(diasAtras(1)), historico: [] }
            ]
          }
        ],
        dossie: [
          { id: 1, autor: 'Carlos (Chefe de Oficina)', data: h(diasAtras(8)), texto: 'Máquina recebida para revisão periódica.', foto: '' },
          { id: 2, autor: 'Marcos Vinicius', data: h(diasAtras(1)), texto: 'Revisão finalizada com sucesso. Aguardando retirada do cliente.', foto: '' }
        ],
        fotos: []
      },
      {
        id: 5,
        numero: 'ATD-005',
        tag: 'KOM-PC210',
        empresa: 'Infratech Construções',
        responsavel_cliente: 'Henrique Castro',
        responsavel_tecnico: '',
        equipamento: 'Escavadeira Komatsu PC210',
        placa: 'INF-2100',
        horimetro: '5.340 h',
        km: '',
        localizacao: 'Baia 01',
        estado: 'em_diagnostico',
        estado_motivo: '',
        prioridade: 'Alta',
        queixa_inicial: 'Motor falhando em aceleração e perda de potência ao girar a lança.',
        data_entrada: h(horasAtras(5)),
        previsao_entrega: null,
        data_conclusao: null,
        data_entrega: null,
        num_orcamento: '',
        num_os: '',
        num_nf: '',
        servicos: [
          {
            id: 1,
            titulo: 'Diagnóstico de falha no motor e sistema de giro',
            descricao: 'Falha não identificada. Motor falhando sob carga.',
            responsavel: 'Carlos (Chefe de Oficina)',
            estado: 'em_diagnostico',
            estado_motivo: '',
            criado_em: h(horasAtras(5)),
            atualizado_em: h(horasAtras(2)),
            atividades: [
              { id: 1, descricao: 'Leitura de códigos de falha via scan tool', responsavel: 'Carlos (Chefe de Oficina)', estado: 'concluida', estado_motivo: '', inicio: h(horasAtras(4)), atualizacao: h(horasAtras(3)), concluida: true, concluida_em: h(horasAtras(3)), historico: [{ acao: 'concluida', usuario: 'Carlos', data: h(horasAtras(3)), nota: 'Código E0238 identificado — sensor de posição da bomba' }] },
              { id: 2, descricao: 'Verificar sensor de posição da bomba hidráulica', responsavel: 'Carlos (Chefe de Oficina)', estado: 'em_andamento', estado_motivo: '', inicio: h(horasAtras(2)), atualizacao: h(horasAtras(1)), concluida: false, concluida_em: null, historico: [] },
              { id: 3, descricao: 'Verificar mangueiras e pressão do circuito de giro', responsavel: '', estado: 'pendente', estado_motivo: '', inicio: null, atualizacao: null, concluida: false, concluida_em: null, historico: [] }
            ]
          }
        ],
        dossie: [
          { id: 1, autor: 'Carlos (Chefe de Oficina)', data: h(horasAtras(5)), texto: 'Máquina recebida. Iniciando diagnóstico elétrico e hidráulico.', foto: '' },
          { id: 2, autor: 'Carlos (Chefe de Oficina)', data: h(horasAtras(3)), texto: 'Scan tool indicou código E0238. Investigando sensor da bomba.', foto: '' }
        ],
        fotos: []
      }
    ]
  };
}

// ────────────────────────────────────────────────────────────
// Classe Storage
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

    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        this.data = JSON.parse(raw);
        if (this.data.versao !== '3.0' || !this.data.equipamentos) {
          console.log('[Storage] Banco em formato antigo. Gerando seed v3.0...');
          this.data = gerarSeedData();
          this.save();
        } else {
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

    // Progresso geral baseado em atividades
    let totalAtiv = 0, concluidasAtiv = 0;
    (eq.servicos || []).forEach(s => {
      const atvs = s.atividades || [];
      totalAtiv += atvs.length;
      concluidasAtiv += atvs.filter(a => a.estado === 'concluida').length;
    });
    eq.progresso = totalAtiv > 0 ? Math.round((concluidasAtiv / totalAtiv) * 100) : (eq.estado === 'pronto' || eq.estado === 'entregue' ? 100 : 0);
    eq.total_atividades = totalAtiv;
    eq.atividades_concluidas = concluidasAtiv;

    // Múltiplos serviços em paralelo: gerar lista enriquecida e métricas
    const servicosLista = (eq.servicos || []).map(s => {
      const atvs = s.atividades || [];
      const tAtv = atvs.length;
      const cAtv = atvs.filter(a => a.estado === 'concluida').length;
      const atvAtiva = atvs.find(a => a.estado === 'em_andamento');
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
        progresso: tAtv > 0 ? Math.round((cAtv / tAtv) * 100) : (['concluida','concluido'].includes(s.estado) ? 100 : 0)
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
      'queixa_inicial', 'estado', 'estado_motivo'
    ];
    campos.forEach(c => {
      if (payload[c] !== undefined && payload[c] !== null) {
        eq[c] = payload[c];
      }
    });
    if (payload.placa !== undefined) eq.placa = (payload.placa || '').toUpperCase();
    if (payload.tag !== undefined) eq.tag = (payload.tag || '').trim();

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

    ['titulo','descricao','responsavel','estado','estado_motivo'].forEach(c => {
      if (payload[c] !== undefined) srv[c] = payload[c];
    });
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
