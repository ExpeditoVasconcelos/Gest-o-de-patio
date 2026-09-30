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

// Hardening de Cabeçalhos de Segurança HTTP
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Rotas da API
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/usuarios', usuariosRoutes);
apiRouter.use('/atendimentos', atendimentosRoutes);
apiRouter.use('/mobile', mobileRoutes);
apiRouter.use('/compras', comprasRoutes);

// Aliases na raiz para total compatibilidade
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/atendimentos', atendimentosRoutes);
app.use('/compras', comprasRoutes);

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
    timestamp: new Date().toISOString()
  });
});

app.use('/api/jbc/v1', apiRouter);

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'index.html'));
});

// Helper: pega IPs locais da rede (excluindo loopback)
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

const PORT = config.PORT;
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  const lanIp = ips[0] || 'localhost';

  console.log('================================================================');
  console.log('  CENTRAL DE OPERAÇÕES JB CUNHA — v3.1');
  console.log(`  Painel Desktop:  http://localhost:${PORT}`);
  console.log(`  Modo TV:         http://localhost:${PORT}/#tv`);
  console.log('----------------------------------------------------------------');
  console.log('  ACESSO PELA REDE Wi-Fi (celulares dos técnicos):');
  ips.forEach(ip => {
    console.log(`  App Mobile:      http://${ip}:${PORT}/mobile`);
  });
  console.log('  QR Code gerado automaticamente no App Mobile');
  console.log('================================================================');
});
