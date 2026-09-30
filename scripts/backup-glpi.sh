#!/bin/bash
# ==========================================================
# Script de Backup Automatizado - Central JB Cunha / GLPI
# Executado diariamente via cron (ex: 02:00 da manhã)
# ==========================================================

DATA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/jbcunha"
GLPI_DIR="/var/www/glpi"
DB_NAME="glpi"
DB_USER="glpi_backup"
DB_PASS="SENHA_SEGURA_AQUI"
RETENCAO_DIAS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando rotina de backup JB Cunha GLPI..."

# 1. Dump do banco de dados MySQL/MariaDB
mysqldump -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" | gzip > "$BACKUP_DIR/db_glpi_${DATA}.sql.gz"
if [ $? -eq 0 ]; then
  echo "OK: Backup do banco de dados gerado com sucesso."
else
  echo "ERRO: Falha ao exportar banco de dados!" >&2
fi

# 2. Compactação de documentos e fotos de evidências (/files)
tar -czf "$BACKUP_DIR/files_glpi_${DATA}.tar.gz" -C "$GLPI_DIR" files
echo "OK: Backup de anexos e evidências concluído."

# 3. Compactação de arquivos de configuração
tar -czf "$BACKUP_DIR/config_glpi_${DATA}.tar.gz" -C "$GLPI_DIR" config
echo "OK: Backup das configurações concluído."

# 4. Limpeza de backups com mais de 30 dias
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +$RETENCAO_DIAS -delete
echo "OK: Limpeza de retenção concluída (arquivos > ${RETENCAO_DIAS} dias)."

# 5. Sincronização com repositório externo / nuvem se rclone estiver configurado
if command -v rclone &> /dev/null; then
  rclone sync "$BACKUP_DIR" remote:jbcunha-backup-glpi/
  echo "OK: Backup sincronizado na nuvem com sucesso."
fi

echo "[$(date)] Rotina de backup finalizada."
