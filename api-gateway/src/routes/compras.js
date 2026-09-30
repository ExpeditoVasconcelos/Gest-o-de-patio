/**
 * Rotas — Compras Diretas · Central JB Cunha
 * Acesso exclusivo para administradores (Manuel, Expedito e admins cadastrados)
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const storage = require('../services/storage');
const config  = require('../config');
const { autenticar, exigirRole } = require('../middlewares/auth');

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), config.UPLOADS_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, 'cd-' + unique + ext);
  }
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 30 * 1024 * 1024 } });

let _pushUpdate = null;
router.setPushUpdate = fn => { _pushUpdate = fn; };
function notify(tipo, dados) {
  if (_pushUpdate) { try { _pushUpdate(tipo, dados); } catch (_) {} }
}

// Todas as rotas de compras diretas exigem autenticação e perfil de ADMINISTRADOR
router.use(autenticar);
router.use(exigirRole('admin'));

// GET /compras
router.get('/', (req, res) => {
  const lista = storage.getComprasDiretas(req.query.status || null);
  const pendentes = storage.getComprasDiretasPendentesCount();
  res.json({ success: true, data: lista, total: lista.length, pendentes });
});

// GET /compras/pendentes/count
router.get('/pendentes/count', (req, res) => {
  res.json({ success: true, count: storage.getComprasDiretasPendentesCount() });
});

// POST /compras
router.post('/', upload.single('foto'), (req, res) => {
  const solicitante = (req.body.solicitante || '').trim() || req.usuario.nome || 'Administrador';
  const descricao = (req.body.descricao || '').trim();
  if (!descricao) {
    return res.status(400).json({ success: false, message: 'A descrição da peça ou insumo é obrigatória.' });
  }

  let foto_url = '';
  if (req.file) foto_url = '/uploads/' + req.file.filename;

  let eqIds = [];
  try {
    const raw = req.body.equipamentos_ids;
    if (typeof raw === 'string') {
      if (raw.startsWith('[')) eqIds = JSON.parse(raw);
      else if (raw.includes(',')) eqIds = raw.split(',').map(s => Number(s.trim()));
      else if (raw.trim()) eqIds = [Number(raw.trim())];
    } else if (Array.isArray(raw)) {
      eqIds = raw.map(Number);
    } else if (typeof raw === 'number') {
      eqIds = [raw];
    }
  } catch (_) { eqIds = []; }
  eqIds = eqIds.filter(n => !isNaN(n) && n > 0);

  const valorEstimado = parseFloat(req.body.valor_estimado) || 0;

  const nova = storage.createCompraDireta({
    solicitante,
    descricao,
    valor_estimado: valorEstimado,
    foto_url,
    equipamentos_ids: eqIds,
    rateio: req.body.rateio || 'igual'
  });

  const pendentes = storage.getComprasDiretasPendentesCount();
  notify('compra_solicitada', { compra: nova, pendentes });
  res.status(201).json({ success: true, data: nova, message: 'Solicitação de compra enviada com sucesso!' });
});

// PATCH /compras/:id/autorizar
router.patch('/:id/autorizar', (req, res) => {
  const { valor_final, obs_aprovador } = req.body;
  const aprovadorNome = req.usuario.nome || req.usuario.username || 'Admin';

  const compra = storage.autorizarCompraDireta(req.params.id, {
    autorizado_por: aprovadorNome,
    valor_final,
    obs_aprovador
  });

  if (!compra) {
    return res.status(404).json({ success: false, message: 'Solicitação não encontrada ou já processada' });
  }

  const pendentes = storage.getComprasDiretasPendentesCount();
  notify('compra_autorizada', { compra, pendentes });
  res.json({
    success: true,
    data: compra,
    message: `${compra.numero} autorizada por ${aprovadorNome}! Custos atribuídos aos veículos.`
  });
});

// PATCH /compras/:id/declinar
router.patch('/:id/declinar', (req, res) => {
  const { motivo_declinio } = req.body;
  const aprovadorNome = req.usuario.nome || req.usuario.username || 'Admin';

  const compra = storage.declinarCompraDireta(req.params.id, {
    autorizado_por: aprovadorNome,
    motivo_declinio
  });

  if (!compra) {
    return res.status(404).json({ success: false, message: 'Solicitação não encontrada ou já processada' });
  }

  const pendentes = storage.getComprasDiretasPendentesCount();
  notify('compra_declinada', { compra, pendentes });
  res.json({
    success: true,
    data: compra,
    message: `${compra.numero} declinada por ${aprovadorNome}.`
  });
});

// DELETE /compras/:id
router.delete('/:id', (req, res) => {
  const ok = storage.deleteCompraDireta(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
  const pendentes = storage.getComprasDiretasPendentesCount();
  notify('compra_excluida', { id: parseInt(req.params.id), pendentes });
  res.json({ success: true, message: 'Solicitação excluída' });
});

module.exports = router;
