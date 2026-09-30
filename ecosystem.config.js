/**
 * ecosystem.config.js — Gerenciamento de Processos PM2
 * Central de Operações JB Cunha
 */

module.exports = {
  apps: [
    {
      name: 'gestao-patio-jbcunha',
      script: 'api-gateway/server.js',
      instances: 1, // Modo fork ou cluster. Modo 1 preserva SSE in-memory de forma simples
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
