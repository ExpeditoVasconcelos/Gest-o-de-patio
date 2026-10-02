/**
 * authService.js — Autenticação e RBAC Central JB Cunha
 * Criptografia robusta com crypto.scrypt e tokens HMAC-SHA256
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const USUARIOS_FILE = path.join(config.DATA_DIR, 'usuarios.json');
const SECRET_FILE = path.join(config.DATA_DIR, '.auth_secret');

// Chave secreta persistente para assinatura de tokens
function obterOuCriarSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const s = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (s) return s;
    }
    const novoSecret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_FILE, novoSecret, { encoding: 'utf8', mode: 0o600 });
    return novoSecret;
  } catch (_) {
    return 'jbc-default-secret-change-in-production-' + crypto.randomBytes(16).toString('hex');
  }
}

const JWT_SECRET = obterOuCriarSecret();

// Controle de tentativas de login contra força bruta (NIST CSF 2.0 - PR.AC / PR.PT)
const MAX_FALHAS_IP = 10;
const MAX_FALHAS_CONTA = 5;
const TEMPO_BLOQUEIO_IP_MS = 15 * 60 * 1000;    // 15 minutos
const TEMPO_BLOQUEIO_CONTA_MS = 15 * 60 * 1000; // 15 minutos

const tentativasIp = new Map();     // ip -> { falhas, bloqueadoAte, primeiraTentativa }
const tentativasConta = new Map();  // username -> { falhas, bloqueadoAte, primeiraTentativa }

// Limpeza de memória periódica (mitigação de DoS contra estado em memória)
setInterval(() => {
  const agora = Date.now();
  for (const [ip, info] of tentativasIp.entries()) {
    if (info.bloqueadoAte && agora > info.bloqueadoAte + 60000) tentativasIp.delete(ip);
    else if (!info.bloqueadoAte && agora - info.primeiraTentativa > 600000) tentativasIp.delete(ip);
  }
  for (const [u, info] of tentativasConta.entries()) {
    if (info.bloqueadoAte && agora > info.bloqueadoAte + 60000) tentativasConta.delete(u);
    else if (!info.bloqueadoAte && agora - info.primeiraTentativa > 600000) tentativasConta.delete(u);
  }
}, 10 * 60 * 1000).unref();

// Blacklist de tokens revogados
const tokensRevogados = new Set();

// Funções criptográficas
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(senha, hashCompleto) {
  if (!hashCompleto || !hashCompleto.includes(':')) return false;
  const [salt, hashOriginal] = hashCompleto.split(':');
  const bufferOriginal = Buffer.from(hashOriginal, 'hex');
  const bufferNovo = crypto.scryptSync(String(senha), salt, 64);
  if (bufferOriginal.length !== bufferNovo.length) return false;
  return crypto.timingSafeEqual(bufferOriginal, bufferNovo);
}

// Codificação Base64URL
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

// Geração de token assinado
function gerarToken(usuario, duracaoDias = 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expiraEm = Math.floor(Date.now() / 1000) + (duracaoDias * 86400);
  const payload = {
    sub: usuario.id,
    username: usuario.username,
    nome: usuario.nome,
    role: usuario.role,
    empresa_vinculada: usuario.empresa_vinculada || null,
    exp: expiraEm,
    iat: Math.floor(Date.now() / 1000)
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${headerB64}.${payloadB64}`;
  const assinatura = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${assinatura}`;
}

// Verificação de token assinado
function verificarToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (tokensRevogados.has(token)) return null;

  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [headerB64, payloadB64, assinatura] = partes;

  const dataToSign = `${headerB64}.${payloadB64}`;
  const assinaturaEsperada = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const bufEsperado = Buffer.from(assinaturaEsperada);
  const bufRecebido = Buffer.from(assinatura);
  if (bufEsperado.length !== bufRecebido.length) return null;
  if (!crypto.timingSafeEqual(bufEsperado, bufRecebido)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const agoraSegundos = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < agoraSegundos) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

// Persistência de Usuários
class AuthService {
  constructor() {
    this.usuarios = [];
    this.inicializar();
  }

  inicializar() {
    if (!fs.existsSync(config.DATA_DIR)) {
      fs.mkdirSync(config.DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(USUARIOS_FILE)) {
      try {
        const raw = fs.readFileSync(USUARIOS_FILE, 'utf8');
        const j = JSON.parse(raw);
        this.usuarios = Array.isArray(j.usuarios) ? j.usuarios : [];
      } catch (err) {
        console.error('[AuthService] Erro ao ler usuarios.json, recriando:', err);
        this.usuarios = [];
      }
    }

    // Se a base estiver vazia, cria usuários padrão: Manuel (Aprovador), Expedito (Aprovador) e Operador (Solicitante)
    if (this.usuarios.length === 0) {
      this.seedAdministradoresPadrao();
    } else {
      // Garante que Manuel, Expedito e Operador existam com seus papéis corretos
      this.assegurarUsuarioExistente('manuel', 'Manuel', 'admin');
      this.assegurarUsuarioExistente('expedito', 'Expedito', 'admin');
      this.assegurarUsuarioExistente('operador', 'Operador Pátio', 'usuario');
    }
  }

  salvar() {
    try {
      const data = {
        versao: '1.0',
        atualizado_em: new Date().toISOString(),
        usuarios: this.usuarios
      };
      fs.writeFileSync(USUARIOS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[AuthService] Erro ao salvar usuarios.json:', err);
    }
  }

  seedAdministradoresPadrao() {
    const agora = new Date().toISOString();
    const senhaPadrao = 'jbc@2026';
    const hash = hashSenha(senhaPadrao);

    this.usuarios = [
      {
        id: 1,
        username: 'manuel',
        nome: 'Manuel',
        senha_hash: hash,
        role: 'admin',
        empresa_vinculada: null,
        ativo: true,
        criado_em: agora,
        atualizado_em: agora,
        ultimo_login: null
      },
      {
        id: 2,
        username: 'expedito',
        nome: 'Expedito',
        senha_hash: hash,
        role: 'admin',
        empresa_vinculada: null,
        ativo: true,
        criado_em: agora,
        atualizado_em: agora,
        ultimo_login: null
      },
      {
        id: 3,
        username: 'operador',
        nome: 'Operador Pátio',
        senha_hash: hash,
        role: 'usuario',
        empresa_vinculada: null,
        ativo: true,
        criado_em: agora,
        atualizado_em: agora,
        ultimo_login: null
      }
    ];

    this.salvar();
    console.log('[AuthService] Usuários iniciais configurados: manuel (admin), expedito (admin), operador (solicitante) [senha: jbc@2026]');
  }

  assegurarUsuarioExistente(username, nome, role = 'admin') {
    const u = this.usuarios.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u) {
      const novo = {
        id: this.proximoId(),
        username: username.toLowerCase(),
        nome: nome,
        senha_hash: hashSenha('jbc@2026'),
        role: role,
        empresa_vinculada: null,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        ultimo_login: null
      };
      this.usuarios.push(novo);
      this.salvar();
    }
  }

  assegurarAdminExistente(username, nome) {
    this.assegurarUsuarioExistente(username, nome, 'admin');
  }

  proximoId() {
    return this.usuarios.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
  }

  limparDadosSensiveis(u) {
    if (!u) return null;
    const { senha_hash, ...seguro } = u;
    return seguro;
  }

  // Rate Limiting e Prevenção de Força Bruta (NIST CSF PR.AC / PR.PT)
  verificarRateLimit(ip, username) {
    const agora = Date.now();
    const cleanUser = String(username || '').trim().toLowerCase();

    // 1. Verificação por IP
    const infoIp = tentativasIp.get(ip);
    if (infoIp && infoIp.bloqueadoAte && agora < infoIp.bloqueadoAte) {
      const segundos = Math.ceil((infoIp.bloqueadoAte - agora) / 1000);
      return {
        bloqueado: true,
        tipo: 'IP',
        segundos,
        mensagem: `Acesso temporariamente bloqueado para este IP devido a múltiplas tentativas incorretas. Tente novamente em ${segundos}s.`
      };
    }

    // 2. Verificação por Conta (Proteção contra força bruta distribuída)
    if (cleanUser && cleanUser !== 'invalid_format') {
      const infoConta = tentativasConta.get(cleanUser);
      if (infoConta && infoConta.bloqueadoAte && agora < infoConta.bloqueadoAte) {
        const segundos = Math.ceil((infoConta.bloqueadoAte - agora) / 1000);
        return {
          bloqueado: true,
          tipo: 'CONTA',
          segundos,
          mensagem: `Conta temporariamente suspensa por excesso de tentativas inválidas. Aguarde ${segundos}s.`
        };
      }
    }

    return { bloqueado: false };
  }

  registrarFalhaLogin(ip, username) {
    const agora = Date.now();
    const cleanUser = String(username || '').trim().toLowerCase();

    // Registro na camada de IP
    const infoIp = tentativasIp.get(ip) || { falhas: 0, bloqueadoAte: null, primeiraTentativa: agora };
    infoIp.falhas += 1;
    if (infoIp.falhas >= MAX_FALHAS_IP) {
      infoIp.bloqueadoAte = agora + TEMPO_BLOQUEIO_IP_MS;
      console.warn(`[SEC-ALERT][BRUTE_FORCE_IP] IP ${ip} bloqueado por ${TEMPO_BLOQUEIO_IP_MS / 60000}m após ${infoIp.falhas} falhas consecutivas.`);
    }
    tentativasIp.set(ip, infoIp);

    // Registro na camada de Conta
    if (cleanUser && cleanUser !== 'invalid_format') {
      const infoConta = tentativasConta.get(cleanUser) || { falhas: 0, bloqueadoAte: null, primeiraTentativa: agora };
      infoConta.falhas += 1;
      if (infoConta.falhas >= MAX_FALHAS_CONTA) {
        infoConta.bloqueadoAte = agora + TEMPO_BLOQUEIO_CONTA_MS;
        console.warn(`[SEC-ALERT][ACCOUNT_LOCKOUT] Conta '${cleanUser}' bloqueada por ${TEMPO_BLOQUEIO_CONTA_MS / 60000}m após ${infoConta.falhas} falhas consecutivas.`);
      }
      tentativasConta.set(cleanUser, infoConta);
    }
  }

  limparFalhaLogin(ip, username) {
    const cleanUser = String(username || '').trim().toLowerCase();
    tentativasIp.delete(ip);
    if (cleanUser) {
      tentativasConta.delete(cleanUser);
    }
  }

  // Autenticação com credenciais e hardening NIST CSF
  autenticar(username, senha, ip = '127.0.0.1') {
    if (!username || !senha) {
      return { success: false, status: 400, message: 'Usuário e senha são obrigatórios.' };
    }

    const usrClean = String(username).trim();
    if (usrClean.length < 2 || usrClean.length > 64 || !/^[a-zA-Z0-9_.-]+$/.test(usrClean)) {
      this.registrarFalhaLogin(ip, 'invalid_format');
      return { success: false, status: 400, message: 'Formato de usuário inválido.' };
    }

    if (typeof senha !== 'string' || senha.length > 128) {
      this.registrarFalhaLogin(ip, usrClean);
      return { success: false, status: 400, message: 'Formato de senha inválido.' };
    }

    const rate = this.verificarRateLimit(ip, usrClean);
    if (rate.bloqueado) {
      return { 
        success: false, 
        status: 429, 
        message: rate.mensagem,
        retryAfter: rate.segundos 
      };
    }

    const usrLower = usrClean.toLowerCase();
    const usuario = this.usuarios.find(u => u.username.toLowerCase() === usrLower);

    // Mitigação contra Timing Attack (executa hash dummy para tempo de resposta idêntico)
    if (!usuario) {
      this.registrarFalhaLogin(ip, usrClean);
      console.warn(`[SEC-AUDIT][AUTH_FAIL] Tentativa falha para usuário inexistente: '${usrClean}' — IP: ${ip}`);
      verificarSenha(senha, 'deadbeefdeadbeefdeadbeefdeadbeef:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
      return { success: false, status: 401, message: 'Usuário ou senha inválidos.' };
    }

    if (!usuario.ativo) {
      console.warn(`[SEC-AUDIT][AUTH_BLOCKED] Tentativa de login em conta inativa: '${usrClean}' — IP: ${ip}`);
      return { success: false, status: 403, message: 'Conta de usuário desativada. Consulte o administrador.' };
    }

    const senhaCorreta = verificarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      this.registrarFalhaLogin(ip, usrClean);
      console.warn(`[SEC-AUDIT][AUTH_FAIL] Senha incorreta para usuário: '${usrClean}' — IP: ${ip}`);
      return { success: false, status: 401, message: 'Usuário ou senha inválidos.' };
    }

    // Sucesso no login
    this.limparFalhaLogin(ip, usrClean);
    usuario.ultimo_login = new Date().toISOString();
    this.salvar();

    console.log(`[SEC-AUDIT][AUTH_SUCCESS] Login efetuado com sucesso: '${usuario.username}' (${usuario.role}) — IP: ${ip}`);

    const token = gerarToken(usuario);
    return {
      success: true,
      token,
      usuario: this.limparDadosSensiveis(usuario)
    };
  }

  logout(token) {
    if (token) tokensRevogados.add(token);
    return { success: true };
  }

  buscarPorId(id) {
    const u = this.usuarios.find(x => x.id === Number(id));
    return this.limparDadosSensiveis(u);
  }

  buscarPorUsername(username) {
    const u = this.usuarios.find(x => x.username.toLowerCase() === String(username).trim().toLowerCase());
    return this.limparDadosSensiveis(u);
  }

  listarUsuarios() {
    return this.usuarios.map(u => this.limparDadosSensiveis(u));
  }

  // Criação de Usuário (Admin)
  criarUsuario({ nome, username, senha, role, empresa_vinculada }) {
    if (!nome || !username || !senha || !role) {
      return { success: false, message: 'Nome, usuário, senha e perfil (role) são obrigatórios.' };
    }

    const uClean = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,30}$/.test(uClean)) {
      return { success: false, message: 'O nome de usuário deve conter de 3 a 30 caracteres (letras, números, _, . ou -).' };
    }

    if (String(senha).length < 6) {
      return { success: false, message: 'A senha deve possuir no mínimo 6 caracteres.' };
    }

    const rolesValidas = ['admin', 'usuario', 'cliente'];
    if (!rolesValidas.includes(role)) {
      return { success: false, message: 'Perfil inválido. Deve ser admin, usuario ou cliente.' };
    }

    if (role === 'cliente' && (!empresa_vinculada || !String(empresa_vinculada).trim())) {
      return { success: false, message: 'Para perfil Cliente, é obrigatório informar o nome da Empresa vinculada.' };
    }

    if (this.usuarios.some(x => x.username.toLowerCase() === uClean)) {
      return { success: false, message: 'Já existe um usuário cadastrado com este login.' };
    }

    const novo = {
      id: this.proximoId(),
      username: uClean,
      nome: String(nome).trim(),
      senha_hash: hashSenha(senha),
      role,
      empresa_vinculada: role === 'cliente' ? String(empresa_vinculada).trim() : null,
      ativo: true,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      ultimo_login: null
    };

    this.usuarios.push(novo);
    this.salvar();
    return { success: true, usuario: this.limparDadosSensiveis(novo) };
  }

  // Atualização de Usuário (Admin)
  atualizarUsuario(id, dados) {
    const u = this.usuarios.find(x => x.id === Number(id));
    if (!u) return { success: false, message: 'Usuário não encontrado.' };

    if (dados.nome) u.nome = String(dados.nome).trim();
    if (dados.role) {
      const rolesValidas = ['admin', 'usuario', 'cliente'];
      if (!rolesValidas.includes(dados.role)) {
        return { success: false, message: 'Perfil inválido.' };
      }
      u.role = dados.role;
    }

    if (u.role === 'cliente') {
      if (dados.empresa_vinculada) u.empresa_vinculada = String(dados.empresa_vinculada).trim();
    } else {
      u.empresa_vinculada = null;
    }

    if (typeof dados.ativo === 'boolean') {
      u.ativo = dados.ativo;
    }

    if (dados.novaSenha && String(dados.novaSenha).trim()) {
      if (String(dados.novaSenha).length < 6) {
        return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' };
      }
      u.senha_hash = hashSenha(dados.novaSenha);
    }

    u.atualizado_em = new Date().toISOString();
    this.salvar();
    return { success: true, usuario: this.limparDadosSensiveis(u) };
  }

  // Exclusão de Usuário (Admin)
  excluirUsuario(id, solicitanteId) {
    const numId = Number(id);
    if (numId === Number(solicitanteId)) {
      return { success: false, message: 'Você não pode excluir sua própria conta de administrador.' };
    }

    const idx = this.usuarios.findIndex(x => x.id === numId);
    if (idx === -1) return { success: false, message: 'Usuário não encontrado.' };

    const u = this.usuarios[idx];
    // Protege Manuel e Expedito de exclusão acidental
    if (['manuel', 'expedito'].includes(u.username.toLowerCase())) {
      return { success: false, message: 'Os administradores fundadores do sistema não podem ser excluídos.' };
    }

    this.usuarios.splice(idx, 1);
    this.salvar();
    return { success: true, message: `Usuário ${u.username} removido com sucesso.` };
  }

  // Alteração da própria senha
  alterarSenha(id, senhaAtual, novaSenha) {
    const u = this.usuarios.find(x => x.id === Number(id));
    if (!u) return { success: false, message: 'Usuário não encontrado.' };

    if (!verificarSenha(senhaAtual, u.senha_hash)) {
      return { success: false, message: 'A senha atual informada está incorreta.' };
    }

    if (!novaSenha || String(novaSenha).length < 6) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 6 caracteres.' };
    }

    u.senha_hash = hashSenha(novaSenha);
    u.atualizado_em = new Date().toISOString();
    this.salvar();
    return { success: true, message: 'Senha atualizada com sucesso.' };
  }
}

const authServiceInstance = new AuthService();
module.exports = {
  authService: authServiceInstance,
  verificarToken,
  gerarToken
};
