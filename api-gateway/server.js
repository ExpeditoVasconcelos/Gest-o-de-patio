const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('./src/config');
const storage = require('./src/services/storage');
const atendimentosRoutes = require('./src/routes/atendimentos');
const mobileRoutes = require('./src/routes/mobile');
const comprasRoutes = require('./src/routes/compras');
const authRoutes = require('./src/routes/auth');
const usuariosRoutes = require('./src/routes/usuarios');

const app = express();
app.disable('x-powered-by');

// Hardening de Cabeçalhos de Segurança HTTP (NIST CSF PR.PT)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// Rate Limiter Global para proteção contra DoS (NIST CSF PR.PT)
const apiRequestCounts = new Map();
const API_RATE_LIMIT = 240; // 240 requisições por minuto por IP
const API_WINDOW_MS = 60 * 1000;

setInterval(() => {
  const agora = Date.now();
  for (const [ip, data] of apiRequestCounts.entries()) {
    if (agora > data.resetTime) apiRequestCounts.delete(ip);
  }
}, 60 * 1000).unref();

function apiRateLimiter(req, res, next) {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
  const agora = Date.now();

  let entry = apiRequestCounts.get(ip);
  if (!entry || agora > entry.resetTime) {
    entry = { count: 1, resetTime: agora + API_WINDOW_MS };
    apiRequestCounts.set(ip, entry);
  } else {
    entry.count += 1;
  }

  res.setHeader('X-RateLimit-Limit', API_RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, API_RATE_LIMIT - entry.count));

  if (entry.count > API_RATE_LIMIT) {
    console.warn(`[SEC-ALERT][API_DOS] IP ${ip} ultrapassou o limite global de requisições da API (${entry.count}/${API_RATE_LIMIT}).`);
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições enviadas em curto intervalo. Aguarde alguns instantes.'
    });
  }

  next();
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log em tempo real de conexões recebidas (diagnóstico de rede)
app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const time = new Date().toLocaleTimeString('pt-BR');
  if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/assets') && !req.url.startsWith('/favicon')) {
    console.log(`[${time}] 📡 Conexão recebida: ${req.method} ${req.url} — De: ${clientIp}`);
  }
  next();
});

// Rota de teste/diagnóstico rápido
app.get('/ping', (req, res) => {
  res.type('text/plain').send('PONG - Servidor JB Cunha online e respondendo!');
});

// Uploads e arquivos estáticos
const uploadsPath = config.UPLOADS_DIR;
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Redirecionamento automático de aparelhos móveis para /mobile caso acessem a raiz
app.get('/', (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isMobile && !req.query.nomobile) {
    return res.redirect('/mobile');
  }
  next();
});

// App Mobile — servido em /mobile (arquivo único HTML, sem SPA routing)
const mobilePath = path.join(__dirname, '..', 'web-app', 'mobile.html');
app.get('/mobile', (req, res) => {
  res.sendFile(mobilePath);
});

app.use(express.static(path.join(__dirname, '..', 'web-app'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Rotas da API com Rate Limiter ativo
const apiRouter = express.Router();
apiRouter.use(apiRateLimiter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/usuarios', usuariosRoutes);
apiRouter.use('/atendimentos', atendimentosRoutes);
apiRouter.use('/mobile', mobileRoutes);
apiRouter.use('/compras', comprasRoutes);

// Aliases na raiz para total compatibilidade
app.use('/auth', apiRateLimiter, authRoutes);
app.use('/usuarios', apiRateLimiter, usuariosRoutes);
app.use('/atendimentos', apiRateLimiter, atendimentosRoutes);
app.use('/compras', apiRateLimiter, comprasRoutes);

// Conectar pushUpdate do SSE ao módulo de compras
comprasRoutes.setPushUpdate(mobileRoutes.pushUpdate);

// Dashboard — Modo TV e Painel Operacional
apiRouter.get('/painel/tv', (req, res) => {
  const dados = storage.getDashboardData();
  res.json({
    success: true,
    totais: dados.totais,
    equipamentos: dados.equipamentos,
    timestamp: dados.timestamp
  });
});

// Status do sistema
apiRouter.get('/status', (req, res) => {
  res.json({
    sistema: 'Central de Operações JB Cunha',
    versao: '3.1.0',
    status: 'operacional',
    ips: getLocalIPs(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/jbc/v1', apiRouter);

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'index.html'));
});

// Helper: pega IPs reais locais da rede Wi-Fi/Ethernet (filtrando loopbacks e plugins bancarios como Topaz/Warsaw)
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  Object.keys(nets).forEach(name => {
    if (/topaz|warsaw|loopback|bluetooth|virtual|pseudo/i.test(name)) return;
    (nets[name] || []).forEach(a => {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254')) {
        if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(a.address)) {
          ips.unshift(a.address);
        } else {
          ips.push(a.address);
        }
      }
    });
  });
  return Array.from(new Set(ips));
}

const PORT = config.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  const lanIp = ips[0] || 'localhost';

  console.log('================================================================');
  console.log('  CENTRAL DE OPERAÇÕES JB CUNHA — v3.1 (PRODUÇÃO READY)');
  console.log(`  Painel Desktop:  http://localhost:${PORT}`);
  console.log(`  Modo TV:         http://localhost:${PORT}/#tv`);
  console.log('----------------------------------------------------------------');
  console.log('  ACESSO PELA REDE Wi-Fi (celulares dos técnicos):');
  ips.forEach(ip => {
    console.log(`  Opção 1 (Porta 3000): http://${ip}:${PORT}/mobile`);
    console.log(`  Opção 2 (Porta 80):   http://${ip}/mobile`);
  });
  console.log('  QR Code gerado automaticamente no App Mobile');
  console.log('================================================================');
});

// Suporte adicional e opcional na porta padrão 80 (permite acessar sem digitar :3000)
try {
  const server80 = app.listen(80, '0.0.0.0', () => {
    console.log('  [PORTA 80 ATIVA] Celulares podem digitar apenas o IP sem ":3000"!');
  });
  server80.on('error', (err) => {
    // Porta 80 já em uso ou restrita, mantendo apenas 3000
  });
} catch (e) {}

// Encerramento seguro para Docker, PM2 e VPS (Graceful Shutdown)
function gracefulShutdown(signal) {
  console.log(`\n[Servidor] Recebido sinal ${signal}. Encerrando conexões e persistindo dados...`);
  try {
    storage.save();
  } catch (_) {}
  server.close(() => {
    console.log('[Servidor] Encerrado com sucesso.');
    process.exit(0);
  });
  setTimeout(() => {
    console.warn('[Servidor] Encerramento forçado após timeout.');
    process.exit(0);
  }, 4000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


