/**
 * Script de execução e verificação de regras operacionais em linha de comando
 */
const storage = require('../api-gateway/src/services/storage');

console.log('[JB Cunha Cron] Processando regras operacionais...');
const dados = storage.getDashboardData();
console.log(`- Equipamentos no Pátio: ${dados.totais.total_patio}`);
console.log(`- Em Andamento: ${dados.totais.em_andamento}`);
console.log(`- Aguardando (Peça/Material/Cliente): ${dados.totais.aguardando}`);
console.log(`- Prontos para Entrega: ${dados.totais.prontos}`);
console.log(`- Atrasados detectados: ${dados.totais.atrasados}`);
console.log('[JB Cunha Cron] Concluído com sucesso.');

