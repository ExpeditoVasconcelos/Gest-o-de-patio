# ==========================================================
# Dockerfile — Central de Operações JB Cunha
# Imagem Node.js minimalista e segura baseada em Alpine Linux
# ==========================================================

FROM node:20-alpine AS base

# Criação de usuário não-root para segurança operacional
RUN addgroup -S jbcunha && adduser -S -G jbcunha jbcunha

WORKDIR /app

# Instalação de dependências de produção
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Cópia do código-fonte da aplicação
COPY --chown=jbcunha:jbcunha . .

# Criação e permissões dos diretórios de dados e mídias
RUN mkdir -p /app/api-gateway/data /app/web-app/uploads && \
    chown -R jbcunha:jbcunha /app

USER jbcunha

# Porta padrão de exposição
EXPOSE 3000

# Variáveis padrão de ambiente
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/api-gateway/data \
    UPLOADS_DIR=/app/web-app/uploads

# Healthcheck do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/jbc/v1/status || exit 1

# Comando de inicialização
CMD ["node", "api-gateway/server.js"]
