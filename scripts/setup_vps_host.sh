#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PROVISIONAMENTO COMPLETO DA VPS — CENTRAL JB CUNHA
# Execução recomendada no servidor: sudo bash setup_vps_host.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  PROVISIONAMENTO AUTOMÁTICO DE VPS — CENTRAL JB CUNHA          ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Checar privilégios de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Este script precisa ser executado como root ou com sudo.${NC}"
  exit 1
fi

APP_DIR="/opt/jbcunha-gestao-patio"
REPO_URL="https://github.com/ExpeditoVasconcelos/Gest-o-de-patio.git"

# 2. Atualizar pacotes do sistema operacional
echo -e "\n${YELLOW}[1/6] Atualizando repositórios e instalando utilitários essenciais...${NC}"
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y curl wget git ufw ca-certificates gnupg lsb-release
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y curl wget git firewalld ca-certificates
fi

# 3. Instalar Docker e Docker Compose Plugin caso não estejam instalados
echo -e "\n${YELLOW}[2/6] Verificando Docker e Docker Compose...${NC}"
if ! command -v docker >/dev/null 2>&1; then
  echo "Instalando Docker Engine via script oficial do Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}[OK] Docker instalado com sucesso.${NC}"
else
  echo -e "${GREEN}[OK] Docker já está instalado na VPS.${NC}"
fi

# 4. Configurar Firewall (UFW) com segurança máxima
echo -e "\n${YELLOW}[3/6] Configurando Firewall UFW (SSH, HTTP e Porta 3000)...${NC}"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp comment 'SSH' || true
  ufw allow 80/tcp comment 'HTTP Web' || true
  ufw allow 443/tcp comment 'HTTPS Web' || true
  ufw allow 3000/tcp comment 'JB Cunha Node API' || true
  echo "y" | ufw enable || true
  ufw status verbose
  echo -e "${GREEN}[OK] Firewall configurado.${NC}"
fi

# 5. Clonar ou Atualizar Repositório da Aplicação
echo -e "\n${YELLOW}[4/6] Clonando/Atualizando repositório da aplicação em ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
fi

cd "$APP_DIR"
mkdir -p api-gateway/data web-app/uploads logs

# 6. Configurar .env de Produção
echo -e "\n${YELLOW}[5/6] Configurando variáveis de ambiente de produção (.env)...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env
  RAND_SECRET=$(openssl rand -hex 48 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)
  sed -i "s/sua_chave_secreta_super_segura_de_producao_jbcunha_2026/$RAND_SECRET/" .env
  echo -e "${GREEN}[OK] .env gerado com chave criptográfica exclusiva.${NC}"
fi

# 7. Subir a aplicação via Docker Compose
echo -e "\n${YELLOW}[6/6] Compilando e iniciando os containers em background...${NC}"
docker compose down || true
docker compose up -d --build

# 8. Health Check
echo -e "\nAguardando subida do container para verificação de integridade..."
sleep 4

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
HEALTH_OK=false
for i in {1..12}; do
  if curl -sf http://127.0.0.1:3000/api/jbc/v1/status >/dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 1
done

echo -e "\n${BLUE}==================================================================${NC}"
if [ "$HEALTH_OK" = true ]; then
  echo -e "${GREEN}  [SUCESSO TOTAL] CENTRAL JB CUNHA EM PRODUÇÃO NA VPS!         ${NC}"
else
  echo -e "${YELLOW}  [AVISO] Container em execução. Testando conectividade...        ${NC}"
fi
echo -e "${BLUE}==================================================================${NC}"
echo -e "  ENDEREÇOS DE ACESSO PÚBLICO:"
echo -e "  - Acesso Direto (Porta 80):   ${GREEN}http://${SERVER_IP}${NC}"
echo -e "  - App Mobile dos Técnicos:   ${GREEN}http://${SERVER_IP}/mobile${NC}"
echo -e "  - Modo TV Pátio:             ${GREEN}http://${SERVER_IP}/#tv${NC}"
echo -e "  - Porta alternativa (3000):  ${GREEN}http://${SERVER_IP}:3000${NC}"
echo -e "------------------------------------------------------------------"
echo -e "  CONTAS DE ACESSO INICIAIS:"
echo -e "  - Aprovador:   manuel    / jbc@2026"
echo -e "  - Aprovador:   expedito  / jbc@2026"
echo -e "  - Solicitante: operador  / jbc@2026"
echo -e "${BLUE}==================================================================${NC}"
