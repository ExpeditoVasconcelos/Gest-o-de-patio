/**
 * Central de Operações JB Cunha — v3.0
 * Hierarquia: Equipamento → Serviços → Atividades → Estado + Motivo
 */

'use strict';

// ── Interceptor Global de Autenticação ──────────────────────────────
const _origFetch = window.fetch;
window.fetch = async function(resource, init = {}) {
  const url = typeof resource === 'string' ? resource : resource?.url || '';
  if (url.includes('/api/jbc/v1') && !url.includes('/auth/login')) {
    const token = localStorage.getItem('jbc_auth_token');
    if (token) {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', 'Bearer ' + token);
        }
      } else if (Array.isArray(init.headers)) {
        if (!init.headers.some(([k]) => k.toLowerCase() === 'authorization')) {
          init.headers.push(['Authorization', 'Bearer ' + token]);
        }
      } else {
        if (!init.headers['Authorization'] && !init.headers['authorization']) {
          init.headers['Authorization'] = 'Bearer ' + token;
        }
      }
    }
  }
  const response = await _origFetch(resource, init);
  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/me')) {
    if (typeof App !== 'undefined' && App.exibirTelaLogin) {
      App.exibirTelaLogin('Sessão expirada. Faça login novamente.');
    }
  }
  return response;
};

const API = '/api/jbc/v1/atendimentos';

// ── Mapeamento de estados ─────────────────────────────────────────────
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
  aguardando_peca:        'Ag. peça',
  aguardando_material:    'Ag. material',
  aguardando_cliente:     'Ag. cliente',
  aguardando_diagnostico: 'Ag. diagnóstico',
  aguardando_aprovacao:   'Ag. aprovação',
  aguardando_execucao:    'Ag. execução',
  concluida:              'Concluído',
  concluido:              'Concluído',
  pronto:                 'Pronto',
  entregue:               'Entregue',
};

const LABEL_ESTADO_FULL = {
  recebido:               'Recebido na oficina',
  em_inspecao:            'Em inspeção inicial',
  em_diagnostico:         'Em diagnóstico / Sob análise',
  em_execucao:            'Em execução',
  em_desmontagem:         'Em desmontagem',
  em_montagem:            'Em montagem',
  em_reparo:              'Em reparo',
  em_fabricacao:          'Em fabricação',
  em_soldagem:            'Em soldagem',
  em_teste:               'Em teste',
  aguardando_peca:        'Aguardando peça',
  aguardando_material:    'Aguardando material',
  aguardando_cliente:     'Aguardando informação do cliente',
  aguardando_diagnostico: 'Aguardando diagnóstico',
  aguardando_aprovacao:   'Aguardando aprovação',
  aguardando_execucao:    'Aguardando execução',
  concluida:              'Concluído',
  concluido:              'Concluído',
  pronto:                 'Pronto para entrega',
  entregue:               'Entregue',
};

const GRUPOS_ESTADO = {
  em_andamento: ['em_execucao','em_desmontagem','em_montagem','em_reparo','em_fabricacao','em_soldagem','em_teste','em_inspecao','em_diagnostico'],
  aguardando:   ['aguardando_peca','aguardando_material','aguardando_cliente','aguardando_diagnostico','aguardando_aprovacao','aguardando_execucao'],
};

const ESTADOS_GRUPOS_UI = [
  { label: 'Em andamento', estados: [
    'em_execucao','em_diagnostico','em_desmontagem','em_montagem','em_reparo','em_fabricacao','em_soldagem','em_teste','em_inspecao'
  ]},
  { label: 'Aguardando', estados: [
    'aguardando_peca','aguardando_material','aguardando_cliente','aguardando_diagnostico','aguardando_aprovacao','aguardando_execucao'
  ]},
  { label: 'Encerramento', estados: ['concluida','pronto','entregue','recebido'] }
];

// ── Utilidades e Ícones Profissionais SVG ──────────────────────────────
function $id(id) { return document.getElementById(id); }
function $q(sel, ctx) { return (ctx || document).querySelector(sel); }

const ICONS = {
  wrench: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  user: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  tech: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  building: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01M12 14h.01M16 14h.01M8 14h.01"/></svg>`,
  pin: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  truck: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  gear: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  route: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
  calendar: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  os: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  orc: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  nf: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`,
  alert: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  camera: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  video: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  clip: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  check: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  play: `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  circle: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
  delivery: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
};

function renderIcon(name, extraClass = '') {
  const svg = ICONS[name] || '';
  if (!extraClass) return svg;
  return svg.replace('class="ico"', `class="ico ${extraClass}"`);
}

function classeEstado(estado, atrasado) {
  if (atrasado) return 'estado-atrasado';
  if (estado === 'entregue') return 'estado-entregue';
  if (estado === 'concluida' || estado === 'concluido' || estado === 'pronto') return 'estado-pronto';
  if (GRUPOS_ESTADO.em_andamento.includes(estado)) return 'estado-andamento';
  if (GRUPOS_ESTADO.aguardando.includes(estado))   return 'estado-aguardando';
  return 'estado-recebido';
}

function tvClasseEstado(estado, atrasado) {
  if (atrasado) return 'tv-estado-atrasado';
  if (estado === 'entregue') return 'tv-estado-entregue';
  if (estado === 'concluida' || estado === 'concluido' || estado === 'pronto') return 'tv-estado-pronto';
  return 'tv-estado-' + classeEstado(estado, false).replace('estado-', '');
}

function iniciais(nome) {
  return (nome || '—').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatarDataRelativa(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.max(0, Math.floor(diff / 60000));
  if (min < 1)    return 'agora';
  if (min < 60)   return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatarDataBR(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function formatarParaDatetimeLocal(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${min}`;
  } catch (e) {
    return '';
  }
}

function escapar(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── App ───────────────────────────────────────────────────────────────
const App = {
  viewAtual: 'painel',
  abaPrincipal: 'patio',
  filtroAtual: 'Patio',
  termoBusca: '',
  temaAtual: 'dark',
  equipSelecionado: null,

  // Slides do Painel & Modo TV
  slideAtual: 0,
  slides: [],
  slideCountdownInterval: null,
  slideDuracaoSegundos: 12,
  slideTempoRestante: 12,
  slideRotacaoAtiva: true,
  slidePausadoHover: false,
  maquinasPorSlide: 2,

  // TV
  tvAtivo: false,
  tvTimerInterval: null,
  tvPollingInterval: null,
  tvAutoScrollAtivo: false, // Zero-scroll grid elimina necessidade de auto-scroll contínuo
  tvScrollTimer: null,
  tvZoomLevels: [0.65, 0.8, 0.95, 1.1, 1.25, 1.5, 1.85],
  tvZoomIndex: 2, // Padrão dinâmico calculado por detectarZoomIdealTela()
  tvViewMode: localStorage.getItem('jbc_tv_view_mode') || 'grid', // 'grid' | 'table'

  // ── Autenticação & Sessão ─────────────────────────────────────────
  token: localStorage.getItem('jbc_auth_token') || null,
  usuario: (() => {
    try { return JSON.parse(localStorage.getItem('jbc_auth_user') || 'null'); } catch(_) { return null; }
  })(),

  ehAdmin() {
    return Boolean(this.usuario && this.usuario.role === 'admin');
  },
  ehUsuario() {
    return Boolean(this.usuario && this.usuario.role === 'usuario');
  },
  ehCliente() {
    return Boolean(this.usuario && this.usuario.role === 'cliente');
  },
  ehManuel() {
    return this.ehAdmin();
  },

  exibirTelaLogin(erro = '') {
    const overlay = $id('auth-screen-overlay');
    if (overlay) overlay.style.display = 'flex';
    const errBox = $id('auth-error-msg');
    if (errBox) {
      if (erro) {
        errBox.textContent = erro;
        errBox.style.display = 'block';
      } else {
        errBox.style.display = 'none';
      }
    }
    const usrInput = $id('login-username');
    if (usrInput) setTimeout(() => usrInput.focus(), 150);
  },

  ocultarTelaLogin() {
    const overlay = $id('auth-screen-overlay');
    if (overlay) overlay.style.display = 'none';
    const errBox = $id('auth-error-msg');
    if (errBox) errBox.style.display = 'none';
  },

  toggleVerSenha(inputId, btn) {
    const inp = $id(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.style.color = 'var(--c-blue, #38bdf8)';
    } else {
      inp.type = 'password';
      btn.style.color = '';
    }
  },

  async submeterLogin(e) {
    e.preventDefault();
    const username = ($id('login-username')?.value || '').trim();
    const senha = $id('login-senha')?.value || '';
    const errBox = $id('auth-error-msg');
    const btn = $id('btn-login-submit');

    if (!username || !senha) {
      if (errBox) {
        errBox.textContent = 'Informe usuário e senha de acesso.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Verificando...</span>';
    }

    try {
      const res = await fetch('/api/jbc/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha })
      });
      const data = await res.json();

      if (data.success && data.token && data.usuario) {
        this.token = data.token;
        this.usuario = data.usuario;
        localStorage.setItem('jbc_auth_token', data.token);
        localStorage.setItem('jbc_auth_user', JSON.stringify(data.usuario));

        this.ocultarTelaLogin();
        this.atualizarInterfaceUsuario();
        this.toast(`Bem-vindo, ${data.usuario.nome}!`, 'success');

        await this.carregarPainel();
        if (this.ehAdmin()) {
          this.atualizarBadgeComprasPolling();
        }
      } else {
        if (errBox) {
          errBox.textContent = data.message || 'Credenciais inválidas.';
          errBox.style.display = 'block';
        }
      }
    } catch (_) {
      if (errBox) {
        errBox.textContent = 'Erro ao conectar ao servidor. Tente novamente.';
        errBox.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Entrar no Sistema</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      }
    }
  },

  async fazerLogout() {
    if (this.token) {
      try {
        await fetch('/api/jbc/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + this.token }
        });
      } catch (_) {}
    }
    this.token = null;
    this.usuario = null;
    localStorage.removeItem('jbc_auth_token');
    localStorage.removeItem('jbc_auth_user');
    document.body.classList.remove('role-admin', 'role-usuario', 'role-cliente');
    this.exibirTelaLogin();
    this.toast('Sessão encerrada com sucesso.', 'info');
  },

  atualizarInterfaceUsuario() {
    if (!this.usuario) return;

    document.body.classList.remove('role-admin', 'role-usuario', 'role-cliente');
    document.body.classList.add(`role-${this.usuario.role}`);

    const nameEl = $id('user-auth-name');
    const roleEl = $id('user-auth-role');
    if (nameEl) nameEl.textContent = this.usuario.nome || this.usuario.username;

    if (roleEl) {
      roleEl.className = `user-auth-role role-${this.usuario.role}`;
      if (this.usuario.role === 'admin') roleEl.textContent = 'Administrador';
      else if (this.usuario.role === 'usuario') roleEl.textContent = 'Operador';
      else if (this.usuario.role === 'cliente') roleEl.textContent = this.usuario.empresa_vinculada ? `Cliente (${this.usuario.empresa_vinculada})` : 'Cliente';
    }

    const tabPatio = $id('lbl-tab-patio');
    const tabStatus = $id('txt-status-aba');
    const tabCompras = $id('ws-tab-compras');
    const tabUsuarios = $id('ws-tab-usuarios');
    const btnNovo = $id('btn-novo');

    if (this.usuario.role === 'cliente') {
      if (tabPatio) tabPatio.textContent = 'Meus Veículos';
      if (tabStatus) tabStatus.textContent = `Visualizando veículos em manutenção de ${this.usuario.empresa_vinculada || 'sua empresa'}`;
      if (tabCompras) tabCompras.style.display = 'none';
      if (tabUsuarios) tabUsuarios.style.display = 'none';
      if (btnNovo) btnNovo.style.display = 'none';
    } else if (this.usuario.role === 'usuario') {
      if (tabPatio) tabPatio.textContent = 'Pátio Operacional';
      if (tabStatus) tabStatus.textContent = 'Exibindo equipamentos em atendimento no pátio da oficina';
      if (tabCompras) tabCompras.style.display = 'inline-flex';
      if (tabUsuarios) tabUsuarios.style.display = 'none';
      if (btnNovo) btnNovo.style.display = 'inline-flex';
    } else if (this.usuario.role === 'admin') {
      if (tabPatio) tabPatio.textContent = 'Pátio Operacional';
      if (tabStatus) tabStatus.textContent = 'Exibindo equipamentos em atendimento no pátio da oficina';
      if (tabCompras) tabCompras.style.display = 'inline-flex';
      if (tabUsuarios) tabUsuarios.style.display = 'inline-flex';
      if (btnNovo) btnNovo.style.display = 'inline-flex';
    }
  },

  atualizarBadgeComprasPolling() {
    const atualizar = async () => {
      if (this.ehCliente()) return;
      try {
        const r = await fetch('/api/jbc/v1/compras/pendentes/count');
        const j = await r.json();
        if (j.success) this.atualizarBadgeCompras(j.count || 0);
      } catch (_) {}
    };
    atualizar();
    if (!this._badgeComprasInterval) {
      this._badgeComprasInterval = setInterval(atualizar, 15000);
    }
  },

  // ── Init ─────────────────────────────────────────────────────────
  async init() {
    this.carregarTema();
    this.iniciarRelogio();
    this.configurarFiltros();
    this.configurarBusca();
    this.configurarFormNovo();

    // Atalhos globais para controle de slides e Modo TV
    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
      if (isInput) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        this.proximoSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.slideAnterior();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.toggleRotacaoSlides();
      } else if (this.tvAtivo) {
        if (e.key === 'Escape') {
          this.sairModoTv();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.alterarZoomTv(1);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.alterarZoomTv(-1);
        }
      }
    });

    window.addEventListener('resize', () => {
      if (this.tvAtivo && localStorage.getItem('jbc_tv_zoom_custom') !== 'true') {
        this.detectarZoomIdealTela();
        this.aplicarZoomTv();
      }
      this.ajustarResponsividadeMain();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (this.tvAtivo && localStorage.getItem('jbc_tv_zoom_custom') !== 'true') {
          this.detectarZoomIdealTela();
          this.aplicarZoomTv();
        }
        this.ajustarResponsividadeMain();
      }, 150);
    });

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#tv') { if (!this.tvAtivo) this.abrirModoTv(); }
      else if (this.tvAtivo) this.sairModoTv();
    });

    if (window.location.hash === '#tv') {
      this.abrirModoTv();
      return;
    }

    // Validação de Sessão
    if (this.token) {
      try {
        const r = await fetch('/api/jbc/v1/auth/me');
        const j = await r.json();
        if (j.success && j.usuario) {
          this.usuario = j.usuario;
          localStorage.setItem('jbc_auth_user', JSON.stringify(j.usuario));
          this.ocultarTelaLogin();
          this.atualizarInterfaceUsuario();
        } else {
          this.token = null;
          this.usuario = null;
          localStorage.removeItem('jbc_auth_token');
          localStorage.removeItem('jbc_auth_user');
          this.exibirTelaLogin();
          return;
        }
      } catch (_) {
        this.exibirTelaLogin();
        return;
      }
    } else {
      this.exibirTelaLogin();
      return;
    }

    await this.carregarPainel();

    if (this.ehAdmin()) {
      this.atualizarBadgeComprasPolling();
    }

    // Iniciar SSE no Desktop para alertas em tempo real
    this.iniciarSSEDesktop();
  },

  // ── Tema ─────────────────────────────────────────────────────────
  carregarTema() {
    this.aplicarTema(localStorage.getItem('jbc_theme') || 'dark');
  },
  toggleTema() { this.aplicarTema(this.temaAtual === 'dark' ? 'light' : 'dark'); },
  aplicarTema(tema) {
    this.temaAtual = tema;
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('jbc_theme', tema);
    const sun = $id('icon-sun'), moon = $id('icon-moon');
    if (sun && moon) {
      sun.style.display  = tema === 'dark'  ? 'block' : 'none';
      moon.style.display = tema === 'light' ? 'block' : 'none';
    }
  },

  // ── Relógio ──────────────────────────────────────────────────────
  iniciarRelogio() {
    const atualizar = () => {
      const now = new Date();
      const hMin = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
      const hSec = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      const el = $id('header-clock'); if (el) el.textContent = hMin;
      const el2 = $id('tv-clock');    if (el2) el2.textContent = hSec;
    };
    atualizar();
    setInterval(atualizar, 1000);
  },

  // ── Navegação ────────────────────────────────────────────────────
  navegar(view, equipId) {
    document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const mapa = { painel:'view-painel', novo:'view-novo', detalhe:'view-detalhe', compras:'view-compras', usuarios:'view-usuarios' };
    const el = $id(mapa[view] || 'view-painel');
    if (el) { el.style.display = 'block'; el.classList.add('active'); }
    this.viewAtual = view;
    this.ajustarResponsividadeMain();

    if (view === 'detalhe' && equipId) {
      this.carregarDetalhe(equipId);
    } else if (view === 'painel') {
      this.carregarPainel();
    } else if (view === 'compras') {
      this.carregarCompras();
    } else if (view === 'usuarios') {
      this.carregarUsuarios();
    }
  },

  // ── Abas Principais: Pátio Operacional vs Veículos Entregues ─────
  abrirAbaPatio() {
    this.abaPrincipal = 'patio';
    this.navegar('painel');

    const tabPatio = $id('ws-tab-patio');
    const tabEnt = $id('ws-tab-entregues');
    if (tabPatio) tabPatio.classList.add('active');
    if (tabEnt) tabEnt.classList.remove('active');

    const statusTxt = $id('ws-tab-status-txt');
    if (statusTxt) {
      statusTxt.innerHTML = `
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Exibindo equipamentos em atendimento no pátio da oficina</span>`;
    }

    const slideNav = $id('slides-nav-bar');
    if (slideNav) slideNav.style.display = 'flex';

    this.filtroAtual = 'Patio';
    this.slideAtual = 0;
    this.slideRotacaoAtiva = true;
    this.atualizarBotoesPlay();

    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filtro === 'Patio');
    });

    this.carregarPainel();
  },

  abrirAbaEntregues() {
    this.abaPrincipal = 'entregues';
    this.navegar('painel');

    const tabPatio = $id('ws-tab-patio');
    const tabEnt = $id('ws-tab-entregues');
    if (tabPatio) tabPatio.classList.remove('active');
    if (tabEnt) tabEnt.classList.add('active');

    const statusTxt = $id('ws-tab-status-txt');
    if (statusTxt) {
      statusTxt.innerHTML = `
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Histórico de veículos finalizados e entregues ao cliente</span>`;
    }

    // Pausar rotação automática para permitir visualização tranquila da tabela
    this.slideRotacaoAtiva = false;
    this.atualizarBotoesPlay();

    // Garantir que a visão da tabela geral esteja visível e ativa
    this.slideAtual = 0;
    const painelGeral = $id('painel-slide-geral');
    const painelDetalhes = $id('painel-slide-detalhes');
    if (painelGeral) painelGeral.style.display = 'block';
    if (painelDetalhes) painelDetalhes.style.display = 'none';

    this.filtroAtual = 'Entregues';
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filtro === 'Entregues');
    });

    this.carregarPainel();
  },

  // ── Compras Diretas ────────────────────────────────────────────────
  _filtroCompras: 'todas',

  abrirAbaCompras() {
    this.abaPrincipal = 'compras';

    // Esconder slides nav, mostrar view compras
    const slideNav = $id('slides-nav-bar');
    if (slideNav) slideNav.style.display = 'none';

    // Desativar todas as abas
    document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
    const tabCompras = $id('ws-tab-compras');
    if (tabCompras) tabCompras.classList.add('active');

    // Mostrar view de compras
    document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const viewCompras = $id('view-compras');
    if (viewCompras) { viewCompras.style.display = 'block'; viewCompras.classList.add('active'); }

    const statusTxt = $id('ws-tab-status-txt');
    if (statusTxt) {
      statusTxt.innerHTML = `
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span>Solicitações de compra direta de insumos para aplicação nos veículos</span>`;
    }

    this._filtroCompras = 'todas';
    this.carregarCompras();
  },

  // ── Aba: Gestão de Usuários (Exclusivo Administrador) ─────────────
  abrirAbaUsuarios() {
    if (!this.ehAdmin()) {
      this.toast('Acesso restrito a administradores.', 'warning');
      return;
    }
    this.abaPrincipal = 'usuarios';
    this.navegar('usuarios');

    document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
    const tabU = $id('ws-tab-usuarios');
    if (tabU) tabU.classList.add('active');

    const statusTxt = $id('txt-status-aba');
    if (statusTxt) statusTxt.textContent = 'Gerenciamento de contas de administradores, operadores e clientes';

    const slideNav = $id('slides-nav-bar');
    if (slideNav) slideNav.style.display = 'none';

    this.carregarUsuarios();
  },

  async carregarUsuarios() {
    const container = $id('usuarios-lista-container');
    if (!container) return;

    try {
      const res = await fetch('/api/jbc/v1/usuarios');
      const j = await res.json();
      if (!j.success) throw new Error(j.message);

      const lista = j.data || [];
      if (lista.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Nenhum usuário cadastrado.</p></div>`;
        return;
      }

      const roleBadge = (role) => {
        if (role === 'admin') return '<span class="user-badge-role badge-role-admin">Administrador</span>';
        if (role === 'usuario') return '<span class="user-badge-role badge-role-usuario">Operador</span>';
        if (role === 'cliente') return '<span class="user-badge-role badge-role-cliente">Cliente</span>';
        return role;
      };

      const fmtData = iso => {
        if (!iso) return 'Nunca';
        try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
        catch(_) { return iso; }
      };

      container.innerHTML = `
        <div class="usuarios-table-card">
          <table class="usuarios-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Nome Completo</th>
                <th>Login / Usuário</th>
                <th>Perfil (Role)</th>
                <th>Empresa Vinculada</th>
                <th>Último Acesso</th>
                <th style="text-align:right">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map(u => `
                <tr>
                  <td>
                    <span class="user-status-dot ${u.ativo ? '' : 'inativo'}" title="${u.ativo ? 'Conta Ativa' : 'Conta Inativa'}"></span>
                    <span style="font-size:0.75rem;color:var(--text-muted)">${u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td style="font-weight:700">${escapar(u.nome)}</td>
                  <td style="font-family:var(--font-mono);color:var(--c-blue)">${escapar(u.username)}</td>
                  <td>${roleBadge(u.role)}</td>
                  <td>${u.empresa_vinculada ? `<span style="font-weight:600;color:var(--c-green)">${escapar(u.empresa_vinculada)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
                  <td style="font-size:0.78rem;color:var(--text-muted)">${fmtData(u.ultimo_login)}</td>
                  <td style="text-align:right">
                    <div style="display:inline-flex;gap:6px">
                      <button class="btn-user-action" onclick="App.abrirModalEditarUsuario(${u.id})">Editar / Senha</button>
                      ${['manuel','expedito'].includes(u.username.toLowerCase()) ? '' : `
                        <button class="btn-user-action danger" onclick="App.excluirUsuario(${u.id}, '${escapar(u.username)}')">Excluir</button>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--c-red)">Erro ao carregar lista de usuários: ${escapar(e.message)}</p></div>`;
    }
  },

  abrirModalNovoUsuario() {
    const modal = $id('modal-overlay');
    const titulo = $id('modal-titulo');
    const body = $id('modal-body');
    if (!modal || !body) return;

    titulo.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        <span>Cadastrar Novo Usuário</span>
      </div>`;

    const empresasExistentes = Array.from(new Set((this._equipamentos || []).map(e => e.empresa).filter(Boolean)));

    body.innerHTML = `
      <form id="form-novo-usuario" onsubmit="App.submeterNovoUsuario(event)" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
        <div class="form-group">
          <label for="nu-nome">Nome Completo <span class="req">*</span></label>
          <input type="text" id="nu-nome" class="form-control" placeholder="Ex: Rodrigo Pereira" required autofocus>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label for="nu-username">Login / Usuário <span class="req">*</span></label>
            <input type="text" id="nu-username" class="form-control" placeholder="Ex: rodrigo.tec" required style="font-family:var(--font-mono)">
          </div>
          <div class="form-group">
            <label for="nu-senha">Senha Inicial <span class="req">*</span></label>
            <input type="password" id="nu-senha" class="form-control" placeholder="Mínimo 6 caracteres" required minlength="6">
          </div>
        </div>

        <div class="form-group">
          <label for="nu-role">Perfil de Acesso (Role) <span class="req">*</span></label>
          <select id="nu-role" class="form-control" onchange="App.onRoleChange(this.value)" required>
            <option value="usuario" selected>Operador (Pátio & Oficina — Cria atendimentos)</option>
            <option value="admin">Administrador (Controle Total & Compras)</option>
            <option value="cliente">Cliente (Apenas visualização dos seus veículos)</option>
          </select>
        </div>

        <div class="form-group" id="nu-empresa-group" style="display:none">
          <label for="nu-empresa">Empresa Vinculada ao Cliente <span class="req">*</span></label>
          <input type="text" id="nu-empresa" class="form-control" list="lista-empresas-sugestoes" placeholder="Ex: Empresa ABC Mineração ou Marks">
          <datalist id="lista-empresas-sugestoes">
            ${empresasExistentes.map(emp => `<option value="${escapar(emp)}"></option>`).join('')}
          </datalist>
          <span style="font-size:0.75rem;color:var(--text-muted);margin-top:3px">O cliente só terá acesso à visualização dos veículos cadastrados sob esta empresa.</span>
        </div>

        <div style="display:flex;gap:10px;margin-top:6px">
          <button type="button" class="btn btn-ghost" onclick="App.fecharModal()" style="flex:1">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-save-nu" style="flex:2">
            <span>Salvar Usuário</span>
          </button>
        </div>
      </form>`;

    modal.style.display = 'flex';
  },

  onRoleChange(role) {
    const grp = $id('nu-empresa-group');
    if (grp) grp.style.display = role === 'cliente' ? 'block' : 'none';
  },

  async submeterNovoUsuario(e) {
    e.preventDefault();
    const nome = ($id('nu-nome')?.value || '').trim();
    const username = ($id('nu-username')?.value || '').trim();
    const senha = $id('nu-senha')?.value || '';
    const role = $id('nu-role')?.value || 'usuario';
    const empresa_vinculada = ($id('nu-empresa')?.value || '').trim();

    if (role === 'cliente' && !empresa_vinculada) {
      this.toast('Informe o nome da empresa para o perfil Cliente', 'warning');
      return;
    }

    const btn = $id('btn-save-nu');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
      const res = await fetch('/api/jbc/v1/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, username, senha, role, empresa_vinculada })
      });
      const data = await res.json();
      if (data.success) {
        this.fecharModal();
        this.toast(`Usuário ${data.usuario.username} criado com sucesso!`, 'success');
        this.carregarUsuarios();
      } else {
        this.toast(data.message || 'Erro ao criar usuário', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão ao salvar usuário', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar Usuário'; }
    }
  },

  async abrirModalEditarUsuario(id) {
    const modal = $id('modal-overlay');
    const titulo = $id('modal-titulo');
    const body = $id('modal-body');
    if (!modal || !body) return;

    try {
      const res = await fetch('/api/jbc/v1/usuarios');
      const j = await res.json();
      const user = (j.data || []).find(u => u.id === Number(id));
      if (!user) { this.toast('Usuário não localizado', 'error'); return; }

      titulo.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Editar Usuário: ${escapar(user.username)}</span>
        </div>`;

      body.innerHTML = `
        <form id="form-edit-usuario" onsubmit="App.submeterEditarUsuario(${user.id}, event)" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
          <div class="form-group">
            <label for="eu-nome">Nome Completo <span class="req">*</span></label>
            <input type="text" id="eu-nome" class="form-control" value="${escapar(user.nome)}" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label for="eu-role">Perfil (Role) <span class="req">*</span></label>
              <select id="eu-role" class="form-control" onchange="App.onEditRoleChange(this.value)">
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                <option value="usuario" ${user.role === 'usuario' ? 'selected' : ''}>Operador</option>
                <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
              </select>
            </div>
            <div class="form-group">
              <label for="eu-ativo">Status da Conta</label>
              <select id="eu-ativo" class="form-control">
                <option value="true" ${user.ativo !== false ? 'selected' : ''}>Ativo</option>
                <option value="false" ${user.ativo === false ? 'selected' : ''}>Inativo (Bloqueado)</option>
              </select>
            </div>
          </div>

          <div class="form-group" id="eu-empresa-group" style="display:${user.role === 'cliente' ? 'block' : 'none'}">
            <label for="eu-empresa">Empresa Vinculada ao Cliente</label>
            <input type="text" id="eu-empresa" class="form-control" value="${escapar(user.empresa_vinculada || '')}">
          </div>

          <div class="form-group">
            <label for="eu-senha">Redefinir Senha <span style="font-weight:400;color:var(--text-muted)">(deixe em branco para manter a atual)</span></label>
            <input type="password" id="eu-senha" class="form-control" placeholder="Nova senha (opcional, mín 6 carac.)" minlength="6">
          </div>

          <div style="display:flex;gap:10px;margin-top:6px">
            <button type="button" class="btn btn-ghost" onclick="App.fecharModal()" style="flex:1">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-save-eu" style="flex:2">
              <span>Atualizar Usuário</span>
            </button>
          </div>
        </form>`;

      modal.style.display = 'flex';
    } catch (_) {
      this.toast('Erro ao abrir dados do usuário', 'error');
    }
  },

  onEditRoleChange(role) {
    const grp = $id('eu-empresa-group');
    if (grp) grp.style.display = role === 'cliente' ? 'block' : 'none';
  },

  async submeterEditarUsuario(id, e) {
    e.preventDefault();
    const nome = ($id('eu-nome')?.value || '').trim();
    const role = $id('eu-role')?.value || 'usuario';
    const ativo = $id('eu-ativo')?.value === 'true';
    const empresa_vinculada = ($id('eu-empresa')?.value || '').trim();
    const novaSenha = $id('eu-senha')?.value || '';

    const payload = { nome, role, ativo, empresa_vinculada };
    if (novaSenha && novaSenha.trim()) payload.novaSenha = novaSenha.trim();

    const btn = $id('btn-save-eu');
    if (btn) { btn.disabled = true; btn.textContent = 'Atualizando...'; }

    try {
      const res = await fetch(`/api/jbc/v1/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.fecharModal();
        this.toast('Usuário atualizado com sucesso!', 'success');
        this.carregarUsuarios();
        if (this.usuario && Number(id) === this.usuario.id) {
          this.usuario = { ...this.usuario, ...data.usuario };
          localStorage.setItem('jbc_auth_user', JSON.stringify(this.usuario));
          this.atualizarInterfaceUsuario();
        }
      } else {
        this.toast(data.message || 'Erro ao atualizar usuário', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão ao atualizar usuário', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Atualizar Usuário'; }
    }
  },

  async excluirUsuario(id, username) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/jbc/v1/usuarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.toast(data.message || 'Usuário removido com sucesso!', 'success');
        this.carregarUsuarios();
      } else {
        this.toast(data.message || 'Erro ao excluir usuário', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão ao excluir usuário', 'error');
    }
  },

  async carregarCompras() {
    const url = '/api/jbc/v1/compras' + (this._filtroCompras && this._filtroCompras !== 'todas' ? `?status=${this._filtroCompras}` : '');
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (j.success) {
        this.renderCompras(j.data, j.pendentes || 0);
        this.atualizarBadgeCompras(j.pendentes || 0);
      }
    } catch (e) {
      this.toast('Erro ao carregar compras diretas', 'error');
    }
  },

  atualizarBadgeCompras(count) {
    const badge = $id('ws-badge-compras');
    const filtBadge = $id('cd-badge-filtro-pendente');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (filtBadge) filtBadge.textContent = count;
  },

  operadorDesktop: localStorage.getItem('jbc_operador_desktop') || 'Manuel',

  iniciarOperadorDesktop() {
    this.operadorDesktop = localStorage.getItem('jbc_operador_desktop') || 'Manuel';
    const sel = $id('select-operador-desktop');
    if (sel) sel.value = this.operadorDesktop;
  },

  setOperadorDesktop(nome) {
    this.operadorDesktop = nome || 'Manuel';
    localStorage.setItem('jbc_operador_desktop', this.operadorDesktop);
    const sel = $id('select-operador-desktop');
    if (sel && sel.value !== this.operadorDesktop) sel.value = this.operadorDesktop;
    this.toast(`Operador ativo: ${this.operadorDesktop}`, 'info');
    if (this.abaPrincipal === 'compras') this.carregarCompras();
    if (this.viewAtual === 'detalhe' && this.equipSelecionado) this.renderizarDetalhe(this.equipSelecionado);
  },

  ehManuel() {
    return (this.operadorDesktop || '').trim().toLowerCase() === 'manuel';
  },

  toastPermissaoManuel() {
    this.toast('Apenas o usuário Manuel possui autorização para aprovar ou declinar compras diretas.', 'warning');
  },

  iniciarSSEDesktop() {
    if (this._sse) { try { this._sse.close(); } catch(_) {} }
    try {
      this._sse = new EventSource('/api/jbc/v1/mobile/events');
      this._sse.onmessage = e => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.tipo === 'compra_solicitada') {
            const c = payload.dados?.compra;
            const desc = c ? c.descricao : 'Nova solicitação';
            const solicitante = c ? c.solicitante : 'Técnico';
            this.toast(`Nova solicitação de compra: ${desc} (${solicitante})`, 'warning');
            if (payload.dados?.pendentes !== undefined) this.atualizarBadgeCompras(payload.dados.pendentes);
            if (this.abaPrincipal === 'compras') this.carregarCompras();
          } else if (['compra_autorizada', 'compra_declinada', 'compra_excluida'].includes(payload.tipo)) {
            if (payload.dados?.pendentes !== undefined) this.atualizarBadgeCompras(payload.dados.pendentes);
            if (this.abaPrincipal === 'compras') this.carregarCompras();
            if (this.viewAtual === 'detalhe' && this.equipSelecionado) {
              this.carregarDetalhe(this.equipSelecionado.id);
            }
          } else if (payload.tipo === 'painel_atualizado') {
            if (this.abaPrincipal === 'patio' || this.abaPrincipal === 'entregues') {
              this.carregarPainel();
            }
          }
        } catch (_) {}
      };
      this._sse.onerror = () => {
        if (this._sse) { try { this._sse.close(); } catch(_) {} }
        setTimeout(() => this.iniciarSSEDesktop(), 10000);
      };
    } catch (_) {}
  },

  filtrarCompras(status) {
    this._filtroCompras = status;
    ['todas','pendente','autorizado','declinado'].forEach(s => {
      const chip = $id(`cd-chip-${s}`);
      if (chip) chip.classList.toggle('active', s === status);
    });
    this.carregarCompras();
  },

  async abrirModalNovaCompra(preSelEquipId = null) {
    const modal = $id('modal-overlay');
    const titulo = $id('modal-titulo');
    const body = $id('modal-body');
    if (!modal || !body) return;

    let equipamentos = (this._equipamentos && this._equipamentos.length) ? this._equipamentos : [];
    if (!equipamentos.length) {
      try {
        const r = await fetch('/api/jbc/v1/atendimentos');
        const j = await r.json();
        if (j.success && Array.isArray(j.data)) {
          this._equipamentos = j.data;
          equipamentos = j.data;
        }
      } catch (_) {}
    }

    const solicitanteAtual = this.operadorDesktop || 'Manuel';

    titulo.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span>Nova Solicitação de Compra Direta</span>
      </div>`;

    body.innerHTML = `
      <form id="form-nova-compra-desk" onsubmit="App.submeterNovaCompraDesktop(event)" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
        <div class="form-group">
          <label for="cd-desk-solicitante">Solicitante <span class="req">*</span></label>
          <input type="text" id="cd-desk-solicitante" value="${escapar(solicitanteAtual)}" class="form-control" required placeholder="Nome de quem está solicitando">
        </div>

        <div class="form-group">
          <label>Veículo(s) do Pátio para Aplicação <span class="req">*</span></label>
          <div style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r-md);padding:8px 10px;background:var(--bg-elevated);display:flex;flex-direction:column;gap:6px" id="cd-desk-veiculos-list">
            ${equipamentos.length ? equipamentos.map(eq => {
              const isChecked = preSelEquipId && Number(preSelEquipId) === eq.id;
              return `
                <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:pointer">
                  <input type="checkbox" name="cd-desk-eq" value="${eq.id}" ${isChecked ? 'checked' : ''} style="accent-color:var(--accent);width:16px;height:16px">
                  <span style="font-family:var(--font-mono);font-weight:700;color:var(--c-blue)">${escapar(eq.tag)}</span>
                  <span style="color:var(--text-secondary)">— ${escapar(eq.equipamento)} (${escapar(eq.empresa || 'Oficina')})</span>
                </label>`;
            }).join('') : '<div style="font-size:0.8rem;color:var(--text-muted);padding:4px">Nenhum equipamento carregado no pátio.</div>'}
          </div>
          <span style="font-size:0.74rem;color:var(--text-muted);margin-top:2px">Selecione uma ou mais máquinas para vincular e ratear o custo.</span>
        </div>

        <div class="form-group">
          <label for="cd-desk-desc">Descrição do Item / Peça <span class="req">*</span></label>
          <textarea id="cd-desk-desc" rows="2" class="form-control" required placeholder="Ex: Kit de vedação hidráulica 50mm, filtro de óleo Mann W940, etc."></textarea>
        </div>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label for="cd-desk-valor">Valor Estimado (R$)</label>
            <input type="number" id="cd-desk-valor" min="0" step="0.01" placeholder="Ex: 285.00 (opcional)" class="form-control">
          </div>
          <div class="form-group">
            <label for="cd-desk-foto">Foto / Evidência (opcional)</label>
            <input type="file" id="cd-desk-foto" accept="image/*" class="form-control" style="font-size:0.78rem">
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:6px">
          <button type="button" class="btn btn-ghost" onclick="App.fecharModal()" style="flex:1">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-compra-desk" style="flex:2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Registrar Solicitação
          </button>
        </div>
      </form>`;

    modal.style.display = 'flex';
  },

  async submeterNovaCompraDesktop(e) {
    e.preventDefault();
    const solicitante = ($id('cd-desk-solicitante')?.value || '').trim() || this.operadorDesktop || 'Manuel';
    const desc = ($id('cd-desk-desc')?.value || '').trim();
    const valor = parseFloat($id('cd-desk-valor')?.value || '0');
    const checked = Array.from(document.querySelectorAll('input[name="cd-desk-eq"]:checked')).map(cb => Number(cb.value));

    if (!desc) {
      this.toast('Informe a descrição do item ou peça', 'warning');
      return;
    }
    if (checked.length === 0) {
      this.toast('Selecione ao menos um veículo para vincular', 'warning');
      return;
    }

    const fileInput = $id('cd-desk-foto');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    const fd = new FormData();
    fd.append('solicitante', solicitante);
    fd.append('descricao', desc);
    fd.append('valor_estimado', String(valor || 0));
    fd.append('equipamentos_ids', JSON.stringify(checked));
    fd.append('rateio', 'igual');
    if (file) fd.append('foto', file);

    const btnSubmit = $id('btn-submit-compra-desk');
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Enviando...'; }

    try {
      const r = await fetch('/api/jbc/v1/compras', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.success) {
        this.fecharModal();
        this.toast('Solicitação de compra registrada com sucesso!', 'success');
        this.carregarCompras();
        if (this.viewAtual === 'detalhe' && this.equipSelecionado) {
          this.carregarDetalhe(this.equipSelecionado.id);
        }
      } else {
        this.toast(j.message || 'Erro ao registrar solicitação', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão ao enviar solicitação', 'error');
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Registrar Solicitação'; }
    }
  },

  renderCompras(lista, pendentes) {
    const el = $id('compras-list');
    if (!el) return;

    if (!lista || lista.length === 0) {
      el.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Nenhuma solicitação encontrada</p>
      </div>`;
      return;
    }

    const fmtData = iso => {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }
      catch(_) { return iso; }
    };
    const fmtVal = v => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const isUserManuel = this.ehManuel();

    el.innerHTML = lista.map(c => {
      const isPendente   = c.status === 'pendente';
      const isAutorizado = c.status === 'autorizado';
      const isDeclinado  = c.status === 'declinado';

      const statusCls  = isPendente ? 'cd-status-pendente' : isAutorizado ? 'cd-status-autorizado' : 'cd-status-declinado';
      const statusIcon = isPendente
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        : isAutorizado
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      const statusLbl  = isPendente ? 'Aguardando Aprovação' : isAutorizado ? 'Autorizada' : 'Declinada';

      const tagsHtml = (c.equipamentos_tags || []).map(tag =>
        `<span class="cd-veiculo-tag">${escapar(tag)}</span>`
      ).join('') || '<span class="cd-veiculo-tag" style="opacity:.5">Sem veículo</span>';

      const fotoHtml = c.foto_url
        ? `<div class="cd-foto-wrap" onclick="App.abrirLightbox('${c.foto_url}','${escapar(c.numero)}')">
             <img src="${c.foto_url}" class="cd-foto" alt="Foto do item">
             <div class="cd-foto-overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></div>
           </div>`
        : `<div class="cd-foto-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;opacity:.4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`;

      let acoesHtml = '';
      if (isPendente) {
        if (this.ehAdmin()) {
          acoesHtml = `
            <div class="cd-acoes">
              <button class="btn btn-sm cd-btn-autorizar" onclick="App.abrirModalAutorizarCompra(${c.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Autorizar</span>
              </button>
              <button class="btn btn-sm cd-btn-declinar" onclick="App.declinarCompra(${c.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Declinar</span>
              </button>
            </div>`;
        } else {
          acoesHtml = `
            <div class="cd-acoes">
              <span class="cd-status-solicitante" style="font-size:11.5px;color:#f59e0b;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);padding:5px 12px;border-radius:12px;display:inline-flex;align-items:center;gap:6px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Aguardando aprovação da diretoria
              </span>
            </div>`;
        }
      }

      const infoExtra = isAutorizado
        ? `<div class="cd-info-extra cd-info-ok">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>
             Autorizado por <strong>${escapar(c.autorizado_por)}</strong> em ${fmtData(c.autorizado_em)}
             ${c.obs_aprovador ? ` · <em>${escapar(c.obs_aprovador)}</em>` : ''}
             · Valor final: <strong>${fmtVal(c.valor_final)}</strong>
             ${(c.equipamentos_tags||[]).length > 1 ? ` · Rateado entre ${c.equipamentos_tags.length} veículos (${fmtVal((c.valor_final||0)/(c.equipamentos_tags.length||1))}/veículo)` : ''}
           </div>`
        : isDeclinado
        ? `<div class="cd-info-extra cd-info-err">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px;margin-right:4px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             Declinado por <strong>${escapar(c.autorizado_por)}</strong> em ${fmtData(c.autorizado_em)}
             ${c.motivo_declinio ? ` · Motivo: <em>${escapar(c.motivo_declinio)}</em>` : ''}
           </div>`
        : '';

      return `
        <div class="cd-card ${isPendente ? 'cd-card-pendente' : isAutorizado ? 'cd-card-autorizado' : 'cd-card-declinado'}">
          ${fotoHtml}
          <div class="cd-card-body">
            <div class="cd-card-top">
              <div class="cd-card-num">${escapar(c.numero)}</div>
              <span class="cd-status-badge ${statusCls}">${statusIcon} ${statusLbl}</span>
            </div>
            <div class="cd-card-desc">${escapar(c.descricao)}</div>
            <div class="cd-card-meta">
              <span><strong>Solicitante:</strong> ${escapar(c.solicitante)}</span>
              <span><strong>Valor estimado:</strong> ${c.valor_estimado > 0 ? fmtVal(c.valor_estimado) : 'A orçar'}</span>
              <span><strong>Data:</strong> ${fmtData(c.solicitado_em)}</span>
            </div>
            <div class="cd-veiculos-row">
              <span class="cd-veiculos-label">Veículos:</span>
              ${tagsHtml}
            </div>
            ${infoExtra}
            ${acoesHtml}
          </div>
        </div>`;
    }).join('');
  },

  _compraParaAutorizar: null,

  abrirModalAutorizarCompra(id) {
    if (!this.ehManuel()) {
      this.toastPermissaoManuel();
      return;
    }

    this._compraParaAutorizar = id;
    const modal = $id('modal-overlay');
    const titulo = $id('modal-titulo');
    const body = $id('modal-body');
    if (!modal || !body) return;

    titulo.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Autorizar Compra Direta</span>
      </div>`;

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
        <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.5">
          Confirme o valor final e adicione uma observação opcional.
          O custo será automaticamente atribuído aos veículos vinculados.
        </p>
        <div class="form-group">
          <label for="cd-auth-valor">Valor Final Aprovado (R$) <span class="req">*</span></label>
          <input type="number" id="cd-auth-valor" min="0" step="0.01" placeholder="Ex: 285.00" class="form-control" autofocus>
        </div>
        <div class="form-group">
          <label for="cd-auth-obs">Observação / Fornecedor (opcional)</label>
          <input type="text" id="cd-auth-obs" placeholder="Ex: Aprovado, retirar na HidroPeças" class="form-control">
        </div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn btn-ghost" onclick="App.fecharModal()" style="flex:1">Cancelar</button>
          <button class="btn btn-primary" onclick="App.confirmarAutorizarCompra()" style="flex:2;background:var(--c-green);border-color:var(--c-green)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>
            Confirmar Autorização
          </button>
        </div>
      </div>`;

    modal.style.display = 'flex';
  },

  async confirmarAutorizarCompra() {
    if (!this.ehManuel()) {
      this.toastPermissaoManuel();
      return;
    }

    const id = this._compraParaAutorizar;
    if (!id) return;

    const valorRaw = $id('cd-auth-valor')?.value;
    const obs = $id('cd-auth-obs')?.value || '';

    if (!valorRaw || parseFloat(valorRaw) <= 0) {
      this.toast('Informe o valor final da compra', 'warning');
      return;
    }

    this.fecharModal();
    try {
      const r = await fetch(`/api/jbc/v1/compras/${id}/autorizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autorizado_por: 'Manuel',
          valor_final: parseFloat(valorRaw),
          obs_aprovador: obs
        })
      });
      const j = await r.json();
      if (j.success) {
        this.toast(j.message || 'Compra autorizada com sucesso!', 'success');
        this.carregarCompras();
        if (this.viewAtual === 'detalhe' && this.equipSelecionado) {
          this.carregarDetalhe(this.equipSelecionado.id);
        }
      } else {
        this.toast(j.message || 'Erro ao autorizar', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão ao autorizar', 'error');
    }
  },

  async declinarCompra(id) {
    if (!this.ehManuel()) {
      this.toastPermissaoManuel();
      return;
    }

    const motivo = prompt('Informe o motivo do declínio (opcional):') ?? null;
    if (motivo === null) return;

    try {
      const r = await fetch(`/api/jbc/v1/compras/${id}/declinar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autorizado_por: 'Manuel',
          motivo_declinio: motivo
        })
      });
      const j = await r.json();
      if (j.success) {
        this.toast(j.message || 'Compra declinada.', 'success');
        this.carregarCompras();
        if (this.viewAtual === 'detalhe' && this.equipSelecionado) {
          this.carregarDetalhe(this.equipSelecionado.id);
        }
      } else {
        this.toast(j.message || 'Erro ao declinar', 'error');
      }
    } catch (_) {
      this.toast('Erro de conexão', 'error');
    }
  },

  // ── Filtros ──────────────────────────────────────────────────────
  configurarFiltros() {
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.filtrarPor(chip.dataset.filtro);
      });
    });
  },

  filtrarPor(filtro) {
    if (filtro === 'Entregues') {
      this.abrirAbaEntregues();
      return;
    }

    this.abaPrincipal = 'patio';
    const tabPatio = $id('ws-tab-patio');
    const tabEnt = $id('ws-tab-entregues');
    if (tabPatio) tabPatio.classList.add('active');
    if (tabEnt) tabEnt.classList.remove('active');

    const painelGeral = $id('painel-slide-geral');
    const painelDetalhes = $id('painel-slide-detalhes');
    if (painelGeral) painelGeral.style.display = 'block';
    if (painelDetalhes) painelDetalhes.style.display = 'none';

    document.querySelectorAll('.chip').forEach(c => {
      if (c.dataset.filtro === filtro) c.classList.add('active');
      else c.classList.remove('active');
    });
    this.filtroAtual = filtro;
    this.carregarPainel();
  },

  configurarBusca() {
    const inp = $id('search-input');
    if (!inp) return;
    let t;
    inp.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { this.termoBusca = inp.value.trim().toLowerCase(); this.renderizarTabela(); }, 200);
    });
  },

  // ── Carregamento do Painel ───────────────────────────────────────
  async carregarPainel() {
    try {
      const r = await fetch(`${API}?filtro=${this.filtroAtual}`);
      const j = await r.json();
      if (!j.success) throw new Error('Resposta inválida');

      this._equipamentos = j.data;
      await this.atualizarContadores();
      this.renderizarTabela();
      const slideAntes = this.slideAtual;
      this.gerarEstruturaSlides();
      if (slideAntes > 0 && slideAntes < this.slides.length) {
        this.slideAtual = slideAntes;
      }
      this.exibirSlideAtual();
      this.iniciarLoopSlides();
    } catch (e) {
      console.error(e);
      this.toast('Erro ao carregar painel', 'error');
    }
  },

  async atualizarContadores() {
    try {
      const res = await fetch('/api/jbc/v1/painel/tv');
      const data = await res.json();
      if (data && data.success && data.totais) {
        const t = data.totais;
        const set = (id, v) => { const el = $id(id); if (el) el.textContent = v; };
        set('counter-patio', t.total_patio ?? 0);
        set('counter-andamento', t.em_andamento ?? 0);
        set('counter-aguardando', t.aguardando ?? 0);
        set('counter-prontos', t.prontos ?? 0);
        set('counter-atrasados', t.atrasados ?? 0);
        set('counter-entregues', t.entregues ?? 0);
        set('chip-count-entregues', t.entregues ?? 0);
        set('ws-badge-patio', t.total_patio ?? 0);
        set('ws-badge-entregues', t.entregues ?? 0);
        set('tv-kpi-patio', t.total_patio ?? 0);
        set('tv-kpi-andamento', t.em_andamento ?? 0);
        set('tv-kpi-aguardando', t.aguardando ?? 0);
        set('tv-kpi-prontos', t.prontos ?? 0);
        set('tv-kpi-atrasados', t.atrasados ?? 0);
        set('tv-kpi-entregues', t.entregues ?? 0);
        return;
      }
    } catch (_) {}

    const eq = this._equipamentos || [];
    const noPatio = eq.filter(e => e.estado !== 'entregue');
    const andamento = noPatio.filter(e => GRUPOS_ESTADO.em_andamento.includes(e.estado));
    const aguardando = noPatio.filter(e => GRUPOS_ESTADO.aguardando.includes(e.estado));
    const prontos = noPatio.filter(e => e.estado === 'pronto');
    const atrasados = noPatio.filter(e => e.atrasado);
    const entregues = eq.filter(e => e.estado === 'entregue');

    const set = (id, v) => { const el = $id(id); if (el) el.textContent = v; };
    set('counter-patio', noPatio.length);
    set('counter-andamento', andamento.length);
    set('counter-aguardando', aguardando.length);
    set('counter-prontos', prontos.length);
    set('counter-atrasados', atrasados.length);
    set('counter-entregues', entregues.length);
    set('chip-count-entregues', entregues.length);
    set('ws-badge-patio', noPatio.length);
    set('ws-badge-entregues', entregues.length);
  },

  renderizarTabela() {
    const tbody = $id('op-table-body');
    const empty = $id('painel-empty');
    const thead = $id('op-table') ? $id('op-table').querySelector('thead') : null;
    if (!tbody) return;

    if (thead) {
      if (this.filtroAtual === 'Entregues') {
        thead.innerHTML = `
          <tr>
            <th class="col-tag">Tag</th>
            <th class="col-empresa">Cliente</th>
            <th class="col-equip">Equipamento</th>
            <th class="col-servico">Serviços Concluídos</th>
            <th class="col-resp">Responsável</th>
            <th class="col-local">Entrada / Entrega</th>
            <th class="col-estado">Estado</th>
            <th class="col-prog">Prog.</th>
            <th class="col-atu">Permanência</th>
            <th class="col-acoes" style="text-align:center;width:70px">Ações</th>
          </tr>`;
      } else {
        thead.innerHTML = `
          <tr>
            <th class="col-tag">Tag</th>
            <th class="col-empresa">Cliente</th>
            <th class="col-equip">Equipamento</th>
            <th class="col-servico">Serviços em Execução</th>
            <th class="col-resp">Responsável</th>
            <th class="col-local">Local</th>
            <th class="col-estado">Estado</th>
            <th class="col-prog">Prog.</th>
            <th class="col-atu">Atualização</th>
            <th class="col-acoes" style="text-align:center;width:60px">Ações</th>
          </tr>`;
      }
    }

    let lista = this._equipamentos || [];

    if (this.termoBusca) {
      const t = this.termoBusca;
      lista = lista.filter(e =>
        [e.tag, e.empresa, e.equipamento, e.responsavel_tecnico, e.responsavel_cliente, e.servico_atual, e.num_os, e.num_orcamento, e.localizacao]
        .some(v => (v||'').toLowerCase().includes(t))
      );
    }

    if (lista.length === 0) {
      tbody.innerHTML = '';
      if (empty) {
        empty.style.display = 'flex';
        const emptyMsg = empty.querySelector('p') || empty;
        if (this.filtroAtual === 'Entregues') {
          emptyMsg.textContent = 'Nenhum veículo entregue no momento.';
        } else {
          emptyMsg.textContent = 'Nenhum equipamento em atendimento no momento.';
        }
      }
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = lista.map(eq => this._renderLinhaTabela(eq)).join('');

    // Eventos de clique
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => this.navegar('detalhe', tr.dataset.id));
    });
  },

  _renderLinhaTabela(eq) {
    if (this.filtroAtual === 'Entregues') {
      const dataEntrada = formatarDataBR(eq.data_entrada);
      const dataEntrega = formatarDataBR(eq.data_entrega || eq.data_conclusao || eq.updated_at);
      const srvLista = eq.servicos_lista || [];
      const srvNomes = srvLista.map(s => s.titulo).join(', ') || eq.servico_atual || 'Revisão e Manutenção Concluídas';

      return `
      <tr data-id="${eq.id}" class="row-entregue">
        <td>
          <span class="tag-pill">${escapar(eq.tag)}</span>
        </td>
        <td>
          <span class="txt-truncate" title="${escapar(eq.empresa)}">${escapar(eq.empresa)}</span>
        </td>
        <td>
          <span class="txt-truncate" title="${escapar(eq.equipamento)}"><strong>${escapar(eq.equipamento)}</strong></span>
          ${eq.placa ? `<span class="txt-sub">${escapar(eq.placa)}</span>` : ''}
        </td>
        <td>
          <div class="txt-truncate" title="${escapar(srvNomes)}" style="color:var(--text-primary);font-weight:500">
            ${renderIcon('check', 'text-green')} ${escapar(srvNomes)}
          </div>
          <div class="txt-sub">${srvLista.length} serviço(s) finalizado(s)</div>
        </td>
        <td>
          <span class="txt-truncate">${escapar(eq.responsavel_tecnico || eq.responsavel_atual || '—')}</span>
          ${eq.responsavel_cliente ? `<div class="txt-sub">${renderIcon('user')} ${escapar(eq.responsavel_cliente)}</div>` : ''}
        </td>
        <td>
          <div style="font-size:.75rem">${renderIcon('calendar')} Ent: ${dataEntrada}</div>
          <div class="txt-sub" style="color:var(--c-green);font-size:.72rem">${renderIcon('delivery')} Saiu: ${dataEntrega}</div>
        </td>
        <td>
          <div class="estado-badge estado-entregue">
            <div class="estado-dot"></div>
            <span>ENTREGUE</span>
          </div>
          ${eq.num_os ? `<div class="txt-sub">${renderIcon('os')} OS: ${escapar(eq.num_os)}</div>` : ''}
        </td>
        <td>
          <div class="prog-wrap">
            <div class="prog-bar"><div class="prog-fill" style="width:100%;background:var(--c-slate)"></div></div>
            <span class="prog-pct" style="color:var(--c-slate)">100%</span>
          </div>
        </td>
        <td>
          <span class="atu-label">${renderIcon('clock')} ${eq.tempo_oficina || '—'} total</span>
        </td>
        <td style="text-align:center" onclick="event.stopPropagation()">
          <div style="display:inline-flex;align-items:center;gap:.25rem">
            <button class="btn-icon btn-edit-hover" style="width:28px;height:28px" onclick="App.navegar('detalhe', ${eq.id})" title="Ver Dossiê e Histórico Completo" aria-label="Ver Dossiê">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-icon btn-edit-hover" style="width:28px;height:28px" onclick="App.abrirModalEditarAtendimento(${eq.id})" title="Editar dados cadastrais" aria-label="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }

    const estadoClass = classeEstado(eq.estado, eq.atrasado);
    const estadoLabel = eq.atrasado ? 'ATRASADO' : (LABEL_ESTADO[eq.estado] || eq.estado);
    const progresso = eq.progresso || 0;
    const prio = eq.prioridade === 'Urgente' ? '<span class="badge-prio urgente">URGENTE</span>' :
                 eq.prioridade === 'Alta'    ? '<span class="badge-prio alta">ALTA</span>' : '';

    // Renderização do escopo de serviços em paralelo
    const srvLista = eq.servicos_lista || [];
    let servicosCellHtml = '';
    if (srvLista.length === 0) {
      servicosCellHtml = `<span class="txt-sub">Sem serviços definidos</span>`;
    } else {
      const resumo = eq.servicos_resumo;
      const resumoHtml = resumo && resumo.total > 0
        ? `<div class="tbl-srv-summary">
             <span class="tbl-srv-sum-total">${resumo.total} serviço(s)</span>
             ${resumo.concluidos > 0 ? `<span class="tbl-srv-pill conc" title="${resumo.concluidos} concluído(s)">${resumo.concluidos} pronto</span>` : ''}
             ${resumo.em_andamento > 0 ? `<span class="tbl-srv-pill andam" title="${resumo.em_andamento} em execução">${resumo.em_andamento} em andamento</span>` : ''}
             ${resumo.diagnostico > 0 ? `<span class="tbl-srv-pill diag" title="${resumo.diagnostico} sob análise/diagnóstico">${resumo.diagnostico} em análise</span>` : ''}
             ${resumo.aguardando > 0 ? `<span class="tbl-srv-pill aguard" title="${resumo.aguardando} aguardando peça/material">${resumo.aguardando} aguardando</span>` : ''}
           </div>`
        : '';

      const chipsHtml = srvLista.map(s => {
        const sCls = classeEstado(s.estado, false);
        const sLbl = LABEL_ESTADO[s.estado] || s.estado;
        const resp = s.responsavel ? ` · ${renderIcon('wrench')} ${escapar(s.responsavel)}` : '';
        const mot = s.estado_motivo ? ` (${escapar(s.estado_motivo)})` : '';
        return `
        <div class="tbl-srv-item ${sCls}" title="${escapar(s.titulo)}${mot}${resp}">
          <span class="tbl-srv-dot"></span>
          <span class="tbl-srv-title">${escapar(s.titulo)}</span>
          <span class="tbl-srv-status">${sLbl}</span>
        </div>`;
      }).join('');

      servicosCellHtml = `
      <div class="tbl-srv-container">
        ${resumoHtml}
        <div class="tbl-srv-list">${chipsHtml}</div>
      </div>`;
    }

    return `
    <tr data-id="${eq.id}" class="${eq.atrasado ? 'row-atrasado' : ''}">
      <td>
        <span class="tag-pill">${escapar(eq.tag)}</span>
        ${prio}
      </td>
      <td>
        <span class="txt-truncate" title="${escapar(eq.empresa)}">${escapar(eq.empresa)}</span>
      </td>
      <td>
        <span class="txt-truncate" title="${escapar(eq.equipamento)}">${escapar(eq.equipamento)}</span>
        ${eq.placa ? `<span class="txt-sub">${escapar(eq.placa)}</span>` : ''}
      </td>
      <td>
        ${servicosCellHtml}
      </td>
      <td>
        <span class="txt-truncate">${escapar(eq.responsavel_atual || eq.responsavel_tecnico || '—')}</span>
      </td>
      <td>
        <span class="txt-truncate">${escapar(eq.localizacao || '—')}</span>
      </td>
      <td>
        <div class="estado-badge ${estadoClass}">
          <div class="estado-dot"></div>
          <span>${estadoLabel}</span>
        </div>
        ${eq.estado_motivo ? `<div class="estado-motivo" title="${escapar(eq.estado_motivo)}">${escapar(eq.estado_motivo)}</div>` : ''}
      </td>
      <td>
        <div class="prog-wrap">
          <div class="prog-bar"><div class="prog-fill" style="width:${progresso}%"></div></div>
          <span class="prog-pct">${progresso}%</span>
        </div>
      </td>
      <td>
        <span class="atu-label">${eq.ultima_atualizacao_label || eq.tempo_oficina || '—'}</span>
      </td>
      <td style="text-align:center" onclick="event.stopPropagation()">
        <div style="display:inline-flex;align-items:center;gap:.25rem">
          <button class="btn-icon btn-edit-hover" style="width:28px;height:28px" onclick="App.abrirModalEditarAtendimento(${eq.id})" title="Editar dados cadastrais deste atendimento" aria-label="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-danger-hover" style="width:28px;height:28px" onclick="App.excluirAtendimento(${eq.id}, '${escapar(eq.tag)}')" title="Excluir Atendimento" aria-label="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  },

  // ── Detalhe do Equipamento ───────────────────────────────────────
  async carregarDetalhe(id) {
    const container = $id('detalhe-content');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted)">Carregando...</div>';

    try {
      const r = await fetch(`${API}/${id}`);
      const j = await r.json();
      if (!j.success) throw new Error('Não encontrado');
      this.equipSelecionado = j.data;
      this.renderizarDetalhe(j.data);
    } catch (e) {
      container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--c-red)">Erro ao carregar equipamento.</div>';
    }
  },

  renderizarDetalhe(eq) {
    const container = $id('detalhe-content');
    if (!container) return;

    const progresso = eq.progresso || 0;
    const estadoClass = classeEstado(eq.estado, eq.atrasado);
    const estadoLabel = eq.atrasado ? 'ATRASADO' : (LABEL_ESTADO_FULL[eq.estado] || eq.estado);
    const prio = eq.prioridade === 'Urgente' ? '<span class="badge-prio urgente">URGENTE</span>' :
                 eq.prioridade === 'Alta'    ? '<span class="badge-prio alta">ALTA</span>' : '';

    const servicosHtml = (eq.servicos || []).map(srv => this._renderServicoCard(eq.id, srv)).join('');
    const chatSecaoHtml = this._renderChatSecao(eq);

    // Resumo de múltiplos serviços para o cabeçalho
    const resumo = eq.servicos_resumo;
    const resumoHeader = resumo ? `
      <div class="detalhe-srv-resumo">
        <span><strong>${resumo.total}</strong> serviço(s) no escopo</span>
        ${resumo.concluidos > 0 ? `<span class="badge-sub-conc">${resumo.concluidos} pronto(s)</span>` : ''}
        ${resumo.em_andamento > 0 ? `<span class="badge-sub-andam">${resumo.em_andamento} em andamento</span>` : ''}
        ${resumo.diagnostico > 0 ? `<span class="badge-sub-diag">${resumo.diagnostico} sob análise</span>` : ''}
        ${resumo.aguardando > 0 ? `<span class="badge-sub-aguard">${resumo.aguardando} aguardando</span>` : ''}
      </div>` : '';

    container.innerHTML = `
    <div class="detalhe-header">
      <div class="detalhe-header-left">
        <button class="btn-back" onclick="App.navegar('painel')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar ao painel
        </button>
        <div style="margin-top:.75rem">
          <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">
            <span class="detalhe-tag">${escapar(eq.tag)}</span>
            <button class="btn-icon btn-edit-hover" onclick="App.abrirModalEditarAtendimento(${eq.id})" title="Editar informações cadastrais deste atendimento" style="width:28px;height:28px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div class="detalhe-equip">${escapar(eq.equipamento)} ${prio}</div>
          <div class="detalhe-meta">
            <span>${renderIcon('building')} ${escapar(eq.empresa)}</span>
            ${eq.responsavel_cliente ? `<span>${renderIcon('user')} ${escapar(eq.responsavel_cliente)} (cliente)</span>` : ''}
            ${eq.responsavel_tecnico ? `<span>${renderIcon('wrench')} ${escapar(eq.responsavel_tecnico)} (técnico)</span>` : ''}
            <span>${renderIcon('pin')} ${escapar(eq.localizacao || '—')}</span>
            <span>${renderIcon('clock')} ${eq.tempo_oficina || '—'} na oficina</span>
            ${eq.placa ? `<span>${renderIcon('truck')} Placa: <strong>${escapar(eq.placa)}</strong></span>` : ''}
            ${eq.horimetro ? `<span>${renderIcon('gear')} Horímetro: <strong>${escapar(eq.horimetro)}</strong></span>` : ''}
            ${eq.km ? `<span>${renderIcon('route')} <strong>${escapar(eq.km)}</strong> km</span>` : ''}
            ${eq.previsao_entrega ? `<span>${renderIcon('calendar')} Previsão: <strong>${formatarDataBR(eq.previsao_entrega)}</strong></span>` : ''}
            ${eq.num_os ? `<span>${renderIcon('os')} OS: <strong>${escapar(eq.num_os)}</strong></span>` : ''}
            ${eq.num_orcamento ? `<span>${renderIcon('orc')} Orç: <strong>${escapar(eq.num_orcamento)}</strong></span>` : ''}
            ${eq.num_nf ? `<span>${renderIcon('nf')} NF: <strong>${escapar(eq.num_nf)}</strong></span>` : ''}
          </div>
          ${resumoHeader}
        </div>
      </div>
      <div class="detalhe-header-right">
        <div class="estado-badge ${estadoClass}" style="padding:.45rem .9rem; font-size:.85rem">
          <div class="estado-dot"></div>
          <span>${estadoLabel}</span>
        </div>
        ${eq.estado_motivo ? `<div class="estado-motivo" style="font-size:.76rem; text-align:right">${escapar(eq.estado_motivo)}</div>` : ''}
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end;margin-top:.4rem">
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalEditarAtendimento(${eq.id})" title="Editar informações do atendimento (equipamento, cliente, baia, prazos, etc.)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;margin-right:2px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar dados
          </button>
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalEstado(${eq.id})">Alterar estado geral</button>
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalLocalizacao(${eq.id}, '${escapar(eq.localizacao || '')}')">Mover baia</button>
          <button class="btn btn-sm btn-primary" onclick="App.abrirModalNovoServico(${eq.id})">+ Serviço</button>
          <button class="btn btn-sm btn-ghost-danger" onclick="App.excluirAtendimento(${eq.id}, '${escapar(eq.tag)}')" title="Excluir este atendimento">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Excluir
          </button>
        </div>
        <div class="prog-wrap" style="width:180px; margin-top:.25rem">
          <div class="prog-bar"><div class="prog-fill" style="width:${progresso}%"></div></div>
          <span class="prog-pct">${progresso}%</span>
        </div>
      </div>
    </div>

    <!-- Queixa inicial -->
    <div class="detalhe-section" style="border-left:3px solid var(--accent); margin-bottom:.85rem">
      <div style="padding:.75rem 1rem; font-size:.82rem; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem">
        <div>
          <span style="font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--text-muted);">Queixa / Relato inicial do cliente</span>
          <p style="margin-top:.35rem; color:var(--text-secondary)">${escapar(eq.queixa_inicial || 'Nenhum relato inicial registrado.')}</p>
        </div>
        <button class="btn-icon btn-edit-hover" onclick="App.abrirModalEditarAtendimento(${eq.id})" title="Editar queixa e dados cadastrais" style="width:28px;height:28px;flex-shrink:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
    </div>

    <!-- Serviços -->
    <div class="detalhe-section">
      <div class="section-head">
        <span class="section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14.5 2-8.5 8.5 5.5 5.5 8.5-8.5M2 22l5-1-4-4z"/></svg>
          Serviços ativos no equipamento
          <span style="background:var(--bg-active);border-radius:99px;padding:.1rem .5rem;font-size:.72rem;color:var(--text-muted)">${(eq.servicos||[]).length}</span>
        </span>
        <button class="btn btn-sm btn-primary" onclick="App.abrirModalNovoServico(${eq.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo serviço
        </button>
      </div>
      <div class="section-body-inner">
        ${servicosHtml || '<div class="empty-state" style="padding:2rem"><p>Nenhum serviço registrado. Adicione o primeiro serviço.</p></div>'}
      </div>
    </div>

    <!-- Custos Diretos & Insumos Aplicados -->
    ${(() => {
      const custos = Array.isArray(eq.custos_diretos) ? eq.custos_diretos : [];
      const total = custos.reduce((acc, c) => acc + (parseFloat(c.valor_atribuido) || 0), 0);
      const fmtM = v => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
      const fmtD = iso => {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }
        catch(_) { return iso; }
      };

      return `
      <div class="custos-diretos-section">
        <div class="custos-diretos-header">
          <div style="display:flex;align-items:center;gap:7px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span>Custos Diretos & Insumos Aplicados (${custos.length})</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="custos-diretos-total">${total > 0 ? fmtM(total) : 'R$ 0,00'}</span>
            <button class="btn btn-sm btn-primary" onclick="App.abrirModalNovaCompra(${eq.id})" style="padding:3px 9px;font-size:0.75rem" title="Solicitar peça ou insumo para este veículo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Solicitar Peça</span>
            </button>
            <button class="btn btn-sm btn-ghost" onclick="App.abrirAbaCompras()" style="padding:2px 8px;font-size:0.75rem" title="Ver compras diretas">
              Aba Compras &rarr;
            </button>
          </div>
        </div>
        ${custos.length > 0 ? `
          <div class="custos-diretos-body">
            ${custos.map(c => `
              <div class="custo-row">
                ${c.foto_url ? `<img src="${c.foto_url}" style="width:38px;height:38px;border-radius:6px;object-fit:cover;cursor:pointer;flex-shrink:0" onclick="App.abrirLightbox('${c.foto_url}','${escapar(c.numero_compra)}')">` : ''}
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span class="custo-num">${escapar(c.numero_compra || 'CD')}</span>
                    <span class="custo-desc">${escapar(c.descricao)}</span>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">
                    Solicitado por <strong>${escapar(c.solicitante || '—')}</strong> · Aprovado por <strong>${escapar(c.autorizado_por || '—')}</strong> em ${fmtD(c.data)}
                  </div>
                </div>
                <div class="custo-val">${fmtM(c.valor_atribuido)}</div>
              </div>
            `).join('')}
          </div>` : `
          <div style="padding:14px;text-align:center;font-size:0.8rem;color:var(--text-muted)">
            Nenhum insumo de compra direta aplicado neste veículo.
          </div>`}
      </div>`;
    })()}

    <!-- Chat & Backlog Operacional (Substitui Dossiê) -->
    ${chatSecaoHtml}

    <!-- Zona de Perigo / Exclusão do Atendimento -->
    <div class="detalhe-section" style="border:1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.04); margin-top:1.5rem">
      <div style="padding:1.1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
        <div>
          <div style="font-weight:700; color:var(--c-red); font-size:.95rem; display:flex; align-items:center; gap:.45rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Zona de Perigo
          </div>
          <div style="font-size:.82rem; color:var(--text-muted); margin-top:.25rem">
            Excluir permanentemente o atendimento de <strong>${escapar(eq.tag)} — ${escapar(eq.equipamento)}</strong>, incluindo todos os serviços, tarefas e notas registradas.
          </div>
        </div>
        <button class="btn btn-danger" onclick="App.excluirAtendimento(${eq.id}, '${escapar(eq.tag)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Excluir Atendimento
        </button>
      </div>
    </div>`;
  },

  _renderServicoCard(equipId, srv) {
    const estadoClass = classeEstado(srv.estado, false);
    const estadoLabel = LABEL_ESTADO[srv.estado] || srv.estado;
    const atividadesHtml = (srv.atividades || []).map(atv => this._renderAtividadeItem(equipId, srv.id, atv)).join('');

    return `
    <div class="servico-card" id="srv-card-${srv.id}">
      <div class="servico-card-head">
        <div class="servico-card-info">
          <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap">
            <span class="servico-titulo">${escapar(srv.titulo)}</span>
            <button class="servico-estado-btn ${estadoClass}" onclick="App.abrirModalEstadoServico(${equipId}, ${srv.id})" title="Alterar estado deste serviço">
              <div class="estado-dot"></div>
              <span>${estadoLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px;opacity:.7"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            ${srv.estado_motivo ? `<span class="servico-motivo-pill" title="${escapar(srv.estado_motivo)}">${renderIcon('alert')} ${escapar(srv.estado_motivo)}</span>` : ''}
          </div>
          ${srv.descricao ? `<div class="servico-desc" style="margin-top:.25rem">${escapar(srv.descricao)}</div>` : ''}
          <div style="display:flex;align-items:center;gap:.75rem;margin-top:.35rem;flex-wrap:wrap">
            ${srv.responsavel ? `<span style="font-size:.75rem;color:var(--text-muted)">${renderIcon('wrench')} Responsável: <strong>${escapar(srv.responsavel)}</strong></span>` : ''}
            <span style="font-size:.72rem;color:var(--text-muted)">${renderIcon('clock')} ${formatarDataBR(srv.atualizado_em)}</span>
          </div>
        </div>
        <div class="servico-card-actions" style="display:flex;gap:.35rem;align-items:center">
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalEstadoServico(${equipId}, ${srv.id})" title="Alterar estado do serviço">
            Estado
          </button>
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalNovaCompra(${equipId})" title="Solicitar peça ou insumo para este serviço">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Pedir Peça
          </button>
          <button class="btn btn-sm btn-ghost" onclick="App.abrirModalNovaAtividade(${equipId}, ${srv.id})" title="Nova atividade">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Atividade
          </button>
          <button class="btn-icon btn-danger-hover" style="width:28px;height:28px" onclick="App.excluirServico(${equipId}, ${srv.id}, '${escapar(srv.titulo)}')" title="Excluir serviço" aria-label="Excluir serviço">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="atividades-list">
        ${atividadesHtml || '<div style="padding:.5rem;color:var(--text-muted);font-size:.78rem">Nenhuma atividade. Adicione a primeira atividade.</div>'}
      </div>
      <button class="add-atividade-btn" onclick="App.abrirModalNovaAtividade(${equipId}, ${srv.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Adicionar atividade
      </button>
    </div>`;
  },

  _renderAtividadeItem(equipId, srvId, atv) {
    const estadoIcons = {
      concluida:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
      em_andamento:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/></svg>`,
      bloqueada:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      pendente:    ''
    };

    const estadoAtv = atv.estado || 'pendente';
    const icoInner = estadoIcons[estadoAtv] || '';

    return `
    <div class="atividade-item" id="atv-item-${srvId}-${atv.id}">
      <div class="ativ-check ${estadoAtv}" onclick="App.toggleAtividade(${equipId}, ${srvId}, ${atv.id})" title="Alterar estado (Clique para marcar)">
        ${icoInner}
      </div>
      <div class="ativ-content">
        <div class="ativ-desc ${atv.concluida ? 'concluida' : ''}">${escapar(atv.descricao)}</div>
        <div class="ativ-meta">
          ${atv.responsavel ? `<span class="ativ-meta-item">${renderIcon('wrench')} ${escapar(atv.responsavel)}</span>` : ''}
          ${atv.atualizacao ? `<span class="ativ-meta-item">${renderIcon('clock')} ${formatarDataRelativa(atv.atualizacao)}</span>` : ''}
          ${atv.estado_motivo ? `<span class="ativ-meta-item" style="color:var(--c-amber)">${renderIcon('alert')} ${escapar(atv.estado_motivo)}</span>` : ''}
        </div>
      </div>
      <div class="ativ-actions" style="display:flex;gap:.25rem;align-items:center">
        <button class="btn-icon" style="width:26px;height:26px" onclick="App.abrirModalAtualizarAtividade(${equipId}, ${srvId}, ${atv.id})" title="Atualizar atividade">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-danger-hover" style="width:26px;height:26px" onclick="App.excluirAtividade(${equipId}, ${srvId}, ${atv.id}, '${escapar(atv.descricao)}')" title="Remover atividade">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>`;
  },

  _renderDossieItem(d) {
    return ``;
  },

  // ── Toggle atividade (cicla: pendente → em_andamento → concluída → pendente) ──
  async toggleAtividade(equipId, srvId, atvId) {
    let eq = this.equipSelecionado;
    if (!eq && this._equipamentos) {
      eq = this._equipamentos.find(e => e.id === equipId);
    }
    if (!eq) return;
    const srv = (eq.servicos || []).find(s => s.id === srvId);
    if (!srv) return;
    const atv = (srv.atividades || []).find(a => a.id === atvId);
    if (!atv) return;

    // Comportamento direto de checklist: se concluída desmarca (pendente), senão marca (concluída)
    const novoEstado = (atv.estado === 'concluida') ? 'pendente' : 'concluida';

    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}/atividades/${atvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: novoEstado, usuario: 'Chefe de Oficina' })
      });
      const j = await r.json();
      if (j.success) {
        atv.estado = novoEstado;
        atv.concluida = novoEstado === 'concluida';
        atv.atualizacao = new Date().toISOString();

        // Se estiver no modal ou tela de detalhe:
        const el = $id(`atv-item-${srvId}-${atvId}`);
        if (el) el.outerHTML = this._renderAtividadeItem(equipId, srvId, j.data);

        // Recalcular e atualizar o progresso do equipamento
        let tot = 0, conc = 0;
        (eq.servicos || []).forEach(s => {
          (s.atividades || []).forEach(a => {
            tot++;
            if (a.concluida || a.estado === 'concluida') conc++;
          });
        });
        const pct = tot > 0 ? Math.round((conc / tot) * 100) : 0;
        eq.progresso = pct;
        eq.total_atividades = tot;
        eq.atividades_concluidas = conc;

        const fillEl = document.querySelector('.detalhe-header .prog-fill');
        const pctEl = document.querySelector('.detalhe-header .prog-pct');
        if (fillEl) fillEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;

        // Se estiver nos slides (Tela 2, 3, etc.), re-renderiza o slide atual para atualizar visualmente
        if (this.viewAtual === 'painel' && this.slideAtual > 0) {
          const grid = $id('slide-machines-grid');
          const slide = this.slides[this.slideAtual];
          if (grid && slide && slide.maquinas) {
            grid.innerHTML = this._renderDeepMachinesGrid(slide.maquinas, false);
          }
        }

        this.toast(`Atividade: ${LABEL_ESTADO[novoEstado] || novoEstado}`, 'success');
      }
    } catch (e) { this.toast('Erro ao atualizar atividade', 'error'); }
  },

  // ── Exclusões ─────────────────────────────────────────────────────
  async excluirAtendimento(id, tag) {
    const nome = tag ? `o atendimento "${tag}"` : 'este atendimento';
    if (!confirm(`Tem certeza que deseja excluir ${nome}?\n\nEsta ação removerá todos os serviços, atividades e notas associadas e não pode ser desfeita.`)) {
      return;
    }

    try {
      const r = await fetch(`${API}/${id}`, {
        method: 'DELETE'
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Erro ao excluir atendimento');

      this.toast(`Atendimento ${tag || ''} excluído com sucesso!`, 'success');
      this.equipSelecionado = null;
      this.navegar('painel');
    } catch (e) {
      console.error('[Excluir Atendimento] Erro:', e);
      this.toast(e.message || 'Erro ao excluir atendimento', 'error');
    }
  },

  async excluirServico(equipId, srvId, titulo) {
    const nome = titulo ? `o serviço "${titulo}"` : 'este serviço';
    if (!confirm(`Tem certeza que deseja excluir ${nome} e todas as suas atividades?`)) {
      return;
    }

    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}`, {
        method: 'DELETE'
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Erro ao excluir serviço');

      this.toast('Serviço excluído com sucesso!', 'success');
      this.carregarDetalhe(equipId);
    } catch (e) {
      console.error('[Excluir Serviço] Erro:', e);
      this.toast(e.message || 'Erro ao excluir serviço', 'error');
    }
  },

  async excluirAtividade(equipId, srvId, atvId, desc) {
    const nome = desc ? `a atividade "${desc}"` : 'esta atividade';
    if (!confirm(`Tem certeza que deseja remover ${nome}?`)) {
      return;
    }

    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}/atividades/${atvId}`, {
        method: 'DELETE'
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Erro ao remover atividade');

      this.toast('Atividade removida com sucesso!', 'success');
      this.fecharModal();
      this.carregarDetalhe(equipId);
    } catch (e) {
      console.error('[Excluir Atividade] Erro:', e);
      this.toast(e.message || 'Erro ao remover atividade', 'error');
    }
  },

  // ── Modais ───────────────────────────────────────────────────────

  abrirModal(titulo, htmlBody, modalClass = '') {
    const box = $id('modal-box');
    if (box) box.className = 'modal-box' + (modalClass ? ' ' + modalClass : '');
    $id('modal-titulo').textContent = titulo;
    $id('modal-body').innerHTML = htmlBody;
    $id('modal-overlay').style.display = 'flex';
    $id('modal-overlay').addEventListener('click', e => { if (e.target === $id('modal-overlay')) this.fecharModal(); }, { once: true });
  },

  fecharModal() {
    const overlay = $id('modal-overlay');
    overlay.style.display = 'none';
    $id('modal-body').innerHTML = '';
    const box = $id('modal-box');
    if (box) box.className = 'modal-box';
  },

  // Modal: Editar Atendimento Completo (Equipamento, Cliente, Atendimento, Administrativo)
  async abrirModalEditarAtendimento(equipId) {
    let eq = (this.equipSelecionado && this.equipSelecionado.id == equipId)
      ? this.equipSelecionado
      : (this._equipamentos || []).find(e => e.id == equipId);

    if (!eq || !eq.empresa) {
      try {
        const r = await fetch(`${API}/${equipId}`);
        const j = await r.json();
        if (j.success) eq = j.data;
      } catch (e) {
        console.error(e);
      }
    }
    if (!eq) return this.toast('Equipamento não encontrado', 'error');

    const baias = [
      'Baia 01',
      'Baia 02',
      'Baia 03',
      'Baia 04',
      'Setor de Usinagem',
      'Setor de Solda',
      'Testes Hidráulicos',
      'Pátio Externo'
    ];
    if (eq.localizacao && !baias.includes(eq.localizacao)) {
      baias.push(eq.localizacao);
    }
    const baiasOptions = baias.map(b => `<option value="${b}" ${(eq.localizacao || 'Baia 01') === b ? 'selected' : ''}>${b}</option>`).join('');

    const html = `
    <form id="form-editar-atendimento" onsubmit="App.salvarEdicaoAtendimento(${eq.id}, event)" autocomplete="off">
      <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:1rem">
        Altere as informações cadastrais e operacionais deste atendimento a qualquer momento.
      </div>

      <!-- Equipamento -->
      <fieldset class="form-section" style="margin-bottom:1rem">
        <legend>Equipamento</legend>
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="edit-f-equipamento">Equipamento <span class="req">*</span></label>
            <input type="text" id="edit-f-equipamento" name="equipamento" value="${escapar(eq.equipamento || '')}" placeholder="Ex: Escavadeira CAT 320D" required>
          </div>
          <div class="form-group span-2">
            <label for="edit-f-tag">Tag / Identificação</label>
            <input type="text" id="edit-f-tag" name="tag" value="${escapar(eq.tag || '')}" placeholder="Ex: CAT-023, EQ-0042">
          </div>
          <div class="form-group span-2">
            <label for="edit-f-placa">Placa</label>
            <input type="text" id="edit-f-placa" name="placa" value="${escapar(eq.placa || '')}" placeholder="Ex: ABC-1234">
          </div>
          <div class="form-group">
            <label for="edit-f-horimetro">Horímetro</label>
            <input type="text" id="edit-f-horimetro" name="horimetro" value="${escapar(eq.horimetro || '')}" placeholder="Ex: 7.890 h">
          </div>
          <div class="form-group">
            <label for="edit-f-km">Km</label>
            <input type="text" id="edit-f-km" name="km" value="${escapar(eq.km || '')}" placeholder="Ex: 145.000 km">
          </div>
        </div>
      </fieldset>

      <!-- Cliente -->
      <fieldset class="form-section" style="margin-bottom:1rem">
        <legend>Cliente</legend>
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="edit-f-empresa">Empresa / Cliente <span class="req">*</span></label>
            <input type="text" id="edit-f-empresa" name="empresa" value="${escapar(eq.empresa || '')}" placeholder="Nome da empresa ou cliente" required>
          </div>
          <div class="form-group span-2">
            <label for="edit-f-resp-cliente">Responsável requisitante (quem trouxe)</label>
            <input type="text" id="edit-f-resp-cliente" name="responsavel_cliente" value="${escapar(eq.responsavel_cliente || '')}" placeholder="Nome e função — ex: Fábio Mendes (Gerente de Frota)">
          </div>
        </div>
      </fieldset>

      <!-- Atendimento -->
      <fieldset class="form-section" style="margin-bottom:1rem">
        <legend>Atendimento</legend>
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="edit-f-resp-tecnico">Responsável técnico (quem vai executar)</label>
            <input type="text" id="edit-f-resp-tecnico" name="responsavel_tecnico" value="${escapar(eq.responsavel_tecnico || '')}" placeholder="Ex: João Silva — Mecânico">
          </div>
          <div class="form-group">
            <label for="edit-f-local">Localização / Baia</label>
            <select id="edit-f-local" name="localizacao">
              ${baiasOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-f-prioridade">Prioridade</label>
            <select id="edit-f-prioridade" name="prioridade">
              <option value="Normal" ${(eq.prioridade || 'Normal') === 'Normal' ? 'selected' : ''}>Normal</option>
              <option value="Alta" ${eq.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
              <option value="Urgente" ${eq.prioridade === 'Urgente' ? 'selected' : ''}>Urgente</option>
            </select>
          </div>
          <div class="form-group span-4">
            <label for="edit-f-previsao">Previsão de entrega</label>
            <input type="datetime-local" id="edit-f-previsao" name="previsao_entrega" value="${formatarParaDatetimeLocal(eq.previsao_entrega)}">
          </div>
          <div class="form-group span-4">
            <label for="edit-f-queixa">Queixa / Relato inicial do cliente <span class="req">*</span></label>
            <textarea id="edit-f-queixa" name="queixa_inicial" rows="3" placeholder="Descreva o problema relatado pelo cliente..." required>${escapar(eq.queixa_inicial || '')}</textarea>
          </div>
        </div>
      </fieldset>

      <!-- Dados Administrativos -->
      <fieldset class="form-section" style="margin-bottom:1rem">
        <legend>Dados administrativos (OS, Orçamento, NF)</legend>
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="edit-f-os">Nº OS</label>
            <input type="text" id="edit-f-os" name="num_os" value="${escapar(eq.num_os || '')}" placeholder="Ex: 2026-0098">
          </div>
          <div class="form-group">
            <label for="edit-f-orc">Nº Orçamento</label>
            <input type="text" id="edit-f-orc" name="num_orcamento" value="${escapar(eq.num_orcamento || '')}" placeholder="Ex: 2026-0187">
          </div>
          <div class="form-group">
            <label for="edit-f-nf">Nº NF</label>
            <input type="text" id="edit-f-nf" name="num_nf" value="${escapar(eq.num_nf || '')}" placeholder="Ex: NF-10492">
          </div>
        </div>
      </fieldset>

      <div class="form-actions" style="margin-top:1.25rem">
        <button type="button" class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-edicao">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>
          Salvar Alterações
        </button>
      </div>
    </form>`;

    this.abrirModal(`Editar Informações — ${escapar(eq.tag || eq.equipamento)}`, html, 'modal-lg');
  },

  async salvarEdicaoAtendimento(equipId, e) {
    if (e) e.preventDefault();
    const form = $id('form-editar-atendimento');
    if (!form) return;

    const btn = $id('btn-salvar-edicao');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Salvando alterações...';
    }

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (!payload.equipamento || !payload.empresa) {
      this.toast('Preencha os campos obrigatórios (Equipamento e Empresa)', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg> Salvar Alterações`;
      }
      return;
    }

    try {
      const r = await fetch(`${API}/${equipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!j.success) {
        throw new Error(j.message || 'Erro ao salvar alterações');
      }

      this.toast('Informações atualizadas com sucesso!', 'success');
      this.fecharModal();

      if (this.viewAtual === 'detalhe') {
        await this.carregarDetalhe(equipId);
      } else {
        await this.carregarPainel();
      }
    } catch (err) {
      console.error(err);
      this.toast(err.message || 'Erro ao salvar informações', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg> Salvar Alterações`;
      }
    }
  },

  // Modal: alterar estado
  abrirModalEstado(equipId) {
    const eq = this.equipSelecionado;
    const estadoAtual = eq ? eq.estado : '';

    const optsHtml = ESTADOS_GRUPOS_UI.map(grupo => `
      <div style="margin-bottom:.75rem">
        <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:.35rem">${grupo.label}</div>
        <div class="estado-opts">
          ${grupo.estados.map(e => `
          <button class="estado-opt ${estadoAtual === e ? 'selected' : ''}" onclick="App._selecionarEstado('${e}', this)">
            <div class="estado-opt-dot" style="background:${GRUPOS_ESTADO.em_andamento.includes(e) ? 'var(--c-blue)' : GRUPOS_ESTADO.aguardando.includes(e) ? 'var(--c-amber)' : e === 'pronto' ? 'var(--c-green)' : 'var(--text-muted)'}"></div>
            ${LABEL_ESTADO_FULL[e] || e}
          </button>`).join('')}
        </div>
      </div>
    `).join('');

    this.abrirModal('Alterar Estado do Equipamento', `
      <div class="estado-select-wrap">
        ${optsHtml}
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Motivo / Observação (opcional)</label>
          <input type="text" id="m-estado-motivo" class="inline-input" style="width:100%" placeholder="Ex: Aguardando peça importada do fornecedor XYZ" value="${escapar(eq ? eq.estado_motivo : '')}">
        </div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:.25rem">
          <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="App.salvarEstado(${equipId})">Salvar estado</button>
        </div>
      </div>
    `);
    this._estadoSelecionado = estadoAtual;
  },

  _selecionarEstado(estado, btn) {
    document.querySelectorAll('.estado-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this._estadoSelecionado = estado;
  },

  async salvarEstado(equipId) {
    const estado = this._estadoSelecionado;
    const motivo = $id('m-estado-motivo') ? $id('m-estado-motivo').value.trim() : '';
    if (!estado) return this.toast('Selecione um estado', 'error');

    try {
      const r = await fetch(`${API}/${equipId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, motivo, usuario: 'Chefe de Oficina' })
      });
      const j = await r.json();
      if (j.success) {
        this.fecharModal();
        this.toast('Estado atualizado!', 'success');
        this.carregarDetalhe(equipId);
      }
    } catch (e) { this.toast('Erro ao salvar estado', 'error'); }
  },

  // Modal: localização
  abrirModalLocalizacao(equipId, localAtual) {
    const baias = ['Baia 01','Baia 02','Baia 03','Baia 04','Setor de Usinagem','Setor de Solda','Testes Hidráulicos','Pátio Externo'];
    const opts = baias.map(b => `<option value="${b}" ${localAtual === b ? 'selected' : ''}>${b}</option>`).join('');
    this.abrirModal('Mover Equipamento', `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Nova localização</label>
          <select id="m-localizacao" class="inline-input" style="width:100%">${opts}</select>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem">
          <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="App.salvarLocalizacao(${equipId})">Mover</button>
        </div>
      </div>
    `);
  },

  async salvarLocalizacao(equipId) {
    const localizacao = $id('m-localizacao').value;
    try {
      const r = await fetch(`${API}/${equipId}/localizacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localizacao, usuario: 'Chefe de Oficina' })
      });
      const j = await r.json();
      if (j.success) { this.fecharModal(); this.toast(`Movido para ${localizacao}`, 'success'); this.carregarDetalhe(equipId); }
    } catch (e) { this.toast('Erro', 'error'); }
  },

  // Modal: novo serviço
  abrirModalNovoServico(equipId) {
    this.abrirModal('Adicionar Serviço', `
      <div style="display:flex;flex-direction:column;gap:.75rem">
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Título do serviço *</label>
          <input type="text" id="m-srv-titulo" class="inline-input" style="width:100%" placeholder="Ex: Reparo hidráulico — cilindro da lança">
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Descrição / Observação</label>
          <textarea id="m-srv-desc" class="inline-input" style="width:100%;height:80px;resize:vertical" placeholder="Detalhes do serviço, o que foi identificado..."></textarea>
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Responsável técnico</label>
          <input type="text" id="m-srv-resp" class="inline-input" style="width:100%" placeholder="Ex: João Silva — Mecânico">
        </div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem">
          <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="App.salvarNovoServico(${equipId})">Adicionar serviço</button>
        </div>
      </div>
    `);
    setTimeout(() => { const el = $id('m-srv-titulo'); if (el) el.focus(); }, 50);
  },

  async salvarNovoServico(equipId) {
    const titulo     = $id('m-srv-titulo') ? $id('m-srv-titulo').value.trim() : '';
    const descricao  = $id('m-srv-desc')   ? $id('m-srv-desc').value.trim()   : '';
    const responsavel= $id('m-srv-resp')   ? $id('m-srv-resp').value.trim()   : '';
    if (!titulo) return this.toast('Informe o título do serviço', 'error');

    try {
      const r = await fetch(`${API}/${equipId}/servicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, responsavel })
      });
      const j = await r.json();
      if (j.success) { this.fecharModal(); this.toast('Serviço adicionado!', 'success'); this.carregarDetalhe(equipId); }
    } catch (e) { this.toast('Erro ao salvar serviço', 'error'); }
  },

  // Modal: nova atividade
  abrirModalNovaAtividade(equipId, srvId) {
    this.abrirModal('Adicionar Atividade', `
      <div style="display:flex;flex-direction:column;gap:.75rem">
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Descrição da atividade *</label>
          <input type="text" id="m-atv-desc" class="inline-input" style="width:100%" placeholder="Ex: Substituir kit de vedação do cilindro">
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Responsável</label>
          <input type="text" id="m-atv-resp" class="inline-input" style="width:100%" placeholder="Ex: Carlos Eduardo">
        </div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem">
          <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="App.salvarNovaAtividade(${equipId}, ${srvId})">Adicionar</button>
        </div>
      </div>
    `);
    setTimeout(() => { const el = $id('m-atv-desc'); if (el) el.focus(); }, 50);
  },

  async salvarNovaAtividade(equipId, srvId) {
    const descricao  = $id('m-atv-desc') ? $id('m-atv-desc').value.trim() : '';
    const responsavel= $id('m-atv-resp') ? $id('m-atv-resp').value.trim() : '';
    if (!descricao) return this.toast('Informe a descrição', 'error');

    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}/atividades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, responsavel })
      });
      const j = await r.json();
      if (j.success) { this.fecharModal(); this.toast('Atividade adicionada!', 'success'); this.carregarDetalhe(equipId); }
    } catch (e) { this.toast('Erro ao salvar atividade', 'error'); }
  },

  // Modal: atualizar atividade
  abrirModalAtualizarAtividade(equipId, srvId, atvId) {
    const eq  = this.equipSelecionado;
    const srv = eq ? (eq.servicos || []).find(s => s.id === srvId) : null;
    const atv = srv ? (srv.atividades || []).find(a => a.id === atvId) : null;
    if (!atv) return;

    const estadosAtv = [
      { v:'pendente',     l:'Pendente' },
      { v:'em_andamento', l:'Em andamento' },
      { v:'concluida',    l:'Concluída' },
      { v:'bloqueada',    l:'Bloqueada' }
    ];

    const optsEstado = estadosAtv.map(e => `<option value="${e.v}" ${atv.estado === e.v ? 'selected' : ''}>${e.l}</option>`).join('');

    this.abrirModal('Atualizar Atividade', `
      <div style="display:flex;flex-direction:column;gap:.75rem">
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Descrição</label>
          <input type="text" id="m-upd-desc" class="inline-input" style="width:100%" value="${escapar(atv.descricao)}">
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Estado</label>
          <select id="m-upd-estado" class="inline-input" style="width:100%">${optsEstado}</select>
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Responsável</label>
          <input type="text" id="m-upd-resp" class="inline-input" style="width:100%" value="${escapar(atv.responsavel || '')}">
        </div>
        <div>
          <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Motivo / Nota</label>
          <input type="text" id="m-upd-motivo" class="inline-input" style="width:100%" placeholder="Ex: Peça solicitada, aguardando entrega" value="${escapar(atv.estado_motivo || '')}">
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.5rem;gap:.5rem">
          <button class="btn btn-ghost-danger" onclick="App.excluirAtividade(${equipId}, ${srvId}, ${atvId}, '${escapar(atv.descricao)}')">Remover Atividade</button>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="App.salvarAtualizacaoAtividade(${equipId}, ${srvId}, ${atvId})">Salvar</button>
          </div>
        </div>
      </div>
    `);
  },

  async salvarAtualizacaoAtividade(equipId, srvId, atvId) {
    const payload = {
      descricao:   $id('m-upd-desc')   ? $id('m-upd-desc').value.trim()   : undefined,
      estado:      $id('m-upd-estado') ? $id('m-upd-estado').value        : undefined,
      responsavel: $id('m-upd-resp')   ? $id('m-upd-resp').value.trim()   : undefined,
      estado_motivo: $id('m-upd-motivo') ? $id('m-upd-motivo').value.trim() : undefined,
      usuario: 'Chefe de Oficina'
    };
    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}/atividades/${atvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.success) { this.fecharModal(); this.toast('Atividade atualizada!', 'success'); this.carregarDetalhe(equipId); }
    } catch (e) { this.toast('Erro ao salvar', 'error'); }
  },

  // ── Modal: Alterar Estado de Serviço Específico ───────────────────
  abrirModalEstadoServico(equipId, srvId) {
    const eq = this.equipSelecionado;
    const srv = eq ? (eq.servicos || []).find(s => s.id === srvId) : null;
    if (!srv) return;

    const estadosServico = [
      { v: 'em_execucao',          l: 'Em execução',               cor: 'var(--c-blue)' },
      { v: 'em_diagnostico',       l: 'Em diagnóstico / Sob análise', cor: 'var(--c-cyan)' },
      { v: 'aguardando_peca',      l: 'Aguardando peça',          cor: 'var(--c-amber)' },
      { v: 'aguardando_material',  l: 'Aguardando material',      cor: 'var(--c-orange)' },
      { v: 'aguardando_aprovacao', l: 'Aguardando aprovação',     cor: 'var(--c-violet)' },
      { v: 'concluida',            l: 'Concluído',                cor: 'var(--c-green)' }
    ];

    const optsHtml = `
      <div style="margin-bottom:1rem">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:.5rem">Selecione o estado para este serviço:</div>
        <div class="estado-opts" style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          ${estadosServico.map(e => `
          <button class="estado-opt ${srv.estado === e.v ? 'selected' : ''}" onclick="App._selecionarEstadoServico('${e.v}', this)">
            <div class="estado-opt-dot" style="background:${e.cor}"></div>
            ${e.l}
          </button>`).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Motivo / Observação do serviço (opcional)</label>
        <input type="text" id="m-srv-motivo" class="inline-input" style="width:100%" placeholder="Ex: Aguardando chegada do kit de vedação ou aprovação do cliente" value="${escapar(srv.estado_motivo || '')}">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem">
        <button class="btn btn-ghost" onclick="App.fecharModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.salvarEstadoServico(${equipId}, ${srvId})">Salvar estado do serviço</button>
      </div>
    `;

    this.abrirModal(`Estado do Serviço: ${escapar(srv.titulo)}`, optsHtml);
    this._estadoServicoSelecionado = srv.estado;
  },

  _selecionarEstadoServico(estado, btn) {
    document.querySelectorAll('.estado-opts .estado-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this._estadoServicoSelecionado = estado;
  },

  async salvarEstadoServico(equipId, srvId) {
    const estado = this._estadoServicoSelecionado;
    const motivo = $id('m-srv-motivo') ? $id('m-srv-motivo').value.trim() : '';
    if (!estado) return this.toast('Selecione um estado', 'error');

    try {
      const r = await fetch(`${API}/${equipId}/servicos/${srvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, estado_motivo: motivo, usuario: 'Chefe de Oficina' })
      });
      const j = await r.json();
      if (j.success) {
        this.fecharModal();
        this.toast('Estado do serviço atualizado com sucesso!', 'success');
        this.carregarDetalhe(equipId);
      } else {
        this.toast(j.message || 'Erro ao salvar estado', 'error');
      }
    } catch (e) {
      this.toast('Erro ao atualizar estado do serviço', 'error');
    }
  },

  // ── Chat & Backlog Operacional ───────────────────────────────────
  _renderChatSecao(eq) {
    const chatItems = eq.chat || eq.dossie || [];
    const servicos = eq.servicos || [];

    const itemsHtml = chatItems.map(m => {
      const isFoto = m.midia_tipo === 'foto' || (m.foto && !m.midia_tipo);
      const isVideo = m.midia_tipo === 'video';
      const midiaUrl = m.midia_url || m.foto || '';

      return `
      <div class="chat-msg-item" id="chat-msg-${m.id}">
        <div class="chat-msg-avatar">${iniciais(m.autor)}</div>
        <div class="chat-msg-body">
          <div class="chat-msg-header">
            <span class="chat-msg-autor">${escapar(m.autor || 'Chefe de Oficina')}</span>
            <span class="chat-msg-data">${formatarDataBR(m.data)}</span>
            ${m.servico_titulo ? `<span class="chat-srv-badge">${renderIcon('wrench')} ${escapar(m.servico_titulo)}</span>` : ''}
            <button class="btn-icon btn-danger-hover chat-del-btn" onclick="App.excluirMensagemChat(${eq.id}, ${m.id})" title="Excluir este registro" aria-label="Excluir registro">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          ${m.texto ? `<div class="chat-msg-texto">${escapar(m.texto).replace(/\n/g, '<br>')}</div>` : ''}
          ${isFoto && midiaUrl ? `
            <div class="chat-media-foto-wrap" onclick="App.abrirLightbox('${midiaUrl}', '${escapar(m.texto || m.midia_nome || 'Foto de evidência')}')" title="Clique para ampliar">
              <img src="${midiaUrl}" alt="Evidência fotográfica" class="chat-media-foto" loading="lazy">
              <div class="chat-foto-zoom-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                Ampliar foto
              </div>
            </div>` : ''}
          ${isVideo && midiaUrl ? `
            <div class="chat-media-video-wrap">
              <video src="${midiaUrl}" controls preload="metadata" playsinline class="chat-media-video"></video>
              <div class="chat-video-caption">${renderIcon('video')} ${escapar(m.midia_nome || 'Vídeo de evidência operacional')}</div>
            </div>` : ''}
        </div>
      </div>`;
    }).join('');

    const servicosOptions = servicos.map(s => `<option value="${s.id}">${escapar(s.titulo)}</option>`).join('');

    return `
    <div class="detalhe-section chat-section">
      <div class="section-head">
        <span class="section-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat & Backlog Operacional
          <span class="chat-count-pill">${chatItems.length} registros</span>
        </span>
        <div style="font-size:.76rem;color:var(--text-muted)">Mural de notas, fotos e vídeos de diagnóstico</div>
      </div>

      <!-- Feed do Chat -->
      <div class="chat-feed" id="chat-feed">
        ${itemsHtml || `
          <div class="chat-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>Nenhuma mensagem ou evidência registrada ainda.<br>Use a barra abaixo para enviar notas técnicas, fotos ou vídeos de testes e diagnóstico.</p>
          </div>`}
      </div>

      <!-- Barra de Envio / Composer -->
      <div class="chat-composer">
        <div class="chat-composer-meta">
          <div class="chat-composer-field">
            <label for="chat-autor">Autor:</label>
            <select id="chat-autor" class="chat-select">
              <option value="Chefe de Oficina" selected>Chefe de Oficina</option>
              ${eq.responsavel_tecnico ? `<option value="${escapar(eq.responsavel_tecnico)}">${escapar(eq.responsavel_tecnico)} (Técnico)</option>` : ''}
              ${eq.responsavel_cliente ? `<option value="${escapar(eq.responsavel_cliente)}">${escapar(eq.responsavel_cliente)} (Cliente)</option>` : ''}
              <option value="Mecânico Responsável">Mecânico Responsável</option>
              <option value="Torneiro / Usinagem">Torneiro / Usinagem</option>
              <option value="Soldador">Soldador</option>
            </select>
          </div>
          <div class="chat-composer-field">
            <label for="chat-servico-id">Vincular ao serviço:</label>
            <select id="chat-servico-id" class="chat-select">
              <option value="">Geral (Todo o equipamento)</option>
              ${servicosOptions}
            </select>
          </div>
        </div>

        <div class="chat-composer-main">
          <textarea id="chat-input-texto" class="chat-textarea" rows="2" placeholder="Digite uma nota técnica, relato do serviço ou observação importante..."></textarea>
        </div>

        <div id="chat-file-preview" class="chat-file-preview" style="display:none">
          <div class="chat-file-preview-inner">
            <span id="chat-file-icon">${renderIcon('clip')}</span>
            <span id="chat-file-name" class="chat-file-name">arquivo</span>
            <span id="chat-file-size" class="chat-file-size">(0 KB)</span>
            <button type="button" class="chat-file-remove" onclick="App.removerArquivoChat()" title="Remover anexo">&times;</button>
          </div>
        </div>

        <div class="chat-composer-actions">
          <input type="file" id="chat-input-midia" style="display:none" onchange="App.onArquivoMidiaSelecionado(event)">
          <div style="display:flex;gap:.4rem">
            <button type="button" class="btn btn-sm btn-ghost" onclick="App.acionarUploadMidia('image/*')" title="Anexar foto do dispositivo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Foto
            </button>
            <button type="button" class="btn btn-sm btn-ghost" onclick="App.acionarUploadMidia('video/*')" title="Anexar vídeo (vazamentos, ruídos, testes)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              Vídeo
            </button>
          </div>
          <button type="button" class="btn btn-primary" id="btn-chat-enviar" onclick="App.enviarMensagemChat(${eq.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Publicar
          </button>
        </div>
      </div>
    </div>`;
  },

  acionarUploadMidia(acceptTypes) {
    const fileInput = $id('chat-input-midia');
    if (!fileInput) return;
    fileInput.accept = acceptTypes;
    fileInput.click();
  },

  onArquivoMidiaSelecionado(e) {
    const file = e.target.files && e.target.files[0];
    const previewWrap = $id('chat-file-preview');
    if (!file) {
      if (previewWrap) previewWrap.style.display = 'none';
      return;
    }

    const nameEl = $id('chat-file-name');
    const sizeEl = $id('chat-file-size');
    const iconEl = $id('chat-file-icon');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) {
      const kb = Math.round(file.size / 1024);
      sizeEl.textContent = kb > 1024 ? `(${Math.round(kb/1024 * 10)/10} MB)` : `(${kb} KB)`;
    }
    if (iconEl) {
      iconEl.innerHTML = file.type.startsWith('video/') ? renderIcon('video') : renderIcon('camera');
    }
    if (previewWrap) previewWrap.style.display = 'block';
  },

  removerArquivoChat() {
    const fileInput = $id('chat-input-midia');
    if (fileInput) fileInput.value = '';
    const previewWrap = $id('chat-file-preview');
    if (previewWrap) previewWrap.style.display = 'none';
  },

  async enviarMensagemChat(equipId) {
    const textoEl = $id('chat-input-texto');
    const autorEl = $id('chat-autor');
    const srvEl = $id('chat-servico-id');
    const fileInput = $id('chat-input-midia');
    const btnEnviar = $id('btn-chat-enviar');

    const texto = textoEl ? textoEl.value.trim() : '';
    const autor = autorEl ? autorEl.value : 'Chefe de Oficina';
    const servicoId = srvEl ? srvEl.value : '';
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!texto && !file) {
      return this.toast('Digite uma mensagem ou anexe uma foto/vídeo', 'error');
    }

    const formData = new FormData();
    formData.append('autor', autor);
    if (texto) formData.append('texto', texto);
    if (servicoId) formData.append('servico_id', servicoId);
    if (file) formData.append('midia', file);

    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando...';
    }

    try {
      const r = await fetch(`${API}/${equipId}/chat`, {
        method: 'POST',
        body: formData
      });
      const j = await r.json();
      if (j.success) {
        this.toast('Registro publicado com sucesso!', 'success');
        this.removerArquivoChat();
        if (textoEl) textoEl.value = '';
        this.carregarDetalhe(equipId);
      } else {
        this.toast(j.message || 'Erro ao publicar registro', 'error');
      }
    } catch (err) {
      console.error(err);
      this.toast('Erro ao enviar registro para o servidor', 'error');
    } finally {
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publicar`;
      }
    }
  },

  async excluirMensagemChat(equipId, msgId) {
    if (!confirm('Deseja realmente remover este registro do mural?')) return;
    try {
      const r = await fetch(`${API}/${equipId}/chat/${msgId}`, {
        method: 'DELETE'
      });
      const j = await r.json();
      if (j.success) {
        this.toast('Registro excluído', 'success');
        this.carregarDetalhe(equipId);
      } else {
        this.toast(j.message || 'Erro ao excluir', 'error');
      }
    } catch (e) {
      this.toast('Erro ao excluir mensagem', 'error');
    }
  },

  // Modal Lightbox para ampliação de fotos
  abrirLightbox(url, caption) {
    const overlay = $id('lightbox-overlay');
    const img = $id('lightbox-img');
    const cap = $id('lightbox-caption');
    if (!overlay || !img) return;

    img.src = url;
    if (cap) cap.textContent = caption || '';
    overlay.style.display = 'flex';
  },

  fecharLightbox(e) {
    if (e && e.target && (e.target.id === 'lightbox-img' || e.target.closest('#lightbox-img'))) return;
    const overlay = $id('lightbox-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  // Modal: nota rápida (compatibilidade)
  abrirModalNota(equipId) {
    this.navegar('detalhe', equipId);
    setTimeout(() => {
      const inp = $id('chat-input-texto');
      if (inp) {
        inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inp.focus();
      }
    }, 150);
  },

  async salvarNota(equipId) {
    this.enviarMensagemChat(equipId);
  },

  // ── Form novo atendimento ────────────────────────────────────────
  configurarFormNovo() {
    const form = $id('form-novo');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $id('btn-salvar-novo');
      if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

      const dados = Object.fromEntries(new FormData(form).entries());
      if (!dados.equipamento && !dados.empresa) {
        this.toast('Informe ao menos o equipamento ou a empresa', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Registrar Entrada`; }
        return;
      }

      try {
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });
        const j = await r.json();
        if (j.success) {
          this.toast('Atendimento iniciado!', 'success');
          form.reset();
          this.navegar('detalhe', j.data.id);
        } else {
          this.toast(j.message || 'Erro ao salvar', 'error');
        }
      } catch (err) {
        this.toast('Erro de conexão com o servidor', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Registrar Entrada`; }
      }
    });
  },

  toggleSection(fsId) {
    const fs = $id(fsId);
    if (!fs) return;
    const body = fs.querySelector('.section-body');
    const leg  = fs.querySelector('.legend-toggle');
    if (!body) return;
    const aberto = body.style.display !== 'none';
    body.style.display = aberto ? 'none' : 'block';
    if (leg) leg.classList.toggle('open', !aberto);
  },

  // ── MODO TV ──────────────────────────────────────────────────────
  abrirModoTv() {
    this.tvAtivo = true;
    const overlay = $id('tv-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.removeAttribute('aria-hidden');
    }
    if (!window.location.hash || window.location.hash !== '#tv') {
      history.pushState(null, '', '#tv');
    }

    // Detecção automática da escala ideal para a resolução da tela
    const savedCustom = localStorage.getItem('jbc_tv_zoom_custom') === 'true';
    const savedZoom = localStorage.getItem('jbc_tv_zoom');
    if (savedCustom && savedZoom !== null) {
      const idx = parseInt(savedZoom, 10);
      if (!isNaN(idx) && idx >= 0 && idx < this.tvZoomLevels.length) {
        this.tvZoomIndex = idx;
      }
    } else {
      this.detectarZoomIdealTela();
    }
    this.aplicarZoomTv();

    const mode = this.tvViewMode || 'grid';
    const btnGrid = $id('tv-btn-mode-grid');
    const btnTable = $id('tv-btn-mode-table');
    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');

    this.carregarTv();
    this.tvPollingInterval = setInterval(() => this.carregarTv(), 20000);
    this.iniciarTvAutoScroll();
  },

  detectarZoomIdealTela() {
    const h = window.innerHeight;
    const w = window.innerWidth;
    // Seleciona escala ideal no array: [0.65, 0.8, 0.95, 1.1, 1.25, 1.5, 1.85]
    if (h <= 650 || w <= 1024) {
      this.tvZoomIndex = 0; // 65% (Notebooks compactos, tablets, telas pequenas)
    } else if (h <= 780 || w <= 1366) {
      this.tvZoomIndex = 1; // 80% (Notebook padrão 1366x768 ou 1080p com escala 150%)
    } else if (h <= 920 || w <= 1600) {
      this.tvZoomIndex = 2; // 95% (Notebook 1080p com escala 125% ou monitores intermediários)
    } else if (h <= 1100) {
      this.tvZoomIndex = 3; // 110% (Monitores Full HD 1080p nativo)
    } else if (h <= 1450) {
      this.tvZoomIndex = 4; // 125% (Monitores 2K e TVs 1080p grandes)
    } else {
      this.tvZoomIndex = 5; // 150% (TVs 4K ultra-wide)
    }
  },

  sairModoTv() {
    this.tvAtivo = false;
    const overlay = $id('tv-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (this.tvPollingInterval) clearInterval(this.tvPollingInterval);
    this.pararTvAutoScroll();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    history.pushState(null, '', ' ');
    this.carregarPainel();
  },

  aplicarZoomTv() {
    const scale = this.tvZoomLevels[this.tvZoomIndex] || 1.0;
    const setScale = (id) => {
      const el = $id(id);
      if (el) el.style.setProperty('--tv-scale', scale);
    };
    setScale('tv-overlay');
    setScale('tv-table-wrap');
    setScale('tv-grid-wrap');
    setScale('tv-panorama-grid');
    setScale('tv-slides-viewport');
    setScale('tv-machines-grid');
    setScale('tv-slide-pane-detalhes');
    setScale('tv-slide-pane-table');

    const label = $id('tv-zoom-label');
    if (label) {
      label.textContent = `${Math.round(scale * 100)}%`;
    }
    localStorage.setItem('jbc_tv_zoom', this.tvZoomIndex);
  },

  alterarZoomTv(delta) {
    this.tvZoomIndex = Math.max(0, Math.min(this.tvZoomLevels.length - 1, this.tvZoomIndex + delta));
    localStorage.setItem('jbc_tv_zoom_custom', 'true');
    this.aplicarZoomTv();
  },

  ajustarResponsividadeMain() {
    const mainEl = document.querySelector('.main-content');
    if (!mainEl) return;
    // O painel desktop/padrão tem rolagem normal; apenas o Modo TV é estritamente zero-scroll
    mainEl.style.height = '';
    mainEl.style.maxHeight = '';
    mainEl.style.overflow = '';
    mainEl.style.display = '';
    mainEl.style.flexDirection = '';
    const viewPainel = $id('view-painel');
    if (viewPainel) {
      viewPainel.style.height = '';
      viewPainel.style.overflow = '';
      viewPainel.style.display = '';
      viewPainel.style.flexDirection = '';
    }
  },

  toggleTvFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },

  toggleTvAutoScroll() {
    this.tvAutoScrollAtivo = !this.tvAutoScrollAtivo;
    const btn = $id('tv-btn-autoscroll');
    const icon = $id('tv-scroll-icon');
    const text = $id('tv-scroll-text');

    if (this.tvAutoScrollAtivo) {
      if (btn) btn.classList.remove('paused');
      if (icon) icon.innerHTML = renderIcon('pause');
      if (text) text.textContent = 'Rolagem';
      this.iniciarTvAutoScroll();
    } else {
      if (btn) btn.classList.add('paused');
      if (icon) icon.innerHTML = renderIcon('play');
      if (text) text.textContent = 'Pausado';
      this.pararTvAutoScroll();
    }
  },

  iniciarTvAutoScroll() {
    this.pararTvAutoScroll();
    if (!this.tvAutoScrollAtivo) return;

    let pausa = 0;
    let descendo = true;

    this.tvScrollTimer = setInterval(() => {
      if (!this.tvAtivo || !this.tvAutoScrollAtivo) return;
      const wrap = this.tvViewMode === 'grid' ? $id('tv-grid-wrap') : $id('tv-table-wrap');
      if (!wrap) return;

      const maxScroll = wrap.scrollHeight - wrap.clientHeight;
      if (maxScroll <= 15) return; // Zero-Scroll Perfeito: todo o conteúdo já cabe na tela da TV sem rolagem

      if (pausa > 0) {
        pausa--;
        return;
      }

      if (descendo) {
        wrap.scrollTop += 1.2;
        if (wrap.scrollTop >= maxScroll - 2) {
          descendo = false;
          pausa = 120; // Pausa 4.8 segundos no fim da lista para leitura
        }
      } else {
        wrap.scrollTop -= 4; // Retorno suave ao topo
        if (wrap.scrollTop <= 2) {
          wrap.scrollTop = 0;
          descendo = true;
          pausa = 80; // Pausa 3.2 segundos no início
        }
      }
    }, 40);
  },

  pararTvAutoScroll() {
    if (this.tvScrollTimer) {
      clearInterval(this.tvScrollTimer);
      this.tvScrollTimer = null;
    }
  },

  async carregarTv() {
    try {
      const r = await fetch('/api/jbc/v1/painel/tv');
      const j = await r.json();
      if (!j.success) return;
      this.renderizarTv(j);
    } catch (e) {
      console.error('[TV] Erro ao carregar dados:', e);
    }
  },

  renderizarTv(dados) {
    const totais = dados.totais || {};
    const eq     = dados.equipamentos || [];
    this._equipamentos = eq;

    // KPIs principais em alta visibilidade
    const setKpi = (id, v) => {
      const el = $id(id);
      if (el) {
        const numEl = el.querySelector('.tv-kpi-num');
        if (numEl) numEl.textContent = v;
      }
    };
    setKpi('tv-kpi-patio',      totais.total_patio  || 0);
    setKpi('tv-kpi-andamento',  totais.em_andamento || 0);
    setKpi('tv-kpi-aguardando', totais.aguardando   || 0);
    setKpi('tv-kpi-prontos',    totais.prontos      || 0);
    setKpi('tv-kpi-atrasados',  totais.atrasados    || 0);
    setKpi('tv-kpi-entregues',  totais.entregues    || 0);

    // Renderiza o Panorama Geral no modo selecionado (Grid Baias ou Tabela Auto-Fit)
    this.renderizarTvPanoramaConteudo(eq);

    // Radar Ticker no Rodapé
    const tickerEl = $id('tv-ticker-content');
    if (tickerEl && eq.length > 0) {
      const partes = eq.map(e => {
        const motivo = e.estado_motivo ? ` (${e.estado_motivo})` : '';
        const atv = e.atividade_atual ? ` · ${renderIcon('wrench')} ${e.atividade_atual}` : '';
        const prio = e.prioridade === 'Urgente' ? ' [URGENTE]' : '';
        return `<strong>${escapar(e.tag)}</strong> [${escapar(e.empresa)}] · ${escapar(LABEL_ESTADO[e.estado] || e.estado)}${motivo}${atv}${prio}`;
      });
      tickerEl.innerHTML = partes.join('&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    // Indicador de atualização com hora e minuto
    const updLabel = $id('tv-update-label');
    if (updLabel) {
      const now = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      updLabel.textContent = `Sincronizado às ${now}`;
    }

    const slideAntes = this.slideAtual;
    this.gerarEstruturaSlides();
    if (slideAntes > 0 && slideAntes < this.slides.length) {
      this.slideAtual = slideAntes;
    }
    this.exibirSlideAtual();
    this.iniciarLoopSlides();
  },

  setTvViewMode(mode) {
    if (mode !== 'grid' && mode !== 'table') mode = 'grid';
    this.tvViewMode = mode;
    localStorage.setItem('jbc_tv_view_mode', mode);

    const btnGrid = $id('tv-btn-mode-grid');
    const btnTable = $id('tv-btn-mode-table');
    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');

    const gridWrap = $id('tv-grid-wrap');
    const tableWrap = $id('tv-table-wrap');
    if (gridWrap) gridWrap.style.display = mode === 'grid' ? 'flex' : 'none';
    if (tableWrap) tableWrap.style.display = mode === 'table' ? 'flex' : 'none';

    // Re-renderizar o conteúdo atual do slide
    const slide = this.slides && this.slides[this.slideAtual];
    const lista = (slide && slide.itens) ? slide.itens : (this._equipamentos || []).filter(e => e.estado !== 'entregue');
    this.renderizarTvPanoramaConteudo(lista);
    this.aplicarZoomTv();
  },

  calcularGridDimensoes(totalItens) {
    if (totalItens <= 2) return { cols: 1, rows: totalItens };
    if (totalItens <= 4) return { cols: 2, rows: 2 };
    if (totalItens <= 6) return { cols: 2, rows: 3 };
    if (totalItens <= 8) return { cols: 2, rows: 4 };
    if (totalItens <= 10) return { cols: 2, rows: 5 };
    if (totalItens <= 12) return { cols: 3, rows: 4 };
    return { cols: 4, rows: Math.ceil(totalItens / 4) };
  },

  renderizarTvPanoramaConteudo(itens) {
    const lista = itens || (this._equipamentos || []).filter(e => e.estado !== 'entregue');
    const mode = this.tvViewMode || 'grid';

    const btnGrid = $id('tv-btn-mode-grid');
    const btnTable = $id('tv-btn-mode-table');
    if (btnGrid) btnGrid.classList.toggle('active', mode === 'grid');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');

    const gridWrap = $id('tv-grid-wrap');
    const tableWrap = $id('tv-table-wrap');
    if (gridWrap) gridWrap.style.display = mode === 'grid' ? 'flex' : 'none';
    if (tableWrap) tableWrap.style.display = mode === 'table' ? 'flex' : 'none';

    if (mode === 'grid') {
      const grid = $id('tv-panorama-grid');
      if (grid) {
        if (lista.length === 0) {
          grid.style.display = 'flex';
          grid.innerHTML = `<div class="empty-state" style="padding:3rem"><p>Nenhum equipamento alocado no pátio no momento.</p></div>`;
        } else {
          grid.style.display = 'grid';
          const dims = this.calcularGridDimensoes(lista.length);
          grid.style.gridTemplateColumns = `repeat(${dims.cols}, 1fr)`;
          grid.style.gridTemplateRows = `repeat(${dims.rows}, minmax(0, 1fr))`;
          grid.innerHTML = lista.map(e => this._renderTvGridCard(e)).join('');
        }
      }
    } else {
      const tbody = $id('tv-table-body');
      if (tbody) {
        if (lista.length === 0) {
          tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#94a3b8">Nenhum equipamento alocado no pátio.</td></tr>`;
        } else {
          const isCompact = lista.length >= 5;
          tbody.innerHTML = lista.map(e => this._renderTvLinha(e, isCompact)).join('');
        }
      }
    }
  },

  _renderTvGridCard(eq) {
    const estadoClass = tvClasseEstado(eq.estado, eq.atrasado);
    const estadoLabel = eq.atrasado ? 'ATRASADO' : (LABEL_ESTADO[eq.estado] || eq.estado);
    const progresso   = eq.progresso || 0;
    const prio        = eq.prioridade === 'Urgente'
      ? `<span class="tv-grid-prio urgente">URGENTE</span>`
      : eq.prioridade === 'Alta'
      ? `<span class="tv-grid-prio alta">ALTA</span>`
      : '';

    const responsavel = eq.responsavel_atual || eq.responsavel_tecnico || 'Equipe técnica';
    const localizacao = eq.localizacao || 'Pátio';
    const numOs       = eq.num_os ? `OS ${eq.num_os}` : (eq.numero || '');
    const extraInfo   = [eq.placa, eq.horimetro, eq.km].filter(Boolean).join(' · ');

    const srvLista = eq.servicos_lista || [];
    const servicosHtml = srvLista.length === 0
      ? `<div class="tv-grid-srv-pill neutro">${renderIcon('wrench')} <span>${escapar(eq.queixa_inicial || 'Em atendimento')}</span></div>`
      : srvLista.map(s => {
          const sCls = tvClasseEstado(s.estado, false);
          const sLbl = LABEL_ESTADO[s.estado] || s.estado;
          const sProg = s.progresso !== undefined ? ` · ${s.progresso}%` : '';
          return `
            <div class="tv-grid-srv-pill ${sCls}" title="${escapar(s.titulo)} (${sLbl})">
              <span class="tv-grid-srv-dot"></span>
              <span class="tv-grid-srv-name">${escapar(s.titulo)}</span>
              <span class="tv-grid-srv-badge">${sLbl}${sProg}</span>
              ${s.responsavel ? `<span class="tv-grid-srv-tec">${escapar(s.responsavel)}</span>` : ''}
            </div>`;
        }).join('');

    return `
    <div class="tv-grid-card ${estadoClass} ${eq.atrasado ? 'atrasado' : ''}" onclick="App.abrirDetalheFromTv(${eq.id})" title="Clique para abrir detalhes de ${escapar(eq.tag)}">
      <!-- Card Top: Tag + OS + Prioridade | Baia + Status -->
      <div class="tv-grid-card-head">
        <div class="tv-grid-card-tag-row">
          <span class="tv-grid-tag">${escapar(eq.tag)}</span>
          ${numOs ? `<span class="tv-grid-os">${escapar(numOs)}</span>` : ''}
          ${prio}
        </div>
        <div class="tv-grid-card-badges">
          <span class="tv-grid-local">
            ${renderIcon('pin')}
            <span>${escapar(localizacao)}</span>
          </span>
          <div class="tv-grid-status ${estadoClass}">
            <span class="tv-grid-status-dot"></span>
            <span>${estadoLabel}</span>
          </div>
        </div>
      </div>

      <!-- Card Middle: Equipamento + Cliente + Serviços -->
      <div class="tv-grid-card-body">
        <div class="tv-grid-mch-meta">
          <div class="tv-grid-mch-title">
            <span class="tv-grid-mch-name">${escapar(eq.equipamento)}</span>
            ${extraInfo ? `<span class="tv-grid-mch-extra">${escapar(extraInfo)}</span>` : ''}
          </div>
          <div class="tv-grid-client-row">
            <span class="tv-grid-client">${escapar(eq.empresa)}</span>
            <span class="tv-grid-tech">${renderIcon('wrench')} ${escapar(responsavel)}</span>
          </div>
        </div>

        <div class="tv-grid-services-row">
          ${servicosHtml}
        </div>
      </div>

      <!-- Card Bottom: Barra de Progresso + % + Atualização -->
      <div class="tv-grid-card-foot">
        <div class="tv-grid-prog-wrap">
          <div class="tv-grid-prog-bar">
            <div class="tv-grid-prog-fill" style="width:${progresso}%"></div>
          </div>
          <span class="tv-grid-prog-pct">${progresso}%</span>
        </div>
        <span class="tv-grid-time">
          ${renderIcon('clock')} ${eq.ultima_atualizacao_label || '—'}
        </span>
      </div>
    </div>`;
  },

  _renderTvLinha(eq, isCompact = false) {
    const estadoClass = tvClasseEstado(eq.estado, eq.atrasado);
    const estadoLabel = eq.atrasado ? 'ATRASADO' : (LABEL_ESTADO[eq.estado] || eq.estado);
    const progresso   = eq.progresso || 0;
    const prio        = eq.prioridade === 'Urgente'
      ? `<span class="tv-prio-badge tv-prio-urgente">Urgente</span>`
      : eq.prioridade === 'Alta'
      ? `<span class="tv-prio-badge tv-prio-alta">Alta</span>`
      : '';

    const responsavel = eq.responsavel_atual || eq.responsavel_tecnico || 'Equipe técnica';
    const localizacao = eq.localizacao || 'Pátio';
    const numOs       = eq.num_os ? `OS ${eq.num_os}` : (eq.numero || '');
    const extraInfo   = [eq.placa, eq.horimetro, eq.km].filter(Boolean).join(' · ');

    const srvLista = eq.servicos_lista || [];
    let servicosColHtml = '';

    if (isCompact) {
      if (srvLista.length === 0) {
        servicosColHtml = `<div class="tv-srv-inline-chips"><span class="tv-srv-mini-chip neutro"><span>${escapar(eq.queixa_inicial || 'Em atendimento')}</span></span></div>`;
      } else {
        servicosColHtml = `<div class="tv-srv-inline-chips">${srvLista.map(s => {
          const sCls = tvClasseEstado(s.estado, false);
          const sLbl = LABEL_ESTADO[s.estado] || s.estado;
          return `
            <span class="tv-srv-mini-chip ${sCls}" title="${escapar(s.titulo)} (${sLbl})">
              <span class="dot"></span>
              <strong>${escapar(s.titulo)}</strong>
              <em>(${sLbl})</em>
              ${s.responsavel ? `· ${escapar(s.responsavel)}` : ''}
            </span>`;
        }).join('')}</div>`;
      }
    } else {
      if (srvLista.length === 0) {
        servicosColHtml = `<div class="tv-servico-box"><div class="tv-servico">${escapar(eq.queixa_inicial || 'Em atendimento')}</div></div>`;
      } else {
        servicosColHtml = `<div class="tv-servicos-col">${srvLista.map(s => {
          const sCls = tvClasseEstado(s.estado, false);
          const sLbl = LABEL_ESTADO[s.estado] || s.estado;
          return `
            <div class="tv-srv-chip ${sCls}">
              <div class="tv-srv-chip-top">
                <span class="tv-srv-chip-title">${escapar(s.titulo)}</span>
                <span class="tv-srv-chip-badge">${sLbl}</span>
              </div>
              ${s.responsavel || s.atividade_ativa ? `
              <div class="tv-srv-chip-sub">
                ${s.responsavel ? `<span class="tv-srv-tec">${renderIcon('wrench')} ${escapar(s.responsavel)}</span>` : ''}
                ${s.atividade_ativa ? `<span class="tv-srv-atv">↳ ${renderIcon('gear')} ${escapar(s.atividade_ativa)}</span>` : ''}
              </div>` : ''}
            </div>`;
        }).join('')}</div>`;
      }
    }

    return `
    <tr class="${eq.atrasado ? 'tv-row-atrasado' : ''}" onclick="App.abrirDetalheFromTv(${eq.id})" title="Clique para abrir detalhes">
      <td class="tv-col-tag">
        <div class="tv-tag-cell">
          <span class="tv-tag">${escapar(eq.tag)}</span>
          ${numOs ? `<span class="tv-os-sub">${escapar(numOs)}</span>` : ''}
          ${prio}
        </div>
      </td>
      <td class="tv-col-empresa">
        <span class="tv-empresa-name">${escapar(eq.empresa)}</span>
        ${eq.responsavel_cliente ? `<span class="tv-cliente-contato">${renderIcon('user')} ${escapar(eq.responsavel_cliente)}</span>` : ''}
      </td>
      <td class="tv-col-equip">
        <span class="tv-equip-name">${escapar(eq.equipamento)}</span>
        ${extraInfo ? `<span class="tv-equip-extra">${escapar(extraInfo)}</span>` : ''}
      </td>
      <td class="tv-col-servico">
        ${servicosColHtml}
      </td>
      <td class="tv-col-resp">
        <span class="tv-resp-badge">
          <span>${renderIcon('tech')}</span>
          <span>${escapar(responsavel)}</span>
        </span>
      </td>
      <td class="tv-col-local">
        <span class="tv-local-badge">
          <span>${renderIcon('pin')}</span>
          <span>${escapar(localizacao)}</span>
        </span>
      </td>
      <td class="tv-col-estado">
        <div class="tv-estado-wrap">
          <div class="tv-estado-badge ${estadoClass}">
            <div class="tv-estado-dot"></div>
            <span>${estadoLabel}</span>
          </div>
          ${eq.estado_motivo ? `<div class="tv-estado-motivo">${renderIcon('alert')} ${escapar(eq.estado_motivo)}</div>` : ''}
        </div>
      </td>
      <td class="tv-col-prog">
        <div class="tv-prog-wrap">
          <div class="tv-prog-bar">
            <div class="tv-prog-fill" style="width:${progresso}%"></div>
          </div>
          <span class="tv-prog-pct">${progresso}%</span>
        </div>
      </td>
      <td class="tv-col-atu">
        <span class="tv-atualizacao">${eq.ultima_atualizacao_label ? `${renderIcon('clock')} ${eq.ultima_atualizacao_label}` : '—'}</span>
      </td>
    </tr>`;
  },

  abrirDetalheFromTv(equipId) {
    this.sairModoTv();
    this.navegar('detalhe', equipId);
  },

  // ─── SISTEMA DE SLIDES DO PAINEL & MODO TV ───────────────────────
  gerarEstruturaSlides() {
    if (this.abaPrincipal === 'entregues') {
      const entCount = (this._equipamentos || []).length;
      this.slides = [
        { id: 0, tipo: 'geral', titulo: 'Aba: Veículos Entregues', subtitulo: `${entCount} veículo(s) entregue(s) ao cliente` }
      ];
      this.slideAtual = 0;
      this.renderizarSlideTabs();
      return;
    }

    const lista = (this._equipamentos || []).filter(e => e.estado !== 'entregue');
    const novasSlides = [];

    // Paginação inteligente do Panorama Geral se houver mais de 8 veículos (2 colunas x 4 linhas):
    const ITENS_POR_PAGINA_PANORAMA = 8;
    if (lista.length > ITENS_POR_PAGINA_PANORAMA) {
      const totalPags = Math.ceil(lista.length / ITENS_POR_PAGINA_PANORAMA);
      for (let p = 0; p < totalPags; p++) {
        const slice = lista.slice(p * ITENS_POR_PAGINA_PANORAMA, (p + 1) * ITENS_POR_PAGINA_PANORAMA);
        novasSlides.push({
          id: novasSlides.length,
          tipo: 'geral',
          titulo: `1. Panorama (${p + 1}/${totalPags})`,
          subtitulo: `${lista.length} equipamentos no pátio · Pág ${p + 1} de ${totalPags}`,
          itens: slice
        });
      }
    } else {
      novasSlides.push({
        id: 0,
        tipo: 'geral',
        titulo: '1. Panorama Geral',
        subtitulo: `${lista.length} equipamentos no pátio`,
        itens: lista
      });
    }

    // 1 máquina por tela de detalhe com visualização a fundo:
    // Tela 2: Máquina 1 (ex: PIPA)
    // Tela 3: Máquina 2 (ex: PC 40)
    // Tela N: sucessivamente...
    lista.forEach((eq, idx) => {
      const tagNome = eq.tag || eq.equipamento || `Máquina ${idx + 1}`;
      const srvTotal = (eq.servicos || []).length;
      const atvTotal = eq.total_atividades || 0;
      const atvConc = eq.atividades_concluidas || 0;
      const pct = eq.progresso || 0;
      novasSlides.push({
        id: novasSlides.length,
        tipo: 'detalhe',
        titulo: `${novasSlides.length + 1}. ${tagNome}`,
        subtitulo: `${eq.empresa || 'Oficina'} · ${srvTotal} serviço(s) · ${atvConc}/${atvTotal} atividades (${pct}%)`,
        maquinas: [eq]
      });
    });

    this.slides = novasSlides;
    if (this.slideAtual >= this.slides.length) {
      this.slideAtual = 0;
    }
    this.renderizarSlideTabs();
  },

  renderizarSlideTabs() {
    const totalEntregues = $id('counter-entregues')?.textContent || '0';
    const renderTabsHtml = (isTv) => {
      const tabsHtml = this.slides.map((s, idx) => {
        const active = idx === this.slideAtual ? 'active' : '';
        const cls = isTv ? 'tv-slide-tab' : 'slide-tab';
        return `<button class="${cls} ${active}" onclick="App.irParaSlide(${idx})" title="${escapar(s.subtitulo)}">${escapar(s.titulo)}</button>`;
      }).join('');

      const entActive = this.abaPrincipal === 'entregues' ? 'active' : '';
      const entCls = isTv ? 'tv-slide-tab' : 'slide-tab';
      const entTab = `<button class="${entCls} ${entActive} slide-tab-entregues" onclick="App.abrirAbaEntregues()" title="Acessar aba de veículos entregues ao cliente">${renderIcon('delivery', 'ico')} Entregues (${totalEntregues})</button>`;

      return tabsHtml + entTab;
    };

    const navTabs = $id('slides-tabs');
    if (navTabs) navTabs.innerHTML = renderTabsHtml(false);

    const tvTabs = $id('tv-slides-tabs');
    if (tvTabs) tvTabs.innerHTML = renderTabsHtml(true);

    this.atualizarBotoesPlay();
  },

  irParaSlide(idx) {
    if (!this.slides || idx < 0 || idx >= this.slides.length) return;
    this.slideAtual = idx;
    this.slideTempoRestante = this.slideDuracaoSegundos;
    const fill1 = $id('slide-timer-fill');
    const fill2 = $id('tv-slide-timer-fill');
    if (fill1) fill1.style.width = '0%';
    if (fill2) fill2.style.width = '0%';
    this.exibirSlideAtual();
  },

  proximoSlide() {
    if (!this.slides || !this.slides.length) return;
    const prox = (this.slideAtual + 1) % this.slides.length;
    this.irParaSlide(prox);
  },

  slideAnterior() {
    if (!this.slides || !this.slides.length) return;
    const ant = (this.slideAtual - 1 + this.slides.length) % this.slides.length;
    this.irParaSlide(ant);
  },

  toggleRotacaoSlides() {
    this.slideRotacaoAtiva = !this.slideRotacaoAtiva;
    this.atualizarBotoesPlay();
    if (this.slideRotacaoAtiva) {
      this.toast('Rotação de telas retomada (12s)', 'info');
    } else {
      this.toast('Rotação de telas pausada', 'info');
    }
  },

  atualizarBotoesPlay() {
    const playIcon = this.slideRotacaoAtiva ? renderIcon('pause') : renderIcon('play');
    const playText = this.slideRotacaoAtiva ? 'Auto (12s)' : 'Pausado';

    const pIco = $id('slide-play-icon'), pTxt = $id('slide-play-text');
    if (pIco) pIco.innerHTML = playIcon;
    if (pTxt) pTxt.textContent = playText;

    const tvIco = $id('tv-slide-play-icon'), tvTxt = $id('tv-slide-play-text');
    if (tvIco) tvIco.innerHTML = playIcon;
    if (tvTxt) tvTxt.textContent = playText;

    const btnAuto = $id('btn-slide-autoplay');
    if (btnAuto) btnAuto.classList.toggle('paused', !this.slideRotacaoAtiva);

    const btnTvAuto = $id('tv-btn-slide-play');
    if (btnTvAuto) btnTvAuto.classList.toggle('paused', !this.slideRotacaoAtiva);
  },

  iniciarLoopSlides() {
    if (this.slideCountdownInterval) clearInterval(this.slideCountdownInterval);

    this.slideCountdownInterval = setInterval(() => {
      if (!this.slides || this.slides.length <= 1) return;
      if (this.viewAtual !== 'painel' && !this.tvAtivo) return;

      const pct = Math.min(100, Math.max(0, ((this.slideDuracaoSegundos - this.slideTempoRestante) / this.slideDuracaoSegundos) * 100));
      const fill1 = $id('slide-timer-fill');
      const fill2 = $id('tv-slide-timer-fill');
      if (fill1) fill1.style.width = `${pct}%`;
      if (fill2) fill2.style.width = `${pct}%`;

      if (!this.slideRotacaoAtiva || this.slidePausadoHover) return;

      this.slideTempoRestante -= 0.25;
      if (this.slideTempoRestante <= 0) {
        this.slideTempoRestante = this.slideDuracaoSegundos;
        this.proximoSlide();
      }
    }, 250);
  },

  exibirSlideAtual() {
    if (!this.slides || !this.slides.length) return;
    if (this.slideAtual >= this.slides.length) this.slideAtual = 0;
    let slide = this.slides[this.slideAtual];
    if (!slide) {
      this.slideAtual = 0;
      slide = this.slides[0];
    }
    if (!slide) return;

    console.log(`[Slide] Exibindo tela ${this.slideAtual + 1}/${this.slides.length}: ${slide.titulo} (${slide.tipo})`);

    // Atualizar abas ativas
    document.querySelectorAll('.slide-tab').forEach((el, idx) => {
      const isActive = idx === this.slideAtual;
      el.classList.toggle('active', isActive);
      if (isActive) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });
    document.querySelectorAll('.tv-slide-tab').forEach((el, idx) => {
      const isActive = idx === this.slideAtual;
      el.classList.toggle('active', isActive);
      if (isActive) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });

    // 1. Painel Desktop
    const painelGeral = $id('painel-slide-geral');
    const painelDetalhes = $id('painel-slide-detalhes');
    if (painelGeral && painelDetalhes) {
      if (slide.tipo === 'geral') {
        painelGeral.style.display = 'block';
        painelDetalhes.style.display = 'none';
      } else {
        painelGeral.style.display = 'none';
        painelDetalhes.style.display = 'block';
        const tit = $id('slide-detalhes-titulo');
        const sub = $id('slide-detalhes-sub');
        if (tit) tit.textContent = slide.titulo;
        if (sub) sub.textContent = slide.subtitulo;
        const grid = $id('slide-machines-grid');
        if (grid) grid.innerHTML = this._renderDeepMachinesGrid(slide.maquinas, false);
      }
    }

    // 2. Modo TV
    const tvPaneTable = $id('tv-slide-pane-table');
    const tvPaneDetalhes = $id('tv-slide-pane-detalhes');
    if (tvPaneTable && tvPaneDetalhes) {
      if (slide.tipo === 'geral') {
        tvPaneTable.style.display = 'block';
        tvPaneDetalhes.style.display = 'none';
        this.renderizarTvPanoramaConteudo(slide.itens || this._equipamentos);
      } else {
        tvPaneTable.style.display = 'none';
        tvPaneDetalhes.style.display = 'block';
        const tvGrid = $id('tv-machines-grid');
        if (tvGrid) tvGrid.innerHTML = this._renderDeepMachinesGrid(slide.maquinas, true);
      }
      if (this.tvAtivo) {
        this.aplicarZoomTv();
      }
    }
  },

  _renderDeepMachinesGrid(maquinas, isTv = false) {
    if (!maquinas || maquinas.length === 0) {
      return `<div class="empty-state" style="padding:3rem"><p>Nenhum equipamento alocado nesta tela.</p></div>`;
    }

    return maquinas.map(eq => {
      const isPronto = eq.estado === 'pronto';
      const progresso = eq.progresso || 0;
      const estadoCls = classeEstado(eq.estado, eq.atrasado);
      const estadoLbl = eq.atrasado ? 'ATRASADO' : (LABEL_ESTADO[eq.estado] || eq.estado);
      const prio = eq.prioridade === 'Urgente' ? '<span class="slide-prio urgente">URGENTE</span>' :
                   eq.prioridade === 'Alta'    ? '<span class="slide-prio alta">ALTA</span>' : '';

      const servicos = eq.servicos || [];
      const totalAtvs = eq.total_atividades || 0;
      const concluidasAtvs = eq.atividades_concluidas || 0;

      const servicosHtml = servicos.length === 0
        ? `<div class="slide-no-srv">Nenhum serviço registrado para este equipamento no momento.</div>`
        : servicos.map(srv => {
            const srvCls = classeEstado(srv.estado, false);
            const srvLbl = LABEL_ESTADO[srv.estado] || srv.estado;
            const atvs = srv.atividades || [];
            const atvTotal = atvs.length;
            const atvDone = atvs.filter(a => a.estado === 'concluida').length;
            const atvPct = atvTotal > 0 ? Math.round((atvDone / atvTotal) * 100) : (srv.estado === 'concluida' ? 100 : 0);

            const atvsHtml = atvs.length === 0
              ? `<div class="slide-no-atv">Nenhuma atividade registrada neste serviço.</div>`
              : atvs.map(a => {
                  const aDone = a.estado === 'concluida';
                  const aRun  = a.estado === 'em_andamento';
                  const statusCls = aDone ? 'concluida' : aRun ? 'em_andamento' : 'pendente';
                  const statusIcon = aDone ? renderIcon('check') : aRun ? renderIcon('play') : renderIcon('circle');
                  const tech = a.responsavel ? `<span class="slide-atv-tech">${renderIcon('wrench')} ${escapar(a.responsavel)}</span>` : '';
                  const time = a.atualizacao ? `<span class="slide-atv-time">${renderIcon('clock')} ${formatarDataRelativa(a.atualizacao)}</span>` : '';
                  const clickAttr = isTv ? '' : `onclick="App.toggleAtividade(${eq.id}, ${srv.id}, ${a.id})" style="cursor:pointer"`;

                  return `
                    <div class="slide-atv-item ${statusCls}" ${clickAttr} title="${aDone ? 'Concluída (clique para alternar)' : 'Clique para marcar como concluída'}">
                      <div class="slide-atv-check ${statusCls}">${statusIcon}</div>
                      <div class="slide-atv-body">
                        <div class="slide-atv-desc ${aDone ? 'done' : ''}">${escapar(a.descricao)}</div>
                        <div class="slide-atv-meta">${tech} ${time}</div>
                      </div>
                    </div>`;
                }).join('');

            return `
              <div class="slide-srv-card">
                <div class="slide-srv-head">
                  <div class="slide-srv-info">
                    <span class="slide-srv-title">${escapar(srv.titulo)}</span>
                    <span class="slide-srv-badge ${srvCls}">${srvLbl}</span>
                    ${srv.responsavel ? `<span class="slide-srv-tech">${renderIcon('wrench')} ${escapar(srv.responsavel)}</span>` : ''}
                  </div>
                  <div class="slide-srv-prog">
                    <div class="slide-srv-prog-bar">
                      <div class="slide-srv-prog-fill" style="width:${atvPct}%"></div>
                    </div>
                    <span class="slide-srv-prog-txt">${atvDone}/${atvTotal} (${atvPct}%)</span>
                  </div>
                </div>
                <div class="slide-atv-list">
                  ${atvsHtml}
                </div>
              </div>`;
          }).join('');

      return `
        <div class="slide-machine-card ${isTv ? 'tv-card' : ''}" 
             onmouseenter="App.slidePausadoHover = true" 
             onmouseleave="App.slidePausadoHover = false">
          <div class="slide-mch-header">
            <div class="slide-mch-header-left">
              <div class="slide-mch-tag-row">
                <span class="slide-mch-tag" onclick="App.navegar('detalhe', ${eq.id})">${escapar(eq.tag || 'S/ TAG')}</span>
                <span class="slide-mch-status ${estadoCls}">${estadoLbl}</span>
                ${prio}
                ${eq.num_os ? `<span class="slide-mch-os">OS ${escapar(eq.num_os)}</span>` : ''}
              </div>
              <div class="slide-mch-name" onclick="App.navegar('detalhe', ${eq.id})">${escapar(eq.equipamento)}</div>
              <div class="slide-mch-sub">
                <span>${renderIcon('building')} ${escapar(eq.empresa)}</span>
                <span>${renderIcon('pin')} ${escapar(eq.localizacao || 'Baia')}</span>
                <span>${renderIcon('tech')} ${escapar(eq.responsavel_tecnico || eq.responsavel_atual || 'Oficina')}</span>
                ${eq.tempo_oficina ? `<span>${renderIcon('clock')} ${eq.tempo_oficina} na oficina</span>` : ''}
              </div>
            </div>
            <div class="slide-mch-header-right">
              <div class="slide-mch-pct-val">${progresso}%</div>
              <div class="slide-mch-prog-wrap">
                <div class="slide-mch-prog-bar">
                  <div class="slide-mch-prog-fill" style="width:${progresso}%; background:${isPronto || progresso === 100 ? 'var(--c-green)' : 'var(--accent)'}"></div>
                </div>
                <div class="slide-mch-atv-count">${concluidasAtvs}/${totalAtvs} atividades concluídas</div>
              </div>
            </div>
          </div>

          <div class="slide-mch-body">
            <div class="slide-mch-srv-label">
              <span>SERVIÇOS & CHECKLIST DE ATIVIDADES EM ANDAMENTO</span>
              <span class="slide-mch-srv-count">${servicos.length} serviço(s)</span>
            </div>
            <div class="slide-mch-services-grid">
              ${servicosHtml}
            </div>
          </div>
        </div>`;
    }).join('');
  },

  // ── Toast ────────────────────────────────────────────────────────
  toast(msg, tipo = 'info') {
    const container = $id('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
};

// ── Boot ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
