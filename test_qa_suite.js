const http = require('http');

async function runQA() {
  console.log('================================================================');
  console.log('  CENTRAL JB CUNHA — SUÍTE INTEGRADA DE Q.A., RBAC & DEVSECOPS');
  console.log('================================================================');
  let failures = 0;
  let passes = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log('  [PASS] ' + msg);
      passes++;
    } else {
      console.error('  [FAIL] ' + msg);
      failures++;
    }
  }

  function req(method, path, data = null, token = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : null;
      const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      if (token) options.headers['Authorization'] = 'Bearer ' + token;
      if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

      const request = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(body); } catch(e) { parsed = body; }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });
      request.on('error', reject);
      if (payload) request.write(payload);
      request.end();
    });
  }

  // 1. Hardening & Security Headers
  console.log('\n[1] TESTANDO CABEÇALHOS DE SEGURANÇA E HARDENING (DEVSECOPS)...');
  const headRes = await req('GET', '/');
  assert(headRes.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options: nosniff presente');
  assert(headRes.headers['x-frame-options'] === 'SAMEORIGIN', 'Header X-Frame-Options: SAMEORIGIN presente');
  assert(headRes.headers['x-xss-protection'] === '1; mode=block', 'Header X-XSS-Protection presente');
  assert(headRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Header Referrer-Policy presente');

  // 2. Autenticação e Contas Padrão (Aprovadores e Solicitantes)
  console.log('\n[2] TESTANDO AUTENTICAÇÃO E PERFIS PADRÃO (APROVADORES E SOLICITANTES)...');
  const loginManuelFail = await req('POST', '/auth/login', { username: 'manuel', password: 'wrongpassword' });
  assert(loginManuelFail.status === 401, 'Login incorreto rejeitado com 401 Unauthorized');

  const okManuel = await req('POST', '/auth/login', { username: 'manuel', password: 'jbc@2026' });
  assert(okManuel.status === 200 && okManuel.body.usuario.role === 'admin', 'Login Manuel com sucesso como APROVADOR (admin)');
  const tokenManuel = okManuel.body.token;

  const okExpedito = await req('POST', '/auth/login', { username: 'expedito', password: 'jbc@2026' });
  assert(okExpedito.status === 200 && okExpedito.body.usuario.role === 'admin', 'Login Expedito com sucesso como APROVADOR (admin)');
  const tokenExpedito = okExpedito.body.token;

  const okOperador = await req('POST', '/auth/login', { username: 'operador', password: 'jbc@2026' });
  assert(okOperador.status === 200 && okOperador.body.usuario.role === 'usuario', 'Login Operador com sucesso como SOLICITANTE (usuario)');
  const tokenOperador = okOperador.body.token;

  // 3. Validação de Tokens JWT / HMAC Tampering
  console.log('\n[3] TESTANDO SEGURANÇA DE TOKENS E ADULTERAÇÃO (TAMPERING)...');
  const tokenAdulterado = tokenManuel.slice(0, -6) + 'abcdef';
  const resTampered = await req('GET', '/auth/me', null, tokenAdulterado);
  assert(resTampered.status === 401, 'Token adulterado rejeitado pelo servidor (401)');

  const resSemToken = await req('GET', '/auth/me');
  assert(resSemToken.status === 401, 'Requisição sem token bloqueada (401)');

  // 4. Criação Dinâmica de Usuários e RBAC
  console.log('\n[4] TESTANDO GESTÃO DE USUÁRIOS E PERMISSÕES ADMINISTRATIVAS...');
  const timestamp = Date.now();
  const novoOpData = {
    nome: 'Técnico Solicitante ' + timestamp,
    username: 'tecnico_' + timestamp,
    password: 'senhaForte123!',
    role: 'usuario'
  };
  const resCriarOp = await req('POST', '/usuarios', novoOpData, tokenManuel);
  assert(resCriarOp.status === 201 && resCriarOp.body.usuario.role === 'usuario', 'Admin criou novo Técnico Solicitante');
  const novoOpId = resCriarOp.body.usuario.id;

  const novoCliData = {
    nome: 'Cliente Vale ' + timestamp,
    username: 'cliente_vale_' + timestamp,
    password: 'senhaForte123!',
    role: 'cliente',
    empresa_vinculada: 'Vale Logística'
  };
  const resCriarCli = await req('POST', '/usuarios', novoCliData, tokenManuel);
  assert(resCriarCli.status === 201 && resCriarCli.body.usuario.empresa_vinculada === 'Vale Logística', 'Admin criou novo Cliente vinculado à Vale Logística');
  const novoCliId = resCriarCli.body.usuario.id;

  const loginNovoOp = await req('POST', '/auth/login', { username: novoOpData.username, password: novoOpData.password });
  const tokenNovoOp = loginNovoOp.body.token;

  const loginNovoCli = await req('POST', '/auth/login', { username: novoCliData.username, password: novoCliData.password });
  const tokenNovoCli = loginNovoCli.body.token;

  // 5. Testes de Bloqueio em /usuarios para não-admins
  console.log('\n[5] TESTANDO BLOQUEIOS DE ACESSO A USUÁRIOS PARA NÃO-ADMINS...');
  const opTentaListar = await req('GET', '/usuarios', null, tokenNovoOp);
  assert(opTentaListar.status === 403, 'Operador/Solicitante bloqueado de listar usuários (403)');

  const opTentaCriar = await req('POST', '/usuarios', { username: 'hacker', role: 'admin' }, tokenNovoOp);
  assert(opTentaCriar.status === 403, 'Operador/Solicitante bloqueado de criar usuários (403)');

  const cliTentaListar = await req('GET', '/usuarios', null, tokenNovoCli);
  assert(cliTentaListar.status === 403, 'Cliente bloqueado de listar usuários (403)');

  // 6. Fluxo Completo de Compras Diretas: Solicitante vs Aprovador
  console.log('\n[6] TESTANDO FLUXO COMPLETO: SOLICITANTE vs APROVADOR...');
  // A) Solicitante (usuario) consulta lista de compras e pendências
  const opConsultaCompras = await req('GET', '/compras', null, tokenNovoOp);
  assert(opConsultaCompras.status === 200, 'Solicitante tem permissão para visualizar lista de compras (200)');

  const opCountPendentes = await req('GET', '/compras/pendentes/count', null, tokenNovoOp);
  assert(opCountPendentes.status === 200 && typeof opCountPendentes.body.count === 'number', 'Solicitante tem acesso ao contador de pendências (200)');

  // B) Solicitante (usuario) solicita nova compra de peça
  const resSolicitarCompra = await req('POST', '/compras', {
    solicitante: novoOpData.nome,
    descricao: 'Sensor de Pressão Danfoss 0-250 bar (Teste QA)',
    valor_estimado: 1850.00,
    rateio: 'igual'
  }, tokenNovoOp);
  assert(resSolicitarCompra.status === 201 && resSolicitarCompra.body.data.id, 'Solicitante criou nova requisição de compra com sucesso (201)');
  const compraId = resSolicitarCompra.body.data.id;

  // C) Solicitante tenta aprovar a própria compra (DEVE SER BLOQUEADO)
  const opTentaAprovar = await req('PATCH', `/compras/${compraId}/autorizar`, {
    valor_final: 1700.00,
    obs_aprovador: 'Auto-aprovação indevida'
  }, tokenNovoOp);
  assert(opTentaAprovar.status === 403, 'Solicitante ESTRITAMENTE BLOQUEADO de aprovar compras (403 Forbidden)');

  // D) Solicitante tenta declinar compra (DEVE SER BLOQUEADO)
  const opTentaDeclinar = await req('PATCH', `/compras/${compraId}/declinar`, {
    motivo_declinio: 'Tentativa indevida'
  }, tokenNovoOp);
  assert(opTentaDeclinar.status === 403, 'Solicitante ESTRITAMENTE BLOQUEADO de declinar compras (403 Forbidden)');

  // E) Solicitante tenta excluir compra (DEVE SER BLOQUEADO)
  const opTentaExcluir = await req('DELETE', `/compras/${compraId}`, null, tokenNovoOp);
  assert(opTentaExcluir.status === 403, 'Solicitante ESTRITAMENTE BLOQUEADO de excluir compras (403 Forbidden)');

  // F) Cliente tenta acessar compras (DEVE SER TOTALMENTE BLOQUEADO)
  const cliTentaCompras = await req('GET', '/compras', null, tokenNovoCli);
  assert(cliTentaCompras.status === 403, 'Cliente bloqueado de acessar módulo de compras (403)');

  // G) Aprovador (Admin Manuel) autoriza a compra com valor final negociado
  const resAprovar = await req('PATCH', `/compras/${compraId}/autorizar`, {
    valor_final: 1650.00,
    obs_aprovador: 'Preço negociado com distribuidor autorizado'
  }, tokenManuel);
  assert(resAprovar.status === 200 && resAprovar.body.data.status === 'autorizado', 'Aprovador (Manuel) aprovou a compra com sucesso (200)');
  assert(resAprovar.body.data.autorizado_por === 'Manuel', 'Nome do aprovador registrado corretamente na compra');

  // H) Limpeza da compra de teste pelo aprovador
  const resExcluirCompra = await req('DELETE', `/compras/${compraId}`, null, tokenManuel);
  assert(resExcluirCompra.status === 200, 'Aprovador excluiu a compra de teste');

  // 7. Isolamento Multi-Empresa e Regras de Negócio de Atendimentos
  console.log('\n[7] TESTANDO ISOLAMENTO MULTI-EMPRESA E ATENDIMENTOS NO PÁTIO...');
  const atVale = await req('POST', '/atendimentos', {
    placa: 'VALE' + String(timestamp).slice(-4),
    empresa: 'Vale Logística',
    equipamento: 'Caminhão Fora de Estrada 777G',
    tipo_servico: 'Mecânica Pesada',
    observacoes: 'Troca de comando final',
    custos_diretos: 4500
  }, tokenManuel);
  assert(atVale.status === 201, 'Criado veículo para Vale Logística com custo direto confidencial');
  const idVale = (atVale.body.data && atVale.body.data.id) || atVale.body.id;

  const atOutra = await req('POST', '/atendimentos', {
    placa: 'OUTR' + String(timestamp).slice(-4),
    empresa: 'Mineradora Sol',
    equipamento: 'Escavadeira Hidráulica 349D',
    tipo_servico: 'Hidráulica',
    observacoes: 'Vazamento no cilindro'
  }, tokenManuel);
  assert(atOutra.status === 201, 'Criado veículo para Mineradora Sol');
  const idOutra = (atOutra.body.data && atOutra.body.data.id) || atOutra.body.id;

  // Consulta do Cliente Vale:
  const cliLista = await req('GET', '/atendimentos', null, tokenNovoCli);
  const listaVeiculos = Array.isArray(cliLista.body) ? cliLista.body : (cliLista.body.data || []);
  const contemOutra = listaVeiculos.some(a => (a.empresa || a.cliente) === 'Mineradora Sol');
  const contemVale = listaVeiculos.some(a => a.id === idVale);
  assert(!contemOutra, 'Cliente Vale NÃO enxerga veículos de outras empresas');
  assert(contemVale, 'Cliente Vale enxerga seus próprios veículos');

  const itemValeDoCli = listaVeiculos.find(a => a.id === idVale);
  assert(itemValeDoCli && itemValeDoCli.custos_diretos === undefined, 'Custos confidenciais devidamente filtrados para o Cliente');

  const cliInspecionaOutra = await req('GET', `/atendimentos/${idOutra}`, null, tokenNovoCli);
  assert(cliInspecionaOutra.status === 403, 'Tentativa de inspecionar veículo de terceiro bloqueada (403)');

  const cliTentaCriar = await req('POST', '/atendimentos', { placa: 'HACK001', empresa: 'Vale Logística' }, tokenNovoCli);
  assert(cliTentaCriar.status === 403, 'Cliente bloqueado de cadastrar novos atendimentos (403)');

  // Operador cria e manipula atendimento no pátio
  const opCriaAt = await req('POST', '/atendimentos', {
    placa: 'OPER' + String(timestamp).slice(-4),
    empresa: 'Vale Logística',
    equipamento: 'Trator D6T'
  }, tokenNovoOp);
  assert(opCriaAt.status === 201, 'Operador/Solicitante tem permissão para cadastrar atendimento no pátio');
  const idOpAt = (opCriaAt.body.data && opCriaAt.body.data.id) || opCriaAt.body.id;

  const opExclui = await req('DELETE', `/atendimentos/${idOpAt}`, null, tokenNovoOp);
  assert(opExclui.status === 403, 'Operador bloqueado de deletar atendimentos (403)');

  const adminExclui = await req('DELETE', `/atendimentos/${idOpAt}`, null, tokenManuel);
  assert(adminExclui.status === 200, 'Apenas Administrador pode excluir atendimentos');

  // 8. Limpeza de registros de teste
  await req('DELETE', `/usuarios/${novoOpId}`, null, tokenManuel);
  await req('DELETE', `/usuarios/${novoCliId}`, null, tokenManuel);
  await req('DELETE', `/atendimentos/${idVale}`, null, tokenManuel);
  await req('DELETE', `/atendimentos/${idOutra}`, null, tokenManuel);
  console.log('\n[8] Registros temporários do teste devidamente higienizados.');

  console.log('\n======================================================');
  console.log(`RESULTADO FINAL DO Q.A: ${passes} PASSOU | ${failures} FALHOU`);
  console.log('======================================================');

  if (failures > 0) {
    process.exit(1);
  }
}

runQA().catch(err => {
  console.error('[ERRO FATAL NA EXECUÇÃO DO Q.A]', err);
  process.exit(1);
});
