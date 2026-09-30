const http = require('http');

async function runQA() {
  console.log('================================================================');
  console.log('       CENTRAL JB CUNHA - SUÍTE COMPLETA DE Q.A. & RBAC');
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

  function req(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : null;
      const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json'
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
  console.log('\n[1] TESTANDO CABEÇALHOS DE SEGURANÇA E HARDENING...');
  const headRes = await req('GET', '/');
  assert(headRes.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options: nosniff presente');
  assert(headRes.headers['x-frame-options'] === 'SAMEORIGIN', 'Header X-Frame-Options: SAMEORIGIN presente');
  assert(headRes.headers['x-xss-protection'] === '1; mode=block', 'Header X-XSS-Protection presente');
  assert(headRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Header Referrer-Policy presente');

  // 2. Autenticação dos Administradores Padrão
  console.log('\n[2] TESTANDO AUTENTICAÇÃO DOS ADMINISTRADORES...');
  const loginManuel = await req('POST', '/auth/login', { username: 'manuel', password: 'wrongpassword' });
  assert(loginManuel.status === 401, 'Login Manuel com senha errada rejeitado (401)');

  const okManuel = await req('POST', '/auth/login', { username: 'manuel', password: 'jbc@2026' });
  assert(okManuel.status === 200 && okManuel.body.usuario.role === 'admin', 'Login Manuel com sucesso como ADMIN');
  const tokenManuel = okManuel.body.token;

  const okExpedito = await req('POST', '/auth/login', { username: 'expedito', password: 'jbc@2026' });
  assert(okExpedito.status === 200 && okExpedito.body.usuario.role === 'admin', 'Login Expedito com sucesso como ADMIN');
  const tokenExpedito = okExpedito.body.token;

  // 3. Gestão de Usuários (Admin apenas)
  console.log('\n[3] TESTANDO GESTÃO DE USUÁRIOS E CONTROLE RBAC...');
  const timestamp = Date.now();
  const novoUsuarioData = {
    nome: 'Operador Teste ' + timestamp,
    username: 'operador_' + timestamp,
    password: 'senhaSegura123!',
    role: 'usuario'
  };
  const resCriarOp = await req('POST', '/usuarios', novoUsuarioData, tokenManuel);
  assert(resCriarOp.status === 201 && resCriarOp.body.usuario.role === 'usuario', 'Admin Manuel criou novo usuário Operador com sucesso');
  const opId = resCriarOp.body.usuario.id;

  const novoClienteData = {
    nome: 'Cliente Vale ' + timestamp,
    username: 'cliente_vale_' + timestamp,
    password: 'senhaSegura123!',
    role: 'cliente',
    empresa_vinculada: 'Vale Logística'
  };
  const resCriarCli = await req('POST', '/usuarios', novoClienteData, tokenManuel);
  assert(resCriarCli.status === 201 && resCriarCli.body.usuario.empresa_vinculada === 'Vale Logística', 'Admin Manuel criou novo Cliente vinculado à Vale Logística');
  const cliId = resCriarCli.body.usuario.id;

  // Logins dos novos usuários
  const loginOp = await req('POST', '/auth/login', { username: novoUsuarioData.username, password: novoUsuarioData.password });
  const tokenOp = loginOp.body.token;

  const loginCli = await req('POST', '/auth/login', { username: novoClienteData.username, password: novoClienteData.password });
  const tokenCli = loginCli.body.token;

  // 4. Testes de Permissões Negativas (Operador e Cliente não podem gerenciar usuários)
  console.log('\n[4] TESTANDO BLOQUEIOS DE ACESSO A USUÁRIOS PARA NÃO-ADMINS...');
  const opTentaUsuarios = await req('GET', '/usuarios', null, tokenOp);
  assert(opTentaUsuarios.status === 403, 'Operador proibido de listar usuários (403)');

  const opTentaCriarUser = await req('POST', '/usuarios', { username: 'hacker', role: 'admin' }, tokenOp);
  assert(opTentaCriarUser.status === 403, 'Operador proibido de criar usuários (403)');

  const cliTentaUsuarios = await req('GET', '/usuarios', null, tokenCli);
  assert(cliTentaUsuarios.status === 403, 'Cliente proibido de listar usuários (403)');

  // 5. Testes de Permissões em Compras Diretas (Apenas Admin)
  console.log('\n[5] TESTANDO MÓDULO DE COMPRAS DIRETAS...');
  const adminCompras = await req('GET', '/compras', null, tokenManuel);
  assert(adminCompras.status === 200, 'Admin acessa lista de compras (200)');

  const opCompras = await req('GET', '/compras', null, tokenOp);
  assert(opCompras.status === 403, 'Operador bloqueado de ver compras (403)');

  const cliCompras = await req('GET', '/compras', null, tokenCli);
  assert(cliCompras.status === 403, 'Cliente bloqueado de ver compras (403)');

  // 6. Teste de Atendimentos e Segregação de Clientes
  console.log('\n[6] TESTANDO ISOLAMENTO MULTI-EMPRESA E ATENDIMENTOS...');
  // Criar 1 atendimento para Vale Logistica e 1 para Mineradora Sol
  const atVale = await req('POST', '/atendimentos', {
    placa: 'VALE' + String(timestamp).slice(-4),
    empresa: 'Vale Logística',
    equipamento: 'Caminhão Fora de Estrada 777G',
    tipo_servico: 'Mecânica Pesada',
    observacoes: 'Troca de comando final',
    itens_compra_direta: [{ item: 'Filtro Hidráulico', valor_estimado: 4500 }]
  }, tokenManuel);
  assert(atVale.status === 201, 'Criado veículo para Vale Logística com custo direto informado');
  const idVale = (atVale.body.data && atVale.body.data.id) || atVale.body.id;

  const atOutra = await req('POST', '/atendimentos', {
    placa: 'OUTR' + String(timestamp).slice(-4),
    empresa: 'Mineradora Sol',
    equipamento: 'Escavadeira Hidráulica 349D',
    tipo_servico: 'Hidráulica',
    observacoes: 'Vazamento no cilindro da lança',
    itens_compra_direta: [{ item: 'Kit Vedação Parker', valor_estimado: 8900 }]
  }, tokenManuel);
  assert(atOutra.status === 201, 'Criado veículo para Mineradora Sol');
  const idOutra = (atOutra.body.data && atOutra.body.data.id) || atOutra.body.id;

  // Consulta do Cliente Vale:
  const cliLista = await req('GET', '/atendimentos', null, tokenCli);
  const listaVeiculos = Array.isArray(cliLista.body) ? cliLista.body : (cliLista.body.data || []);
  assert(cliLista.status === 200 && Array.isArray(listaVeiculos), 'Cliente busca lista de atendimentos');
  const contemOutra = listaVeiculos.some(a => (a.empresa || a.cliente) === 'Mineradora Sol');
  const contemVale = listaVeiculos.some(a => a.id === idVale);
  assert(!contemOutra, 'Cliente Vale NÃO enxerga veículos da Mineradora Sol na lista');
  assert(contemVale, 'Cliente Vale enxerga seu veículo da Vale Logística');

  // Verificar se custos_diretos foram sanitizados para o cliente
  const itemValeDoCli = listaVeiculos.find(a => a.id === idVale);
  assert(itemValeDoCli && itemValeDoCli.custos_diretos === undefined, 'Custos diretos confidenciais removidos do payload do Cliente');

  // Tentativa de inspeção direta de veículo de outra empresa por ID:
  const cliInspecionaOutra = await req('GET', '/atendimentos/' + idOutra, null, tokenCli);
  assert(cliInspecionaOutra.status === 403, 'Cliente tentando inspecionar veículo de outra empresa bloqueado com 403 Forbidden');

  // Cliente tentando criar atendimento:
  const cliTentaCriar = await req('POST', '/atendimentos', { placa: 'HACK001', empresa: 'Vale Logística' }, tokenCli);
  assert(cliTentaCriar.status === 403, 'Cliente proibido de criar novo atendimento (403)');

  // Operador pode criar e editar atendimento
  const opCriaAt = await req('POST', '/atendimentos', {
    placa: 'OPER' + String(timestamp).slice(-4),
    empresa: 'Vale Logística',
    equipamento: 'Trator D6T'
  }, tokenOp);
  assert(opCriaAt.status === 201, 'Operador pode criar atendimento');
  const idOpAt = (opCriaAt.body.data && opCriaAt.body.data.id) || opCriaAt.body.id;

  // Operador tentando excluir atendimento (só admin pode)
  const opExclui = await req('DELETE', '/atendimentos/' + idOpAt, null, tokenOp);
  assert(opExclui.status === 403, 'Operador proibido de deletar atendimento (403)');

  const adminExclui = await req('DELETE', '/atendimentos/' + idOpAt, null, tokenManuel);
  assert(adminExclui.status === 200, 'Admin pode deletar atendimento');

  // 7. Limpeza dos registros temporários
  await req('DELETE', '/usuarios/' + opId, null, tokenManuel);
  await req('DELETE', '/usuarios/' + cliId, null, tokenManuel);
  await req('DELETE', '/atendimentos/' + idVale, null, tokenManuel);
  await req('DELETE', '/atendimentos/' + idOutra, null, tokenManuel);
  console.log('\n[7] Registros temporários de teste removidos com sucesso.');

  console.log('\n======================================================');
  console.log('RESULTADO FINAL DO Q.A: ' + passes + ' PASSOU | ' + failures + ' FALHOU');
  console.log('======================================================');
}

runQA().catch(console.error);
