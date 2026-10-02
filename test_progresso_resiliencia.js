/**
 * Teste Automatizado de Resiliência de Dados e Cálculo Inteligente de Progresso
 * Valida a não regressão no mobile e persistência contínua em produção
 */
const assert = require('assert');
const storage = require('./api-gateway/src/services/storage');

async function testarProgressoEResiliencia() {
  console.log('--- INICIANDO TESTE DE PROGRESSO E RESILIÊNCIA OPERACIONAL ---');

  // 1. Veículo recém-recebido sem serviços
  const v1 = storage.createEquipamento({
    tag: 'TESTE-01',
    equipamento: 'Caminhão Teste',
    empresa: 'Cliente Teste',
    estado: 'recebido'
  });
  assert.strictEqual(v1.progresso, 0, 'Veículo recebido deve ter 0% de progresso');
  console.log('✅ [1] Veículo recebido sem serviços inicia com 0%');

  // 2. Veículo com serviços em andamento (sem atividades filhas)
  const srv1 = storage.addServico(v1.id, {
    titulo: 'Revisão do motor',
    estado: 'em_execucao'
  });
  const srv2 = storage.addServico(v1.id, {
    titulo: 'Troca de óleo',
    estado: 'concluida'
  });
  const v1Atualizado = storage.getEquipamentoById(v1.id);
  // srv1: em_execucao = 50%, srv2: concluida = 100% -> média = 75%
  assert.strictEqual(v1Atualizado.progresso, 75, `Progresso por serviços sem atividades deve ser 75% (obteve ${v1Atualizado.progresso}%)`);
  console.log('✅ [2] Progresso por múltiplos serviços sem sub-atividades calculado corretamente (75%)');

  // 3. Adicionar atividades a um serviço e validar cálculo proporcional
  storage.addAtividade(v1.id, srv1.id, { descricao: 'Desmontar cabeçote', estado: 'concluida' });
  storage.addAtividade(v1.id, srv1.id, { descricao: 'Retificar bloco', estado: 'em_andamento' });
  storage.addAtividade(v1.id, srv1.id, { descricao: 'Montar cabeçote', estado: 'pendente' });
  const v1ComAtvs = storage.getEquipamentoById(v1.id);
  // Total atividades: 3, concluídas: 1 -> 33%
  assert.strictEqual(v1ComAtvs.progresso, 33, `Progresso com atividades filhas deve ser 33% (obteve ${v1ComAtvs.progresso}%)`);
  console.log('✅ [3] Progresso refinado por atividades calculou 33%');

  // 4. Testar persistência de progresso manual / estimado
  storage.updateEquipamento(v1.id, { progresso: 60 });
  const v1Manual = storage.getEquipamentoById(v1.id);
  assert.strictEqual(v1Manual.progresso, 33, 'Como há atividades cadastradas, o cálculo exato de atividades prevalece');

  // 5. Testar veículo sem atividades com override manual
  const v2 = storage.createEquipamento({
    tag: 'TESTE-02',
    equipamento: 'Trator Teste',
    empresa: 'Cliente B',
    estado: 'em_execucao',
    progresso: 70
  });
  assert.strictEqual(v2.progresso, 70, 'Progresso manual preservado quando informado');
  console.log('✅ [4] Progresso manual preservado com sucesso');

  // 6. Testar marcação de 'pronto'
  storage.updateEstado(v1.id, 'pronto');
  const v1Pronto = storage.getEquipamentoById(v1.id);
  assert.strictEqual(v1Pronto.progresso, 100, 'Equipamento pronto deve ter sempre 100% de progresso');
  console.log('✅ [5] Equipamento pronto atingiu 100% automaticamente');

  // 7. Testar sincronização sem perda de dados (merge com GLPI)
  const ticketsSimuladosGlpi = [
    {
      id: v1.id,
      name: 'Caminhão Teste',
      tag: 'TESTE-01',
      status: 1, // status 1 no GLPI ('recebido')
      locations_id: 1,
      resp_cliente: 'Cliente Teste',
      responsavel_tecnico: '', // GLPI vem vazio
      servicos: [
        { id: srv1.id, titulo: 'Revisão do motor', estado: 'pendente', atividades: [] } // GLPI vem sem atividades
      ]
    }
  ];

  storage.sincronizarComGlpi(ticketsSimuladosGlpi);
  const v1PosSync = storage.getEquipamentoById(v1.id);
  const srv1PosSync = v1PosSync.servicos.find(s => s.id === srv1.id);

  assert.ok(srv1PosSync.atividades && srv1PosSync.atividades.length === 3, 'Atividades NÃO devem ser apagadas pelo sync com o GLPI');
  assert.strictEqual(v1PosSync.estado, 'pronto', 'Estado detalhado da oficina NÃO deve ser rebaixado para "recebido" pelo GLPI');
  console.log('✅ [6] Sincronização resiliente com GLPI preservou 100% das atividades e estado rico');

  // Limpeza
  storage.deleteEquipamento(v1.id);
  storage.deleteEquipamento(v2.id);
  console.log('✅ [7] Limpeza concluída');
  console.log('\n>>> TODOS OS TESTES DE PROGRESSO E RESILIÊNCIA PASSARAM COM SUCESSO! <<<');
}

testarProgressoEResiliencia().catch(err => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
