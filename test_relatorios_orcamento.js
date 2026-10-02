/**
 * Validação Automatizada de Orçamentos, Telemetria (Placa, Horímetro, KM) e Relatórios BI
 */
const assert = require('assert');
const storage = require('./api-gateway/src/services/storage');

async function testarModuloRelatorios() {
  console.log('--- TESTANDO MÓDULO DE ORÇAMENTOS E RELATÓRIOS ---');

  // 1. Criar veículo com placa, horímetro e km
  const payloadVeiculo = {
    equipamento: 'Motoniveladora CAT 140K',
    tag: 'MN-099',
    placa: 'BRA2E19',
    horimetro: '3.450 h',
    km: '42.100 km',
    empresa: 'Vale Logística',
    responsavel_cliente: 'Fábio Gerente',
    responsavel_tecnico: 'Jairo Engenheiro',
    queixa_inicial: 'Vazamento no cilindro hidráulico da lâmina'
  };

  const veiculoCriado = storage.createEquipamento(payloadVeiculo);
  assert.ok(veiculoCriado && veiculoCriado.id, 'Veículo deve ser criado com ID');
  assert.strictEqual(veiculoCriado.placa, 'BRA2E19', 'Placa deve ser salva em maiúsculas');
  assert.strictEqual(veiculoCriado.horimetro, '3.450 h', 'Horímetro deve ser preservado');
  assert.strictEqual(veiculoCriado.km, '42.100 km', 'KM deve ser preservado');
  console.log('✅ [1] Veículo com Placa, Horímetro e KM criado e validado com sucesso.');

  // 2. Adicionar Serviços com valor de mão de obra e horas
  const servico1 = storage.addServico(veiculoCriado.id, {
    titulo: 'Desmontagem e brunimento de cilindro',
    descricao: 'Usinagem de haste e substituição de gaxetas',
    responsavel: 'João Mecânico',
    horas: 8.5,
    valor: 1850.00
  });
  assert.ok(servico1 && servico1.id, 'Serviço 1 deve ser criado');
  assert.strictEqual(servico1.valor, 1850.00, 'Valor de mão de obra deve ser salvo');
  assert.strictEqual(servico1.horas, 8.5, 'Horas devem ser salvas');

  const servico2 = storage.addServico(veiculoCriado.id, {
    titulo: 'Troca de vedações e pressurização hidrostática',
    responsavel: 'Carlos Técnico',
    horas: 4.0,
    valor: 920.00
  });
  assert.ok(servico2 && servico2.id, 'Serviço 2 deve ser criado');
  assert.strictEqual(servico2.valor, 920.00, 'Valor de mão de obra do serviço 2 salvo');
  console.log('✅ [2] Serviços com valor de mão de obra e horas vinculados com sucesso.');

  // 3. Vincular Peças e Insumos via Compra Direta
  const compra = storage.createCompraDireta({
    solicitante: 'João Mecânico',
    descricao: 'Kit de vedação Parker e óleo hidráulico ISO 68',
    valor_estimado: 1400.00,
    equipamentos_ids: [veiculoCriado.id]
  });
  assert.ok(compra && compra.id, 'Compra direta criada');

  // Autorizar compra para atribuir custo direto ao veículo
  storage.autorizarCompraDireta(compra.id, {
    valor_final: 1350.50,
    autorizado_por: 'Manuel'
  });

  const veiculoAtualizado = storage.getEquipamentoById(veiculoCriado.id);
  assert.ok(Array.isArray(veiculoAtualizado.custos_diretos), 'custos_diretos deve ser array');
  assert.strictEqual(veiculoAtualizado.custos_diretos.length, 1, 'Deve ter 1 compra atribuída');
  assert.strictEqual(veiculoAtualizado.custos_diretos[0].valor_atribuido, 1350.50, 'Valor da peça atribuído corretamente');
  console.log('✅ [3] Compras diretas (peças) atribuídas e custeadas no veículo com sucesso.');

  // 4. Testar dados de Orçamento e NFS-e
  storage.updateEquipamento(veiculoCriado.id, {
    num_orcamento: 'ORC-2026/889',
    num_os: 'OS-4412',
    num_nf: 'NFSe-10928',
    obs_orcamento: 'Condição: 28 DDL. Garantia de 90 dias balcão.'
  });

  const veiculoFinal = storage.getEquipamentoById(veiculoCriado.id);
  assert.strictEqual(veiculoFinal.num_orcamento, 'ORC-2026/889');
  assert.strictEqual(veiculoFinal.num_os, 'OS-4412');
  assert.strictEqual(veiculoFinal.num_nf, 'NFSe-10928');
  assert.strictEqual(veiculoFinal.obs_orcamento, 'Condição: 28 DDL. Garantia de 90 dias balcão.');

  // 5. Testar cálculos de Orçamento
  const totalMO = veiculoFinal.servicos.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalPecas = veiculoFinal.custos_diretos.reduce((acc, c) => acc + (c.valor_atribuido || 0), 0);
  const totalGeral = totalMO + totalPecas;

  assert.strictEqual(totalMO, 1850.00 + 920.00, 'Subtotal MO deve somar 2770');
  assert.strictEqual(totalPecas, 1350.50, 'Subtotal Peças deve ser 1350.50');
  assert.strictEqual(totalGeral, 4120.50, 'Total Geral Orçamento deve ser 4120.50');
  console.log(`✅ [4] Totais do Orçamento: Mão de Obra = R$ ${totalMO.toFixed(2)}, Peças = R$ ${totalPecas.toFixed(2)}, Base NFS-e = R$ ${totalGeral.toFixed(2)}.`);

  // Limpeza
  storage.deleteEquipamento(veiculoCriado.id);
  storage.deleteCompraDireta(compra.id);
  console.log('✅ [5] Limpeza de dados de teste concluída com êxito.');
  console.log('\n>>> TODOS OS TESTES DE ORÇAMENTOS E RELATÓRIOS PASSARAM COM 100% DE SUCESSO! <<<');
}

testarModuloRelatorios().catch(err => {
  console.error('❌ Falha no teste:', err);
  process.exit(1);
});
