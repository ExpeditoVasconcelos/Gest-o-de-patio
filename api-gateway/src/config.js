/**
 * Configuração da Central de Operações JB Cunha & Gateway GLPI
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  PORT: process.env.PORT || 3000,
  DATA_DIR: process.env.DATA_DIR || path.join(ROOT, 'api-gateway', 'data'),
  UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(ROOT, 'web-app', 'uploads'),

  // Configuração opcional de conexão direta com API REST nativa do GLPI
  GLPI: {
    ENABLED: process.env.GLPI_ENABLED === 'true' || false,
    URL: process.env.GLPI_URL || 'https://glpi.jbcunha.com.br/apirest.php',
    APP_TOKEN: process.env.GLPI_APP_TOKEN || '',
    USER_TOKEN: process.env.GLPI_USER_TOKEN || '',
    TIMEOUT_MS: 10000
  },

  // Regras operacionais da oficina
  REGRAS: {
    HORAS_INATIVIDADE_ALERTA: 24, // horas sem atualização no histórico
    VERIFICACAO_INTERVALO_MS: 60000 // verificação a cada 1 minuto
  }
};
