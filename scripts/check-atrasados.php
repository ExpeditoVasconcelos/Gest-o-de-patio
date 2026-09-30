<?php
/**
 * Script CLI para verificação automática de atrasos e serviços estagnados
 * Pode ser executado a cada hora via cron: 0 * * * * php /var/www/glpi/plugins/jbcunha/scripts/check-atrasados.php
 */

if (php_sapi_name() !== 'cli') {
   die("Acesso restrito ao terminal CLI.\n");
}

define('GLPI_ROOT', dirname(dirname(__DIR__)));
include_once (GLPI_ROOT . "/inc/includes.php");

global $DB;

echo "[" . date('Y-m-d H:i:s') . "] Verificando serviços atrasados e sem movimentação...\n";

// 1. Identificar atrasos (data_previsao < NOW e etapa != 'Entregue', 'Finalizado')
$now = date('Y-m-d H:i:s');
$query_atrasados = "
   UPDATE glpi_jbc_servicos 
   SET atrasado = 1 
   WHERE data_previsao IS NOT NULL 
     AND data_previsao < '$now' 
     AND etapa_atual NOT IN ('Entregue', 'Finalizado')
";
$DB->query($query_atrasados);
echo "Regra 1: Atrasados atualizados.\n";

// 2. Identificar serviços parados há mais de 24h sem atualização
$limite_24h = date('Y-m-d H:i:s', strtotime('-24 hours'));
$query_parados = "
   UPDATE glpi_jbc_servicos 
   SET sem_atualizacao = 1 
   WHERE date_mod < '$limite_24h' 
     AND etapa_atual NOT IN ('Entregue', 'Finalizado', 'Aguardando Aprovação')
";
$DB->query($query_parados);
echo "Regra 2: Alertas de inatividade (24h) processados.\n";

echo "Concluído com sucesso.\n";
