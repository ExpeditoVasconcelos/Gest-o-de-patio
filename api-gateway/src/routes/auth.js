/**
 * routes/auth.js — Rotas de Autenticação (Login, Sessão, Logout, Senha)
 */

const express = require('express');
const router = express.Router();
const { authService } = require('../services/authService');
const { autenticar } = require('../middlewares/auth');

// POST /auth/login
router.post('/login', (req, res) => {
  const username = req.body?.username;
  const senha = req.body?.senha || req.body?.password;
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';

  const resultado = authService.autenticar(username, senha, ip);
  if (!resultado.success) {
    return res.status(resultado.status || 401).json({
      success: false,
      message: resultado.message
    });
  }

  res.json({
    success: true,
    message: 'Login realizado com sucesso.',
    token: resultado.token,
    usuario: resultado.usuario
  });
});

// GET /auth/me
router.get('/me', autenticar, (req, res) => {
  res.json({
    success: true,
    usuario: req.usuario
  });
});

// POST /auth/logout
router.post('/logout', autenticar, (req, res) => {
  authService.logout(req.tokenAtual);
  res.json({
    success: true,
    message: 'Sessão encerrada com sucesso.'
  });
});

// PUT /auth/alterar-senha
router.put('/alterar-senha', autenticar, (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  const r = authService.alterarSenha(req.usuario.id, senhaAtual, novaSenha);
  if (!r.success) {
    return res.status(400).json(r);
  }
  res.json(r);
});

module.exports = router;
