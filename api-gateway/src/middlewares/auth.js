/**
 * middlewares/auth.js — Middleware de Autenticação e RBAC
 */

const { verificarToken, authService } = require('../services/authService');

function extrairToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  if (req.headers['x-access-token']) {
    return String(req.headers['x-access-token']).trim();
  }
  return null;
}

function autenticar(req, res, next) {
  const token = extrairToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Acesso não autorizado. Faça login para continuar.'
    });
  }

  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_INVALIDO',
      message: 'Sessão inválida ou expirada. Realize o login novamente.'
    });
  }

  const usuarioDb = authService.buscarPorId(payload.sub);
  if (!usuarioDb) {
    return res.status(401).json({
      success: false,
      code: 'USUARIO_INEXISTENTE',
      message: 'Usuário não localizado no sistema.'
    });
  }

  if (usuarioDb.ativo === false) {
    return res.status(403).json({
      success: false,
      code: 'USUARIO_INATIVO',
      message: 'Sua conta de usuário foi desativada pelo administrador.'
    });
  }

  req.usuario = usuarioDb;
  req.tokenAtual = token;
  next();
}

function autenticarOpcional(req, res, next) {
  const token = extrairToken(req);
  if (token) {
    const payload = verificarToken(token);
    if (payload) {
      const usuarioDb = authService.buscarPorId(payload.sub);
      if (usuarioDb && usuarioDb.ativo !== false) {
        req.usuario = usuarioDb;
        req.tokenAtual = token;
      }
    }
  }
  next();
}

function exigirRole(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Acesso não autorizado. Faça login.'
      });
    }

    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        success: false,
        code: 'ACESSO_NEGADO',
        message: `Acesso negado. Ação restrita aos perfis: ${rolesPermitidas.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  autenticar,
  autenticarOpcional,
  exigirRole
};
