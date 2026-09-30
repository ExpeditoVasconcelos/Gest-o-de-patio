# 🛠️ Welcome Kit & Tech Stack — Central de Operações JB Cunha

Seja bem-vindo ao time de desenvolvimento e evolução da **Central de Operações JB Cunha**! 

Este documento foi criado para apresentar a arquitetura, a **stack tecnológica**, as decisões de design e tudo o que você precisa saber para entender e evoluir o ecossistema com velocidade e clareza.

---

## 🗄️ Qual o Banco de Dados Utilizado?

O projeto opera sob uma **arquitetura híbrida e pragmática**, pensada para responder a dois cenários operacionais distintos:

### 1. Banco de Dados Local Ativo (Operação da Oficina)
* **Tipo:** **JSON Flat-File Document Store** (Banco de dados documental em arquivo local).
* **Arquivo:** [`api-gateway/data/database.json`](./api-gateway/data/database.json).
* **Como funciona:** O serviço de backend ([`storage.js`](./api-gateway/src/services/storage.js)) gerencia leituras, buscas, atualizações e sincronizações atômicas diretamente no arquivo JSON persistido em disco via módulo nativo `fs` do Node.js.
* **Por que essa escolha?**
  * **Zero dependências externas e zero burocracia:** Permite que a oficina ligue o sistema com apenas 2 cliques (`INICIAR_OFICINA.bat`) em qualquer máquina Windows comum, sem exigir instalação prévia de servidores de banco de dados pesados (como MySQL, PostgreSQL, Docker ou serviços em segundo plano).
  * **Velocidade e portabilidade:** Backups rápidos (copiar e colar o arquivo), migração simplificada e latência ultrabaixa para o painel em tempo real da TV.
  * **Resiliência:** Se o arquivo for danificado ou não existir, o sistema gera automaticamente um conjunto de dados iniciais (*seed data*) consistente.

### 2. Banco de Dados Relacional (Núcleo GLPI / Retaguarda Corporativa)
* **Tipo:** **MySQL 8.0+** / **MariaDB 10.5+** (Engine `InnoDB`, charset `utf8mb4_unicode_ci`).
* **Estrutura SQL:** Definida em [`glpi-plugin/install/install.sql`](./glpi-plugin/install/install.sql).
* **Como funciona:** Para instâncias corporativas do GLPI (ITIL / ITSM), o ecossistema disponibiliza um plugin PHP dedicado com tabelas complementares relacionais:
  * `glpi_jbc_equipamentos` (máquinas pesadas, horímetros, placas, chassis);
  * `glpi_jbc_servicos` (vinculação aos chamados `glpi_tickets` com etapas da oficina);
  * `glpi_jbc_garagem` (baias físicas e setores operacionais da oficina);
  * `glpi_jbc_movimentacoes` (histórico de movimentação entre baias);
  * `glpi_jbc_evidencias` (registro de fotos técnicas e laudos);
  * `glpi_jbc_erp_sync` (amarração com orçamentos, OS e notas fiscais).
* **Backup Relacional:** Script automatizado [`scripts/backup-glpi.sh`](./scripts/backup-glpi.sh) via `mysqldump` com retenção de 30 dias e sincronização em nuvem.

---

## 💻 Tech Stack Completa

A pilha de tecnologias foi desenhada priorizando **performance nativa**, **baixo consumo de recursos**, **alta legibilidade** e **manutenibilidade de longo prazo**, dispensando o uso de frameworks pesados e dependências desnecessárias.

```mermaid
graph TD
    subgraph Frontend ["🖥️ Frontend (SPA Nativo)"]
        UI["HTML5 Semântico + Vanilla CSS 3"]
        JS["Vanilla JS (ES6+) Modular"]
        PWA["Service Worker & Web Manifest"]
        TV["Modo TV com Auto-refresh (6s)"]
    end

    subgraph Backend ["⚡ Backend & API Gateway"]
        Node["Node.js (LTS v18+)"]
        Express["Express 4.19 (REST API)"]
        Multer["Multer (Uploads de Fotos Técnicas)"]
        Storage["Storage Service (Leitura/Escrita Atômica)"]
    end

    subgraph StorageLayer ["🗄️ Camada de Dados & Persistência"]
        JSONDB[("database.json (Armazenamento Local)")]
        Uploads[("uploads/ (Mídias e Fotos do Dossiê)")]
        GLPIDB[("MySQL / MariaDB (GLPI ITIL)") ]
    end

    UI -->|Fetch API HTTP / REST| Express
    JS -->|Requisições JSON / FormData| Express
    Express --> Storage
    Express --> Multer
    Storage --> JSONDB
    Multer --> Uploads
    Express -.->|Opcional: REST API Sync| GLPIDB
```

### 1. Camada de Frontend (Interface do Usuário)
* **HTML5:** Semântico, acessível e otimizado para carregamento instantâneo.
* **Vanilla CSS Moderno:**
  * Design System proprietário em [`web-app/css/style.css`](./web-app/css/style.css).
  * Paleta balanceada em HSL, suporte nativo a **Modo Escuro (Dark Mode)** e **Modo Claro (Light Mode)**.
  * Efeitos sutis de *glassmorphism*, micro-animações, bordas dinâmicas e indicadores luminosos (*status dots* pulsantes).
  * Design 100% responsivo para: Computador Administrativo, Celular/Tablet no pátio e Televisão/Monitor no galpão.
* **Tipografia Curada:**
  * **Texto Principal e Títulos:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (proporções modernas e limpas).
  * **Dados Técnicos:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (alta legibilidade para placas, horímetros, quilometragens e números de OS/NF).
* **JavaScript (Vanilla ES6+):**
  * Localizado em [`web-app/js/app.js`](./web-app/js/app.js).
  * SPA (*Single Page Application*) orientada a estado, sem dependências de frameworks volumosos (sem React, Vue ou Angular).
  * Comunicação com a API via `fetch()` nativo, rotas hash (`#tv`, `#patio`) e atualização periódica silenciosa.
* **PWA & Offline:**
  * [`manifest.json`](./web-app/manifest.json) e [`service-worker.js`](./web-app/service-worker.js) para suporte a instalação como app nativo no celular ou desktop.

### 2. Camada de Backend & API Gateway
* **Ambiente de Execução:** [Node.js](https://nodejs.org/) (versão LTS recomendada: v18+ ou v20+).
* **Framework Web:** [Express.js 4.19](https://expressjs.com/) (servidor HTTP REST e entrega de arquivos estáticos).
* **Middlewares e Utilitários:**
  * `cors`: Permite requisições de outros dispositivos da rede interna da oficina (celulares, TVs).
  * `multer`: Tratamento de uploads de imagens reais de peças, trincas e laudos técnicos anexados ao Dossiê / Chat Operacional.
  * `express.static`: Entrega imediata da SPA e da pasta de mídias anexadas.

### 3. Módulo GLPI (Plugin PHP)
* **Linguagem:** PHP 8.1+ / 8.2+.
* **Plataforma:** [GLPI](https://glpi-project.org/) v10.0.x.
* **Localização:** [`glpi-plugin/`](./glpi-plugin/).
* **Padrão:** Extensão via hooks nativos (`hook.php`, `setup.php`), classes herdadas de `CommonDBTM` e templates integrados.

### 4. Automações & Scripts
* **Atalhos Windows:**
  * [`INICIAR_OFICINA.bat`](./INICIAR_OFICINA.bat): Inicia o Node.js e abre o navegador automaticamente na porta configurada.
  * [`PARAR_OFICINA.bat`](./PARAR_OFICINA.bat): Mata o processo do servidor na porta 3000 de forma limpa.
* **Scripts Node.js / Shell:**
  * [`scripts/migrar-dados.js`](./scripts/migrar-dados.js): Rotinas de migração de esquema de dados com backup automático.
  * [`scripts/check-regras.js`](./scripts/check-regras.js): Validação de integridade de regras operacionais da oficina.
  * [`scripts/backup-glpi.sh`](./scripts/backup-glpi.sh): Script Bash para backup completo de banco e arquivos.

---

## 🚀 Guia Rápido: Como Rodar o Projeto

### Pré-requisitos
* [Node.js](https://nodejs.org/) instalado no computador (versão 18 ou superior).
* Windows 10/11 ou Linux.

### Passo a Passo

1. **Instalação das dependências (apenas na primeira vez):**
   ```bash
   npm install
   ```

2. **Inicialização do Sistema:**
   * **No Windows:** Dê dois cliques em [**`INICIAR_OFICINA.bat`**](./INICIAR_OFICINA.bat).
   * **Ou via terminal:**
     ```bash
     npm start
     ```

3. **Para desligar o sistema:**
   * Dê dois cliques em [**`PARAR_OFICINA.bat`**](./PARAR_OFICINA.bat) ou pressione `Ctrl + C` no terminal.

---

## 🔐 Autenticação, Controle de Acesso (RBAC) & Segurança

O sistema conta com um motor completo de **Controle de Acesso Baseado em Papéis (RBAC)** e arquitetura de **Hardening** corporativo:

### 1. Matriz de Perfis e Permissões

| Perfil | Identificador | Pátio & Atendimentos | Módulo de Compras Diretas | Gestão de Usuários | Visibilidade dos Dados |
|---|---|---|---|---|---|
| **Administrador** | `admin` | Total (Criar, Editar, Excluir) | Total (Solicitar, Autorizar, Declinar) | Total (Criar, Editar, Listar, Excluir) | **Global**: visualiza todas as empresas e custos |
| **Usuário (Oficina)** | `usuario` | Operacional (Criar, Editar, Atualizar Baias) | Bloqueado (403 Forbidden) | Bloqueado (403 Forbidden) | **Operacional**: equipamentos da oficina |
| **Cliente** | `cliente` | Somente Leitura (Visualização do Pátio) | Bloqueado (403 Forbidden) | Bloqueado (403 Forbidden) | **Isolado**: restrito aos veículos da sua empresa |

> [!IMPORTANT]
> **Isolamento de Clientes:** Usuários com perfil `cliente` possuem segregação estrita no backend. Eles recebem apenas os equipamentos cuja empresa confere com a sua `empresa_vinculada`, e o payload é automaticamente sanitizado para remover custos de compras diretas, números de orçamento interno e notas fiscais confidenciais. Tentativas de acessar veículos de terceiros via ID resultam em `403 Forbidden`.

### 2. Credenciais de Acesso Inicial (Administradores)

* **Administrador 1:**
  * **Usuário:** `manuel`
  * **Senha Inicial:** `jbc@2026`
* **Administrador 2:**
  * **Usuário:** `expedito`
  * **Senha Inicial:** `jbc@2026`

*(A senha pode ser alterada diretamente no sistema após o primeiro acesso).*

### 3. Hardening e Tecnologia de Segurança
* **Algoritmo de Hash:** `scrypt` nativo do Node.js (`crypto.scryptSync`) com salt criptográfico único de 16 bytes por usuário e derivação de chave de 64 bytes.
* **Proteção contra Timing Attacks:** Validação de credenciais realizada via `crypto.timingSafeEqual` para imunidade contra ataques de análise de tempo de resposta.
* **Tokens de Sessão:** Bearer tokens compactos e stateless assinados com `HMAC-SHA256` e segredo local aleatório persistente (`.auth_secret`).
* **Proteção Anti Força-Bruta (Rate Limiting):** Bloqueio dinâmico por IP e usuário após 5 tentativas consecutivas incorretas (janela de 15 minutos).
* **Cabeçalhos HTTP de Hardening:**
  * `X-Content-Type-Options: nosniff` (prevenção de MIME-sniffing)
  * `X-Frame-Options: SAMEORIGIN` (imunidade contra clickjacking)
  * `X-XSS-Protection: 1; mode=block` (filtro ativo de XSS legado)
  * `Referrer-Policy: strict-origin-when-cross-origin` (privacidade de navegação)
* **Zero Dependências Binárias Externas:** Dispensa módulos nativos em C++ (`node-gyp`, `bcrypt`), garantindo compatibilidade imediata entre ambientes Windows e servidores Linux VPS.

---

## 🌐 Rotas e Acessos Principais

| Acesso | Destino / Finalidade | URL |
|---|---|---|
| **Painel Geral** | Gestão de máquinas, pátio e dossiê operacional | `http://localhost:3000` |
| **Painel de TV** | Visão otimizada para monitor/TV no galpão | `http://localhost:3000/#tv` |
| **App Mobile** | Interface rápida para celulares dos técnicos | `http://<SEU_IP_LOCAL>:3000/mobile` |
| **Autenticação (API)** | Login, verificação de sessão e troca de senha | `POST /api/jbc/v1/auth/login` |
| **Gestão de Usuários (API)** | CRUD completo de usuários (Admin apenas) | `GET/POST /api/jbc/v1/usuarios` |
| **Compras Diretas (API)** | Solicitação, aprovação de Manuel e rateio | `GET/POST /api/jbc/v1/compras` |
| **Equipamentos (API)** | Listagem, filtros e CRUD de equipamentos | `GET/POST /api/jbc/v1/atendimentos` |
| **Status do Sistema** | Healthcheck da aplicação | `GET /api/jbc/v1/status` |

---

## 📂 Mapa de Arquivos do Projeto

```text
glpi-jbcunha/
│
├── WELCOME_KIT.md             # ⭐ Este documento (Welcome Kit & Guia de Stack)
├── README.md                  # Manual operacional geral do usuário
├── package.json               # Configurações do projeto Node e dependências
├── INICIAR_OFICINA.bat        # Inicializador automático para Windows
├── PARAR_OFICINA.bat          # Desligamento seguro do sistema
│
├── api-gateway/               # ⚡ Camada de Backend (Node.js + Express)
│   ├── server.js              # Inicialização do servidor e roteamento
│   ├── data/
│   │   └── database.json      # 🗄️ Banco de dados local em formato JSON (equipamentos + compras diretas)
│   ├── uploads/               # 🖼️ Armazenamento local de fotos e evidências
│   └── src/
│       ├── config.js          # Variáveis de ambiente e portas
│       ├── routes/            # Definição das rotas REST
│       │   ├── atendimentos.js # CRUD de equipamentos, serviços e atividades
│       │   ├── mobile.js       # Endpoints dedicados para o app de pátio e SSE push
│       │   └── compras.js      # 📦 Módulo de Compras Diretas (solicitação, autorização, rateio)
│       └── services/          # Camada de negócio e persistência
│           └── storage.js     # Gerenciador do banco de dados JSON e atribuição de custos
│
├── web-app/                   # 🖥️ Camada de Frontend (SPA Desktop & PWA Mobile)
│   ├── index.html             # Painel operacional do Chefe, slides TV e aba de Compras Diretas
│   ├── mobile.html            # 📱 Interface mobile rápida do técnico (atendimentos + compras com câmera)
│   ├── manifest.json          # Metadados de instalação PWA
│   ├── service-worker.js      # Cache e estratégia offline
│   ├── css/
│   │   └── style.css          # Design System moderno, Dark/Light Mode e responsividade
│   ├── js/
│   │   └── app.js             # Lógica do painel desktop, SSE em tempo real e custos diretos
│   └── uploads/               # Espelho de mídias para acesso web estático
│
├── glpi-plugin/               # 🔌 Plugin complementar para GLPI 10.x
│   ├── setup.php              # Registro e configuração do plugin
│   ├── hook.php               # Hooks de ciclo de vida
│   ├── inc/                   # Classes de negócio em PHP
│   └── install/
│       └── install.sql        # 🗄️ Esquema relacional SQL (MySQL/MariaDB)
│
└── scripts/                   # 🛠️ Scripts auxiliares de manutenção e automação
    ├── backup-glpi.sh         # Rotina de backup com mysqldump
    ├── check-regras.js        # Verificador de regras operacionais
    └── migrar-dados.js        # Utilitário de migração de versões do database.json
```

---

## 🎯 Princípios e Diretrizes do Projeto

1. **Foco no Operador:** A oficina precisa de rapidez. Formulários diretos, sem burocracia desnecessária, sem termos técnicos indecifráveis para os mecânicos e soldadores.
2. **Zero Inchaço Tecnológico:** Evite adicionar bibliotecas ou frameworks pesados sem uma necessidade real demonstrada. O sistema é leve e responde instantaneamente por isso.
3. **Persistência Segura:** Toda alteração de equipamento, serviço ou atividade no pátio deve ser gravada de forma atômica no banco local para não haver perda de histórico.
4. **Legibilidade Extrema no Galpão:** O modo TV deve manter contrastes fortes e tipografia em tamanho gigante para permitir leitura rápida a mais de 10 metros de distância.
