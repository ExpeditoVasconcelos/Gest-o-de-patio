#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DEPLOY AUTOMATIZADO — CENTRAL DE OPERAÇÕES JB CUNHA (VPS)
# Execução: bash scripts/deploy_vps.sh
# ==============================================================================

set -euo pipefail

echo "=================================================================="
echo "  INICIANDO DEPLOY — CENTRAL DE OPERAÇÕES JB CUNHA"
echo "=================================================================="

# 1. Verificar diretórios essenciais
echo "[1/5] Verificando estrutura de diretórios e permissões..."
mkdir -p api-gateway/data web-app/uploads logs

# 2. Configurar arquivo .env caso não exista
echo "[2/5] Verificando arquivo de ambiente .env..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "  Criando .env a partir de .env.example..."
    cp .env.example .env
    # Gera chave aleatória segura para AUTH_SECRET
    RAND_SECRET=$(openssl rand -hex 48 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)
    sed -i "s/sua_chave_secreta_super_segura_de_producao_jbcunha_2026/$RAND_SECRET/" .env
    echo "  [OK] AUTH_SECRET gerado com alta entropia."
  fi
fi

# 3. Detectar método de execução (Docker Compose ou Node/PM2 nativo)
echo "[3/5] Identificando runtime disponível (Docker vs PM2)..."
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "  Docker & Docker Compose detectados. Realizando deploy via Container..."
  docker compose pull || true
  docker compose build --pull
  docker compose up -d
  echo "  [OK] Container jbcunha-gestao-patio iniciado com sucesso na porta 3000!"
elif command -v pm2 >/dev/null 2>&1; then
  echo "  PM2 detectado. Instalando dependências e iniciando processo..."
  npm ci --only=production
  pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
  pm2 save
  echo "  [OK] Aplicação gerenciada e salva via PM2!"
elif command -v node >/dev/null 2>&1; then
  echo "  Node.js puro detectado. Instalando dependências de produção..."
  npm ci --only=production
  nohup node api-gateway/server.js > logs/app.log 2>&1 &
  echo "  [OK] Processo Node.js iniciado em background (PID: $!)"
else
  echo "  [ERRO] Nenhum runtime suportado encontrado (Instale Docker ou Node.js/PM2)."
  exit 1
fi

# 4. Executar checagem de integridade (Health Check)
echo "[4/5] Aguardando inicialização e executando Health Check..."
sleep 3
HEALTH_OK=false
for i in {1..10}; do
  if curl -sf http://127.0.0.1:3000/api/jbc/v1/status >/dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 1
done

if [ "$HEALTH_OK" = true ]; then
  echo "  [SUCESSO] Backend está online, saudável e respondendo HTTP 200 OK!"
else
  echo "  [AVISO] Backend ainda inicializando ou na porta 3000. Verifique logs."
fi

# 5. Informações para finalização
echo "[5/5] Deploy finalizado com sucesso!"
echo "=================================================================="
echo "  ACESSO LOCAL DA VPS:"
echo "  - Painel Web: http://127.0.0.1:3000"
echo "  - Modo TV:    http://127.0.0.1:3000/#tv"
echo "  - App Mobile: http://127.0.0.1:3000/mobile"
echo "------------------------------------------------------------------"
echo "  PRÓXIMO PASSO PARA O TIME DE DEVOPS:"
echo "  - Configurar Nginx reverso com SSL (veja nginx.conf.example)"
echo "  - Apontar domínio/subdomínio para o IP desta VPS"
echo "=================================================================="
