/**
 * Rotas Mobile — JB Cunha Oficina v3.1
 * API específica para dispositivos móveis (celular dos técnicos)
 * Descoberta de rede local (mDNS-less), SSE push em tempo real
 */

const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const os = require('os');

// ──────────────────────────────────────────────────────────
// SSE: Server-Sent Events — push em tempo real para celulares
// ──────────────────────────────────────────────────────────

const sseClients = new Set();

function pushUpdate(tipo, dados) {
  const payload = JSON.stringify({ tipo, dados, ts: new Date().toISOString() });
  sseClients.forEach(client => {
    try { client.res.write(`data: ${payload}\n\n`); }
    catch (_) { sseClients.delete(client); }
  });
}

// Expõe função de push para uso nos outros módulos via server.js
router.pushUpdate = pushUpdate;

// Escuta alterações globais do storage para disparo automático em tempo real
storage.on('change', () => {
  try {
    const dados = storage.getDashboardData();
    pushUpdate('painel_atualizado', dados);
  } catch (err) {
    console.error('[SSE] Erro ao disparar painel_atualizado:', err.message);
  }
});

// Endpoint SSE — o celular conecta aqui para receber atualizações em tempo real
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat a cada 25 segundos para manter a conexão viva
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 25000);

  const client = { id: Date.now(), res };
  sseClients.add(client);

  // Enviar estado atual imediatamente ao conectar
  const dados = storage.getDashboardData();
  res.write(`data: ${JSON.stringify({ tipo: 'init', dados, ts: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

// ──────────────────────────────────────────────────────────
// Descoberta de rede — o celular descobre o servidor pelo IP
// ──────────────────────────────────────────────────────────

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  Object.values(nets).forEach(addrs => {
    (addrs || []).forEach(a => {
      if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
    });
  });
  return ips;
}

// Endpoint de descoberta — retorna info do servidor para identificação na rede
router.get('/discover', (req, res) => {
  res.json({
    app: 'JB Cunha — Central de Operações',
    versao: '3.1.0',
    tipo: 'oficina',
    ips: getLocalIPs(),
    porta: 3000,
    endpoints: {
      mobile_app: '/mobile',
      api:        '/api/jbc/v1',
      sse:        '/api/jbc/v1/mobile/events',
      atendimentos: '/api/jbc/v1/atendimentos'
    },
    ts: new Date().toISOString()
  });
});

// ──────────────────────────────────────────────────────────
// Painel resumido para o celular (mais leve que o dashboard TV)
// ──────────────────────────────────────────────────────────

router.get('/painel', (req, res) => {
  const dados = storage.getDashboardData();
  res.json({ success: true, ...dados });
});

router.get('/entregues', (req, res) => {
  const lista = storage.getEquipamentos('Entregues');
  res.json({ success: true, data: lista });
});

// ──────────────────────────────────────────────────────────
// Atualizações rápidas de atividade (principal ação do técnico)
// ──────────────────────────────────────────────────────────

// Atualizar atividade (estado, descrição, responsável) pelo celular
router.patch('/atividade/:eqId/:srvId/:atvId', (req, res) => {
  const { eqId, srvId, atvId } = req.params;
  const { estado, nota, usuario, descricao, responsavel } = req.body;

  const atv = storage.updateAtividade(eqId, srvId, atvId, { estado, nota, usuario, descricao, responsavel });
  if (!atv) return res.status(404).json({ success: false, message: 'Atividade não encontrada' });

  const dados = storage.getDashboardData();
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: atv, message: 'Atividade atualizada' });
});

// Atualizar estado de serviço pelo celular
router.patch('/servico/:eqId/:srvId', (req, res) => {
  const { eqId, srvId } = req.params;
  const srv = storage.updateServico(eqId, srvId, req.body);
  if (!srv) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });

  const dados = storage.getDashboardData();
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: srv });
});

// Adicionar nota/evidência rápida pelo celular (texto + foto da câmera)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), config.UPLOADS_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, 'mob-' + unique + ext);
  }
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/nota/:eqId', upload.single('foto'), (req, res) => {
  const { eqId } = req.params;
  const { texto, autor, servico_id } = req.body;

  let midiaUrl = '';
  let midiaTipo = null;
  if (req.file) {
    midiaUrl = `/uploads/${req.file.filename}`;
    const mime = (req.file.mimetype || '').toLowerCase();
    midiaTipo = mime.startsWith('video/') ? 'video' : 'foto';
  }

  const msg = storage.addMensagemChat(eqId, {
    texto: texto || '',
    autor: autor || 'Técnico',
    servico_id,
    midia_url: midiaUrl,
    midia_tipo: midiaTipo
  });

  if (!msg) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  const dados = storage.getDashboardData();
  pushUpdate('nota_adicionada', { eqId: parseInt(eqId), msg });
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: msg });
});

// Adicionar nova atividade a um serviço pelo celular
router.post('/atividade/:eqId/:srvId', (req, res) => {
  const { eqId, srvId } = req.params;
  const atv = storage.addAtividade(eqId, srvId, req.body);
  if (!atv) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });

  const dados = storage.getDashboardData();
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: atv, message: 'Atividade adicionada' });
});

// Adicionar novo serviço a um equipamento pelo celular
router.post('/servico/:eqId', (req, res) => {
  const { eqId } = req.params;
  const srv = storage.addServico(eqId, req.body);
  if (!srv) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  const dados = storage.getDashboardData();
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: srv, message: 'Serviço adicionado' });
});

// Atualizar estado operacional do equipamento (ex: recebido → em_execucao)
router.patch('/estado/:eqId', (req, res) => {
  const { eqId } = req.params;
  const { estado, motivo, usuario } = req.body;
  if (!estado) return res.status(400).json({ success: false, message: 'Estado obrigatório' });

  const eq = storage.updateEstado(eqId, estado, motivo, usuario || 'Técnico');
  if (!eq) return res.status(404).json({ success: false, message: 'Equipamento não encontrado' });

  const dados = storage.getDashboardData();
  pushUpdate('painel_atualizado', dados);

  res.json({ success: true, data: eq });
});

// Excluir atividade pelo celular
router.delete('/atividade/:eqId/:srvId/:atvId', (req, res) => {
  const { eqId, srvId, atvId } = req.params;
  const ok = storage.deleteAtividade(eqId, srvId, atvId);
  if (!ok) return res.status(404).json({ success: false, message: 'Atividade não encontrada' });
  res.json({ success: true, message: 'Atividade excluída' });
});

// Excluir serviço pelo celular
router.delete('/servico/:eqId/:srvId', (req, res) => {
  const { eqId, srvId } = req.params;
  const ok = storage.deleteServico(eqId, srvId);
  if (!ok) return res.status(404).json({ success: false, message: 'Serviço não encontrado' });
  res.json({ success: true, message: 'Serviço excluído' });
});

// Listar técnicos para atalhos rápidos/chips
router.get('/tecnicos', (req, res) => {
  const lista = storage.getListaTecnicos();
  res.json({ success: true, data: lista });
});

module.exports = router;
