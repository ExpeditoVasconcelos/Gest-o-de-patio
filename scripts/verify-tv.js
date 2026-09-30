const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- Verificando Servidor e Modo TV ---');
  
  // 1. HTML principal
  const htmlRes = await get('http://localhost:3000/');
  console.log('1. GET / -> Status:', htmlRes.statusCode, '| Tamanho:', htmlRes.body.length, 'bytes');
  console.log('   Contém #tv-monitor-view:', htmlRes.body.includes('id="tv-monitor-view"'));
  console.log('   Contém tv-table-body (Tabela Operacional):', htmlRes.body.includes('id="tv-table-body"'));
  console.log('   Contém tv-slide-service:', htmlRes.body.includes('id="tv-slide-service"'));

  // 2. CSS
  const cssRes = await get('http://localhost:3000/css/style.css');
  console.log('2. GET /css/style.css -> Status:', cssRes.statusCode, '| Tamanho:', cssRes.body.length, 'bytes');
  console.log('   Contém .tv-container.tv-mode:', cssRes.body.includes('.tv-container.tv-mode'));
  console.log('   Contém .tv-ops-table (Tabela com Semáforo):', cssRes.body.includes('.tv-ops-table'));
  console.log('   Contém .tv-sheet-grid:', cssRes.body.includes('.tv-sheet-grid'));

  // 3. JS
  const jsRes = await get('http://localhost:3000/js/app.js');
  console.log('3. GET /js/app.js -> Status:', jsRes.statusCode, '| Tamanho:', jsRes.body.length, 'bytes');
  console.log('   Contém abrirModoTv:', jsRes.body.includes('abrirModoTv'));
  console.log('   Contém renderizarSlideOverviewTv:', jsRes.body.includes('renderizarSlideOverviewTv'));
  console.log('   Contém rotacionarTabelaTv:', jsRes.body.includes('rotacionarTabelaTv'));

  // 4. API TV
  const apiRes = await get('http://localhost:3000/api/jbc/v1/painel/tv');
  console.log('4. GET /api/jbc/v1/painel/tv -> Status:', apiRes.statusCode);
  const json = JSON.parse(apiRes.body);
  console.log('   Success:', json.success);
  console.log('   Totais:', JSON.stringify(json.totais));
  console.log('   Total de Baias:', json.baias ? json.baias.length : 0);
  console.log('   Total de Veículos no Pátio:', json.veiculos ? json.veiculos.length : 0);
  if (json.veiculos && json.veiculos.length > 0) {
    const v1 = json.veiculos[0];
    console.log('   Primeiro Veículo da Fila:', v1.tag, '|', v1.equipamento, '| Baia:', v1.localizacao, '| Etapa:', v1.etapa, '| Atrasado:', v1.atrasado);
    console.log('   Tarefas do 1º Veículo:', v1.tarefas ? v1.tarefas.length : 0, '| Progresso:', v1.progresso_percentual + '%');
  }

  console.log('--- Verificação Concluída com Sucesso! ---');
}

verify().catch(err => {
  console.error('Erro na verificação:', err);
  process.exit(1);
});
