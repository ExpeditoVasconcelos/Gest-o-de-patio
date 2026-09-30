/**
 * routes/usuarios.js — Gestão de Usuários (Exclusivo Administradores)
 */

const express = require('express');
const router = express.Router();
const { authService } = require('../services/authService');
const { autenticar, exigirRole } = require('../middlewares/auth');

// Todas as operações com usuários exigem permissão de ADMIN
router.use(autenticar);
router.use(exigirRole('admin'));

// GET /usuarios
router.get('/', (req, res) => {
  const lista = authService.listarUsuarios();
  res.json({
    success: true,
    data: lista,
    total: lista.length
  });
});

// POST /usuarios
router.post('/', (req, res) => {
  const { nome, username, role, empresa_vinculada } = req.body || {};
  const senha = req.body?.senha || req.body?.password;
  const r = authService.criarUsuario({ nome, username, senha, role, empresa_vinculada });
  if (!r.success) {
    return res.status(400).json(r);
  }
  res.status(201).json(r);
});

// PUT /usuarios/:id
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const r = authService.atualizarUsuario(id, req.body || {});
  if (!r.success) {
    return res.status(400).json(r);
  }
  res.json(r);
});

// DELETE /usuarios/:id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const r = authService.excluirUsuario(id, req.usuario.id);
  if (!r.success) {
    return res.status(400).json(r);
  }
  res.json(r);
});

module.exports = router;
