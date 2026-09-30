/**
 * Rotas de Atendimentos/Equipamentos — Central JB Cunha v3.0
 * Hierarquia: Equipamento → Serviços → Atividades
 * Controle de Acesso Baseado em Papéis (RBAC): Admin, Usuário, Cliente
 */

const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { autenticar, autenticarOpcional, exigirRole } = require('../middlewares/auth');

// Upload de evidências (fotos e vídeos de até 100MB)
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), config.UPLOADS_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, 'midia-' + unique + ext);
  }
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Helper para filtrar dados sensíveis para clientes
function sanitizarParaCliente(eq) {
  if (!eq) return null;
  const clone = JSON.parse(JSON.stringify(eq));
  // Remove custos diretos de peças e dados confidenciais internos
  delete clone.custos_diretos;
  delete clone.num_orcamento;
  delete clone.num_nf;
  return clone;
}

// ── Equipamentos ───────────────────────────────────────────

// Listar atendimentos
router.get('/', autenticarOpcional, (req, res) => {
  const { filtro } = req.query;
  let lista = storage.getEquipamentos(filtro || 'Patio');

  // Regra do Cliente: só exibe os veículos que a ele competem (empresa_vinculada)
  if (req.usuario && req.usuario.role === 'cliente') {
    const empresaCliente = (req.usuario.empresa_vinculada || '').trim().toLowerCase();
    lista = lista.filter(eq => (eq.empresa || '').trim().toLowerCase() === empresaCliente);
    lista = lista.map(sanitizarParaCliente);
  }

  res.json({ success: true, data: lista, total: lista.length });
});

// Detalhes de um equipamento
router.get('/:id', autenticarOpcional, (req, res) => {
  let eq = storage.getEquipamentoById(req.params.id);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  // Regra do Cliente: validação estrita de isolamento de empresa
  if (req.usuario && req.usuario.role === 'cliente') {
    const empresaCliente = (req.usuario.empresa_vinculada || '').trim().toLowerCase();
    const empresaEquip = (eq.empresa || '').trim().toLowerCase();
    if (empresaEquip !== empresaCliente) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Este veículo pertence a outra empresa.'
      });
    }
    eq = sanitizarParaCliente(eq);
  }

  res.json({ success: true, data: eq });
});

// Criar atendimento (Apenas Admin e Usuário)
router.post('/', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const empresa = req.body.empresa || req.body.cliente;
  const equipamento = req.body.equipamento || req.body.veiculo_equipamento || req.body.veiculo;
  if (!equipamento && !empresa) {
    return res.status(400).json({ success: false, message: 'Informe ao menos Equipamento ou Empresa' });
  }

  const autor = req.usuario.nome || req.usuario.username || 'Oficina';
  const payload = {
    ...req.body,
    empresa: empresa || 'Empresa não informada',
    equipamento: equipamento || 'Equipamento',
    criado_por: autor
  };
  const novo = storage.createEquipamento(payload);
  res.status(201).json({ success: true, data: novo, message: 'Atendimento iniciado com sucesso' });
});

// Atualizar dados básicos (Apenas Admin e Usuário)
router.patch('/:id', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const usuario = req.usuario.nome || req.usuario.username || 'Oficina';
  const eq = storage.updateEquipamento(req.params.id, req.body, usuario);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.json({ success: true, data: eq, message: 'Dados atualizados com sucesso' });
});

// Atualizar estado (Apenas Admin e Usuário)
router.patch('/:id/estado', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const { estado, motivo } = req.body;
  const usuario = req.usuario.nome || req.usuario.username || 'Oficina';
  if (!estado) return res.status(400).json({ success: false, message: 'Estado é obrigatório' });
  const eq = storage.updateEstado(req.params.id, estado, motivo, usuario);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.json({ success: true, data: eq, message: `Estado atualizado: ${estado}` });
});

// Atualizar localização (Apenas Admin e Usuário)
router.patch('/:id/localizacao', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const { localizacao } = req.body;
  const usuario = req.usuario.nome || req.usuario.username || 'Oficina';
  if (!localizacao) return res.status(400).json({ success: false, message: 'Localização é obrigatória' });
  const eq = storage.updateLocalizacao(req.params.id, localizacao, usuario);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.json({ success: true, data: eq });
});

// Duplicar atendimento (Apenas Admin e Usuário)
router.post('/:id/duplicar', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const eq = storage.getEquipamentoById(req.params.id);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  const novo = storage.duplicarEquipamento(req.params.id, req.body);
  if (!novo) return res.status(500).json({ success: false, message: 'Erro ao duplicar equipamento' });
  res.status(201).json({ success: true, data: novo, message: 'Equipamento duplicado com sucesso!' });
});

// Excluir atendimento (Exclusivo Administrador)
router.delete('/:id', autenticar, exigirRole('admin'), (req, res) => {
  const ok = storage.deleteEquipamento(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.json({ success: true, message: 'Atendimento excluído com sucesso' });
});

// ── Chat & Backlog Operacional ─────────────────────────────

// Adicionar mensagem / evidência (Apenas Admin e Usuário)
router.post('/:id/chat', autenticar, exigirRole('admin', 'usuario'), upload.single('midia'), (req, res) => {
  const { texto, servico_id } = req.body;
  let midiaUrl = '';
  let midiaTipo = null;
  let midiaNome = '';

  if (req.file) {
    midiaUrl = `/uploads/${req.file.filename}`;
    midiaNome = req.file.originalname || req.file.filename;
    const mime = (req.file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) {
      midiaTipo = 'foto';
    } else if (mime.startsWith('video/')) {
      midiaTipo = 'video';
    } else {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.mp4', '.mov', '.webm', '.avi', '.mkv', '.3gp'].includes(ext)) midiaTipo = 'video';
      else midiaTipo = 'foto';
    }
  } else if (req.body.midia_url) {
    midiaUrl = req.body.midia_url;
    midiaTipo = req.body.midia_tipo || 'foto';
    midiaNome = req.body.midia_nome || '';
  }

  const autor = req.usuario.nome || req.usuario.username || 'Oficina';
  const msg = storage.addMensagemChat(req.params.id, {
    texto,
    autor,
    servico_id,
    midia_url: midiaUrl,
    midia_tipo: midiaTipo,
    midia_nome: midiaNome
  });

  if (!msg) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.json({ success: true, data: msg, message: 'Registro publicado no mural com sucesso' });
});

// Excluir mensagem do chat (Exclusivo Administrador)
router.delete('/:id/chat/:mid', autenticar, exigirRole('admin'), (req, res) => {
  const ok = storage.deleteMensagemChat(req.params.id, req.params.mid);
  if (!ok) return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
  res.json({ success: true, message: 'Mensagem excluída com sucesso' });
});

// ── Serviços ───────────────────────────────────────────────

// Listar serviços do equipamento
router.get('/:id/servicos', autenticarOpcional, (req, res) => {
  const eq = storage.getEquipamentoById(req.params.id);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  if (req.usuario && req.usuario.role === 'cliente') {
    const empresaCliente = (req.usuario.empresa_vinculada || '').trim().toLowerCase();
    if ((eq.empresa || '').trim().toLowerCase() !== empresaCliente) {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }
  }

  res.json({ success: true, data: eq.servicos });
});

// Criar serviço (Apenas Admin e Usuário)
router.post('/:id/servicos', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const srv = storage.addServico(req.params.id, req.body);
  if (!srv) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });
  res.status(201).json({ success: true, data: srv, message: 'Serviço adicionado' });
});

// Atualizar serviço (Apenas Admin e Usuário)
router.patch('/:id/servicos/:sid', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const srv = storage.updateServico(req.params.id, req.params.sid, req.body);
  if (!srv) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
  res.json({ success: true, data: srv });
});

// Excluir serviço (Apenas Admin e Usuário)
router.delete('/:id/servicos/:sid', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const ok = storage.deleteServico(req.params.id, req.params.sid);
  if (!ok) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
  res.json({ success: true, message: 'Serviço excluído' });
});

// ── Atividades ─────────────────────────────────────────────

// Listar atividades de um serviço
router.get('/:id/servicos/:sid/atividades', autenticarOpcional, (req, res) => {
  const eq = storage.getEquipamentoById(req.params.id);
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  if (req.usuario && req.usuario.role === 'cliente') {
    const empresaCliente = (req.usuario.empresa_vinculada || '').trim().toLowerCase();
    if ((eq.empresa || '').trim().toLowerCase() !== empresaCliente) {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }
  }

  const srv = eq.servicos.find(s => s.id === parseInt(req.params.sid));
  if (!srv) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
  res.json({ success: true, data: srv.atividades });
});

// Criar atividade (Apenas Admin e Usuário)
router.post('/:id/servicos/:sid/atividades', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const atv = storage.addAtividade(req.params.id, req.params.sid, req.body);
  if (!atv) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
  res.status(201).json({ success: true, data: atv, message: 'Atividade adicionada' });
});

// Atualizar atividade (Apenas Admin e Usuário)
router.patch('/:id/servicos/:sid/atividades/:aid', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const atv = storage.updateAtividade(req.params.id, req.params.sid, req.params.aid, req.body);
  if (!atv) return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
  res.json({ success: true, data: atv });
});

// Excluir atividade (Apenas Admin e Usuário)
router.delete('/:id/servicos/:sid/atividades/:aid', autenticar, exigirRole('admin', 'usuario'), (req, res) => {
  const ok = storage.deleteAtividade(req.params.id, req.params.sid, req.params.aid);
  if (!ok) return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
  res.json({ success: true, message: 'Atividade excluída' });
});

// Metadados (estados disponíveis)
router.get('/meta/estados', (req, res) => {
  res.json({ success: true, data: storage.getLabelEstados() });
});

module.exports = router;
