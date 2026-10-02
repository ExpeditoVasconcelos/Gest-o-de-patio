# ☁️ Guia de Infraestrutura, Arquitetura e Suporte na Nuvem (VPS)
### Central de Operações, Pátio & Manutenção — JB Cunha

---

## 1. Identificação Geral do Ambiente de Produção

A aplicação da **Central de Operações JB Cunha** encontra-se em ambiente de produção conteinerizado sob arquitetura moderna, segura e com observabilidade completa.

| Item | Especificação de Produção |
| :--- | :--- |
| **Domínio Oficial de Produção** | `https://patio.jbcunha.com.br` |
| **Endereço IP Público** | `129.121.45.248` |
| **Certificado Digital SSL/TLS** | Let's Encrypt TLS 1.3 (Emissão e renovação automática via ACME para `contato@jbcunha.com.br`) |
| **Proxy Reverso & Borda SSL** | Caddy v2 (Alpine) com HTTP/2, HTTP/3 (QUIC) e HSTS |
| **Portas Públicas** | `80` (HTTP com redirecionamento automático 308 para HTTPS) e `443` (HTTPS Seguro) |
| **Porta SSH de Gerência** | `22022` *(Atenção: porta não-padrão por segurança)* |
| **Usuário SSH** | `root` |
| **Sistema Operacional Host** | Rocky Linux 9.8 (Blue Onyx) — Kernel Linux 5.14 |
| **Ambiente de Execução** | Docker CE 29.8.2 + Docker Compose Plugin v5.5.1 |
| **Segurança Host** | Fail2Ban v1.0.2 com 23 jails ativas (incluindo jail `sshd`) |
| **DNS do Subdomínio** | Tipo `A`, Apontamento `patio` -> `129.121.45.248` (TTL 3600) |

### 🌐 URLs Oficiais de Acesso Público da Aplicação (HTTPS Seguro)

| Finalidade | URL de Acesso | Descrição Operacional |
| :--- | :--- | :--- |
| **Painel Desktop Principal** | `https://patio.jbcunha.com.br/` | Gestão de pátio, abertura de OS, aprovação de orçamentos e relatórios |
| **Aplicativo Mobile (PWA)** | `https://patio.jbcunha.com.br/mobile` | Interface otimizada para smartphones e tablets dos mecânicos/técnicos |
| **Modo TV (Zero-Scroll)** | `https://patio.jbcunha.com.br/#tv` | Painel operacional fixo de baias para Smart TVs e monitores de galpão |
| **Healthcheck da API** | `https://patio.jbcunha.com.br/api/jbc/v1/status` | Endpoint de monitoramento contínuo de disponibilidade e integridade |

> 🔒 *Qualquer requisição feita via `http://` é automaticamente redirecionada com código HTTP 308 (Permanent Redirect) para `https://`.*

---

## 2. Arquitetura da Solução na Nuvem com Banco GLPI & SSL

```mermaid
graph TD
    UserClient["Navegadores Desktop / TV / Smartphones\n(https://patio.jbcunha.com.br)"] -->|HTTPS Porta 443 / HTTP Porta 80| HostServer["Host VPS (Rocky Linux 9.8 - 129.121.45.248)"]
    
    subgraph HostServer["Host VPS (Rocky Linux 9.8)"]
        F2B["Fail2Ban (Proteção SSH Porta 22022)"]
        CronBackup["Cron Diário (03:00 AM) -> /opt/backups/jbcunha"]
        DockerDaemon["Docker Engine 29.8.2"]
        
        subgraph DockerNet["Docker Bridge: jbcunha-net (Rede Privada Isolada)"]
            subgraph ProxyContainer["Container: jbcunha-proxy (Caddy 2 Alpine)"]
                ACME["ACME Let's Encrypt Client\n(contato@jbcunha.com.br)"]
                TLS["Terminação TLS 1.3 + HTTP/3 QUIC + HSTS"]
                Redirect["Redirect Automático HTTP 80 -> HTTPS 443"]
            end
            
            subgraph WebAppContainer["Container: jbcunha-gestao-patio (Node 20 LTS - User non-root)"]
                SecHeaders["Hardening HTTP Headers (OWASP) + Rate Limiter Global"]
                ExpressApp["Node.js 20 LTS (Express API Gateway - Porta 3000)"]
                AuthEngine["AuthService (scrypt + HMAC-SHA256 + Dual-Layer Rate Limiting)"]
                SSEBroadcaster["SSE Broadcaster (Notificações em Tempo Real)"]
                GlpiDbConnector["GlpiDatabase Adapter (mysql2/promise Pool)"]
                StaticFiles["Servidor de Arquivos Estáticos (Desktop SPA + Mobile PWA)"]
            end
            
            subgraph DBContainer["Container: jbcunha-glpi-db (MariaDB 10.11 LTS - Oficial GLPI)"]
                MariaDBEngine["MariaDB InnoDB Engine (Porta 3306 Interna - NÃO exposta à Internet)"]
                GLPITables["Schema GLPI 10.x:\n• glpi_tickets (Chamados/O.S.)\n• glpi_computers (Máquinas/Equipamentos)\n• glpi_tickettasks (Tarefas/Atividades)\n• glpi_ticketfollowups (Timeline/Histórico)\n• glpi_documents (Fotos/Laudos)\n• glpi_jbc_compras (Compras/Orçamentos)\n• glpi_locations (12 Baias do Pátio)\n• glpi_users (Usuários RBAC)"]
            end
        end
        
        ProxyContainer -->|Proxy Reverso Interno: gestao-patio:3000| WebAppContainer
        GlpiDbConnector -->|TCP 3306 Privado| MariaDBEngine
        
        HostStorageDB["Volume Docker: glpi-db-data"] -->|Volume Persistente| MariaDBEngine
        HostStorageCaddyData["Volume Docker: caddy_data (Certificados SSL)"] -->|Certificados TLS Persistentes| ACME
        HostStorageData["/opt/jbcunha-gestao-patio/api-gateway/data"] -->|Volume Persistente| VolData["/app/api-gateway/data (Cache JSON de Resiliência)"]
        HostStorageUploads["/opt/jbcunha-gestao-patio/web-app/uploads"] -->|Volume Persistente| VolUploads["/app/web-app/uploads (Fotos de vistorias e peças)"]
    end
```

### Componentes de Software:
1. **Frontend**:
   - Vanilla ES6+, CSS3 com Design System institucional e CSS Custom Properties.
   - PWA Service Worker (`service-worker.js`) com manifesto offline para o time de campo.
   - Zero dependências de build pesadas no cliente (carregamento ultra-rápido).
2. **Backend API Gateway**:
   - Node.js 20 LTS com Express 4.19 e conector `mysql2/promise`.
   - RBAC granular de 3 níveis: `admin` (Aprovador), `usuario` (Solicitante/Técnico) e `cliente` (Portal Externo segregado).
   - Server-Sent Events (SSE) em `/api/jbc/v1/mobile/events` para push updates em tempo real.
3. **Persistência de Dados Relacional GLPI (MariaDB 10.11)**:
   - **Banco Oficial GLPI:** Container dedicado `jbcunha-glpi-db` com modelagem ITIL idêntica à utilizada por grandes players do mercado.
   - `glpi_tickets`: Chamados, atendimentos e ordens de serviço.
   - `glpi_computers`: Máquinas e equipamentos pesados, tags, placas, horímetros e seriais.
   - `glpi_tickettasks`: Atividades e serviços executados com status ITIL (pendente, em andamento, concluída).
   - `glpi_ticketfollowups`: Linha do tempo e histórico de apontamentos.
   - `glpi_documents` / `glpi_documents_items`: Fotos de vistorias e laudos periciais.
   - `glpi_jbc_compras`: Gestão de solicitações e aprovação de compras da diretoria.
   - `glpi_locations` & `glpi_jbc_garagem`: Mapeamento das 12 baias padrão da oficina.
   - `glpi_users`: Cadastro de usuários e credenciais protegidas com `scrypt`.
   - **Camada de Resiliência Híbrida:** Backup contínuo em flat-file JSON no host que garante continuidade operacional imediata mesmo durante manutenções programadas de banco de dados.

---

## 3. Estrutura de Diretórios no Servidor Host

Toda a infraestrutura do sistema reside no diretório padrão `/opt`:

```
/opt/
├── jbcunha-gestao-patio/             # Repositório clonado e aplicação ativa
│   ├── .env                          # Variáveis de ambiente de produção (segredo JWT)
│   ├── Caddyfile                     # Configuração do Proxy Reverso Caddy com Let's Encrypt SSL
│   ├── docker-compose.yml            # Orquestração dos 3 containers (proxy, web, db)
│   ├── Dockerfile                    # Receita da imagem Node 20 Alpine segura
│   ├── package.json                  # Dependências de produção (Express, mysql2, etc.)
│   ├── database/
│   │   └── init-glpi.sql             # DDL relacional oficial GLPI 10.x (tabelas e índices)
│   ├── api-gateway/
│   │   ├── server.js                 # Ponto de entrada do backend Express
│   │   ├── data/                     # [VOLUME PERSISTENTE] Cache e resiliência JSON
│   │   │   ├── database.json         # Base operacional do pátio
│   │   │   ├── usuarios.json         # Cadastro de usuários e credenciais com hash
│   │   │   └── .auth_secret          # Chave secreta de assinatura HMAC
│   │   └── src/
│   │       ├── config/               # Parâmetros de portas e diretórios
│   │       ├── middlewares/          # Middlewares de autenticação e RBAC
│   │       ├── routes/               # Rotas REST (/auth, /compras, /atendimentos, /mobile)
│   │       └── services/             # AuthService, Storage, GlpiDatabase Adapter
│   ├── web-app/
│   │   ├── index.html                # Painel Desktop & Modo TV
│   │   ├── mobile.html               # Aplicativo Mobile PWA
│   │   ├── css/                      # Folhas de estilo do Design System
│   │   ├── js/                       # Lógica reativa frontend (app.js)
│   │   └── uploads/                  # [VOLUME PERSISTENTE] Fotos enviadas pelos técnicos
│   └── scripts/
│       ├── setup_vps_host.sh         # Script utilitário de provisionamento
│       └── backup.sh                 # Rotina de compactação e backup
└── backups/
    └── jbcunha/                      # Destino das cópias diárias (.tar.gz)
```

---

## 4. Hardening de Segurança — Alinhamento NIST CSF 2.0

Para proteger o sistema contra ameaças cibernéticas na internet pública, foram implementadas medidas alinhadas às 5 funções do **NIST Cybersecurity Framework (CSF 2.0)**:

### 1. Identificar (ID — Identify)
* **Eliminação de Enumeração de Usuários (ID.RA):** A tela de autenticação mobile e desktop não exibe nomes sugeridos ou dicas no placeholder. O retorno de erro é universal (`Usuário ou senha inválidos`) tanto para usuário não encontrado quanto para senha errada.
* **Remoção de Atalhos de Desenvolvimento:** Foram expurgados do código-fonte HTML/JS quaisquer botões de *"Acesso Rápido"* ou senhas pré-preenchidas.
* **Saneamento e Validação Estrita de Input:** Campos de login aceitam apenas strings alfanuméricas com tamanho limitado a 64 caracteres para mitigar buffer overflows, prototype pollution ou ReDoS.

### 2. Proteger (PR — Protect)
* **Proteção Dupla contra Força Bruta (Dual-Layer Brute Force Defense - PR.AC):**
  1. **Camada de IP:** Limite de 10 tentativas falhas por IP em 10 minutos. O excedente é bloqueado por 15 minutos com status `429 Too Many Requests` e cabeçalho `Retry-After`.
  2. **Camada de Conta (Username Lockout):** Limite de 5 tentativas consecutivas de senha incorreta em uma mesma conta (mesmo vindo de múltiplos IPs diferentes). Se atingido, a conta é suspensa preventivamente por 15 minutos.
* **Mitigação de Timing Attacks (Timing Equalization):** Se uma tentativa de login visar um usuário que não existe, o sistema ainda assim executa o algoritmo criptográfico de derivação `scrypt` com um hash dummy para que o tempo de resposta da CPU seja idêntico ao de um usuário existente, impossibilitando scanners de adivinhar contas válidas pelo tempo de resposta.
* **Introdução de Jitter/Atraso Artificial:** Toda falha de login recebe um atraso assíncrono controlado (300ms a 600ms) antes de responder ao cliente, reduzindo ataques automatizados de dicionário de milhares de tentativas por segundo para menos de 2 req/s.
* **Criptografia Forte e Segredos (PR.DS):**
  * Senhas hasheadas via `crypto.scrypt` com salt criptográfico de 16 bytes e derivação de 64 bytes.
  * Tokens HMAC-SHA256 assinados com chave pseudo-aleatória de 96 caracteres hexadecimais (`AUTH_SECRET`).
  * Comparações sensíveis utilizando `crypto.timingSafeEqual`.
* **Hardening de Cabeçalhos HTTP (PR.PT):**
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: SAMEORIGIN`
  * `X-XSS-Protection: 0` (padrão moderno que mitiga vulnerabilidades do auditor legado)
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  * `Cross-Origin-Opener-Policy: same-origin`
  * `Cross-Origin-Resource-Policy: same-origin`
  * Desativação do header de identificação Express (`app.disable('x-powered-by')`).
* **Execução em Container Não-Root:** O processo Node.js roda sob o usuário sem privilégios `jbcunha` dentro do container Alpine, impedindo escalação de privilégios para o host.

### 3. Detectar (DE — Detect)
* **Logs de Auditoria Estruturados (DE.AE):**
  * Log estruturado para todas as falhas de autenticação com IP e alvo: `[SEC-AUDIT][AUTH_FAIL]`.
  * Alertas emitidos em tempo real para tentativas excessivas: `[SEC-ALERT][BRUTE_FORCE_IP]` e `[SEC-ALERT][ACCOUNT_LOCKOUT]`.
  * Logs com rotação automática configurada no Docker (20MB por arquivo, máximo 5 arquivos).
* **Fail2Ban no Host:** Proteção em tempo real da porta SSH `22022` que detecta scanners de portas e ataques de dicionário, inserindo regras dinâmicas de descarte de pacotes nas tabelas do kernel Linux.

### 4. Responder (RS — Respond)
* **Bloqueio Automático em Tempo Real (RS.RP):** Rejeição imediata de conexões abusivas com código HTTP 429 e tempo de retenção via `Retry-After`.

### 5. Recuperar (RC — Recover)
* **Backup Automatizado em Produção (RC.RP):** Agendamento diário às 03:00 no crontab do host que gera arquivos `.tar.gz` contendo todos os dados JSON e arquivos de imagem.

---

## 5. Manual Operacional e Guia de Suporte (Runbook)

### 5.1. Conexão Remota via SSH

Para acessar a máquina host:
```bash
ssh -p 22022 root@129.121.45.248
```

---

### 5.2. Como Verificar o Status da Aplicação

```bash
# 1. Verificar se os 3 containers estão rodando e saudáveis (healthy)
docker ps

# Saída esperada (3 containers ativos):
# CONTAINER ID   IMAGE                               COMMAND                  STATUS                    PORTS
# xxxxxxxxxxxx   caddy:2-alpine                      "caddy run --config …"   Up X hours                0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:443->443/udp
# xxxxxxxxxxxx   jbcunha-gestao-patio-gestao-patio   "docker-entrypoint.s…"   Up X hours (healthy)      0.0.0.0:3000->3000/tcp
# xxxxxxxxxxxx   mariadb:10.11                       "docker-entrypoint.s…"   Up X hours (healthy)      3306/tcp

# 2. Testar resposta pública segura via HTTPS
curl -s https://patio.jbcunha.com.br/api/jbc/v1/status

# 3. Testar conexão com o banco relacional MariaDB GLPI
docker exec -it jbcunha-glpi-db mariadb -u glpi -pjbcunha_glpi_secret_pass glpidb -e "SELECT count(*) AS total_tabelas FROM information_schema.tables WHERE table_schema='glpidb';"
```

---

### 5.3. Visualização de Logs em Tempo Real

```bash
# Acompanhar logs ao vivo da aplicação web:
docker logs -f jbcunha-gestao-patio

# Acompanhar logs do proxy reverso SSL (Caddy):
docker logs -f jbcunha-proxy

# Acompanhar logs do banco de dados relacional (MariaDB GLPI):
docker logs -f jbcunha-glpi-db

# Filtrar apenas eventos e alertas de segurança:
docker logs jbcunha-gestao-patio | grep "SEC-"
```

---

### 5.4. Como Reiniciar a Aplicação

```bash
cd /opt/jbcunha-gestao-patio
docker compose restart
```

---

### 5.5. Como Aplicar Atualizações do GitHub (Deploy Contínuo)

Sempre que a equipe de desenvolvimento publicar novas versões na branch `main` do GitHub:

```bash
# 1. Navegar até o diretório do projeto
cd /opt/jbcunha-gestao-patio

# 2. Baixar as alterações do repositório
git pull origin main

# 3. Recompilar a imagem e recriar os containers sem perda de dados
docker compose up -d --build

# 4. Validar o status após a atualização
sleep 5
docker ps
```
> *Nota: Os volumes de dados (`api-gateway/data`, `glpi-db-data`, `caddy_data`) e uploads (`web-app/uploads`) são persistidos e não são afetados durante a recriação do container.*

---

### 5.6. Procedimento de Backup e Restauração (Disaster Recovery)

#### Cópia Manual de Backup Imediato:
```bash
# 1. Dump completo do Banco de Dados MariaDB GLPI
docker exec jbcunha-glpi-db mariadb-dump -u glpi -pjbcunha_glpi_secret_pass glpidb > /opt/backups/jbcunha/backup_glpidb_$(date +%Y%m%d_%H%M%S).sql

# 2. Compactação dos arquivos de dados, segredos e fotos
tar -czf /opt/backups/jbcunha/backup_arquivos_$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /opt/jbcunha-gestao-patio api-gateway/data web-app/uploads
```

#### Restauração de Backup:
Caso haja necessidade de restaurar o banco relacional ou os arquivos:
```bash
# 1. Restaurar Dump SQL no MariaDB:
docker exec -i jbcunha-glpi-db mariadb -u glpi -pjbcunha_glpi_secret_pass glpidb < /opt/backups/jbcunha/backup_glpidb_YYYYMMDD_HHMMSS.sql

# 2. Restaurar arquivos e uploads:
tar -xzf /opt/backups/jbcunha/backup_arquivos_YYYYMMDD_HHMMSS.tar.gz -C /opt/jbcunha-gestao-patio/
chmod -R 777 /opt/jbcunha-gestao-patio/api-gateway/data /opt/jbcunha-gestao-patio/web-app/uploads

# 3. Reiniciar os serviços
cd /opt/jbcunha-gestao-patio
docker compose restart
```

---

### 5.7. Resolução de Incidentes Comuns (Troubleshooting)

| Sintoma / Problema | Causa Provável | Procedimento de Correção |
| :--- | :--- | :--- |
| **Site não abre no navegador** | Container parado ou porta 80 bloqueada | Execute `docker ps`. Se o container não estiver ativo, suba com `docker compose up -d`. Se a porta 80 conflitar com outro processo, use `ss -tulpn \| grep :80` para identificar e encerrar o serviço concorrente. |
| **Container marcado como `unhealthy`** | Healthcheck falhando | Verifique com `docker inspect jbcunha-gestao-patio --format='{{json .State.Health}}'`. O healthcheck utiliza `http://127.0.0.1:3000/api/jbc/v1/status`. |
| **Usuário bloqueado por excesso de tentativas** | Disparo do mecanismo anti-brute force | O bloqueio expira automaticamente após 15 minutos. Para liberação emergencial imediata, reinicie o container: `docker compose restart`. |
| **Fotos não carregam no mobile** | Permissões de diretório de upload | Execute no host: `chmod -R 775 /opt/jbcunha-gestao-patio/web-app/uploads`. |
| **IP do administrador bloqueado no SSH** | Fail2Ban baniu o IP | Verifique os banimentos com `fail2ban-client status sshd`. Para desbanir um IP: `fail2ban-client set sshd unbanip <SEU_IP>`. |
| **Disco do servidor ficando cheio** | Arquivos de log ou backups antigos | Verifique espaço com `df -h`. Remova backups com mais de 30 dias: `find /opt/backups/jbcunha/ -type f -name "*.tar.gz" -mtime +30 -delete`. Os logs do Docker já contam com rotação automática limitada a 20MB x 5. |

---

## 6. Matriz de Perfis e Credenciais Padrão

| Usuário | Perfil (Role) | Papel na Operação |
| :--- | :--- | :--- |
| `manuel` | `admin` | Aprovador / Diretor Geral (liberação de orçamentos e compras) |
| `expedito` | `admin` | Aprovador / Gerente de Operações (gestão completa do pátio) |
| `operador` | `usuario` | Solicitante / Mecânico Chefe (abertura de OS, requisição de peças) |

> 🔒 **Recomendação:** As senhas padrão de primeiro acesso (`jbc@2026`) devem ser alteradas no menu do perfil de cada usuário logado ou pelo painel de gerenciamento administrativo em `/usuarios`.
