const http = require('http');

function check(path, checks) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(path, 'Status:', res.statusCode, 'Tamanho:', d.length);
        let allPass = true;
        for (const [name, pattern] of Object.entries(checks)) {
          const pass = typeof pattern === 'string' ? d.includes(pattern) : pattern.test(d);
          console.log('  ', name, '->', pass ? 'PASS' : 'FAIL');
          if (!pass) allPass = false;
        }
        resolve(allPass);
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== VERIFICAÇÃO MODO TV v3.1 (ALTA VISIBILIDADE) ===');
  const h = await check('/', {
    'tv-overlay': 'id="tv-overlay"',
    'tv-zoom-pill': 'tv-zoom-pill',
    'tv-btn-autoscroll': 'id="tv-btn-autoscroll"',
    'tv-clock': 'id="tv-clock"',
    'tv-table-wrap': 'id="tv-table-wrap"',
    'col-acoes': 'col-acoes'
  });

  const c = await check('/css/style.css', {
    '--tv-scale': '--tv-scale: 1.35',
    '.tv-brand-icon-wrap': '.tv-brand-icon-wrap',
    '.tv-tag': '.tv-tag',
    '.tv-row-atrasado': '.tv-row-atrasado',
    '.btn-danger': '.btn-danger',
    '.btn-ghost-danger': '.btn-ghost-danger',
    '4K query': '@media (min-width: 2500px)'
  });

  const j = await check('/js/app.js', {
    'aplicarZoomTv': 'aplicarZoomTv',
    'alterarZoomTv': 'alterarZoomTv',
    'iniciarTvAutoScroll': 'iniciarTvAutoScroll',
    'toggleTvAutoScroll': 'toggleTvAutoScroll',
    'toggleTvFullscreen': 'toggleTvFullscreen',
    '_renderTvLinha': '_renderTvLinha',
    'excluirAtendimento': 'excluirAtendimento',
    'excluirServico': 'excluirServico',
    'excluirAtividade': 'excluirAtividade',
    'Zona de Perigo': 'Zona de Perigo'
  });

  if (h && c && j) {
    console.log('>>> TODOS OS TESTES PASSARAM COM SUCESSO! <<<');
  } else {
    console.error('>>> ALGUNS TESTES FALHARAM! <<<');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
