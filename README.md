# 🚜 Central de Operações & Gestão de Pátio — JB Cunha

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20ES6%2B%20%7C%20CSS3-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready%20%26%20Offline-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![GLPI](https://img.shields.io/badge/GLPI-10.x%20Plugin%20Ready-005696?logo=php&logoColor=white)](https://glpi-project.org/)
[![Security](https://img.shields.io/badge/Security-OWASP%20Headers%20%7C%20scrypt-blue)](./docs/ARQUITETURA.md#5-arquitetura-de-segurança--criptografia)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](./Dockerfile)

Sistema integrado de **Gestão Operacional de Pátio, Controle de Baias e Ordem de Serviço** projetado sob medida para a realidade prática de oficinas pesadas: máquinas de terraplanagem, veículos industriais, caldeiraria, solda, usinagem e mecânica pesada.

Desenvolvido para atender simultaneamente:
1. **Administração & Gestão**: Controle de faturamento, aprovação de compras diretas, prazos e clientes via interface Desktop.
2. **Chão de Oficina & Galpão**: Modo TV para monitor ou Smart TV em tela cheia com auto-refresh a cada 6 segundos e tipografia gigante legível a mais de 10 metros.
3. **Mecânicos no Pátio**: PWA Mobile com captura instantânea de fotos de peças trincadas e avarias via câmera, checklists e avanço de baias.
4. **Portal do Cliente**: Acesso exclusivo e segregado por empresa para acompanhamento do status do maquinário sem expor orçamentos internos ou custos confidenciais.

---

## 📚 Documentação Técnica Completa

Para aprofundamento técnico em cada disciplina, consulte os manuais dedicados na pasta [`docs/`](./docs/):

| Documento | Descrição e Conteúdo |
|---|---|
| ☁️ [**Infraestrutura & Suporte na Nuvem**](./docs/INFRAESTRUTURA_E_SUPORTE_NUVEM.md) | **Manual de Produção na Nuvem (VPS HostGator)**: Arquitetura, diretórios no host, serviços, redes, hardening NIST CSF 2.0 e manual de suporte/troubleshooting. |
| 🏛️ [**Arquitetura do Sistema**](./docs/ARQUITETURA.md) | Diagramas em camadas, fluxos Mermaid, ciclo de vida de atendimentos, modelo relacional vs. flat-file e especificações criptográficas (`scrypt`, tokens HMAC-SHA256, RBAC). |
| 💻 [**Guia de Desenvolvimento**](./docs/DESENVOLVIMENTO.md) | Configuração do ambiente, Design System (CSS Vanilla, temas Dark/Light), motor reativo, suíte automatizada de Q.A. (`test_qa_suite.js`) e padrões de código. |
| 🏗️ [**Guia de Infraestrutura**](./docs/INFRAESTRUTURA.md) | Topologias de implantação: On-Premises Windows (oficina física), Servidor Linux/VPS com Nginx + PM2, Docker e Docker Compose, redes, Wi-Fi e planos de backup. |
| 📡 [**Especificação da API REST**](./docs/API.md) | Referência completa de todos os endpoints REST, autenticação, SSE streams, exemplos de requisição e resposta em JSON. |
| 🛠️ [**Welcome Kit & Tech Stack**](./WELCOME_KIT.md) | Guia rápido de onboarding, boas-vindas à equipe, detalhamento do banco documental e plugin GLPI. |

---

## ⚡ Como Ligar e Desligar o Ambiente

### 🟢 Opção 1: Inicializador Automático no Windows (Recomendado na Oficina)

Na pasta do projeto, utilize os atalhos automáticos:

1. **Para LIGAR:**
   - Dê dois cliques no arquivo [**`INICIAR_OFICINA.bat`**](./INICIAR_OFICINA.bat).
   - O script verifica portas, garante o Node.js no PATH, inicia o servidor e abre o navegador automaticamente em `http://localhost:3000`.
   - *Mantenha a janela do prompt aberta em segundo plano.*

2. **Para DESLIGAR:**
   - Dê dois cliques no arquivo [**`PARAR_OFICINA.bat`**](./PARAR_OFICINA.bat).
   - O processo é finalizado de forma limpa e a porta 3000 é liberada imediatamente.

> [!TIP]
> Crie um atalho do arquivo `INICIAR_OFICINA.bat` na sua Área de Trabalho (Desktop) para iniciar o sistema com apenas 1 clique ao ligar o computador pela manhã!

---

### 💻 Opção 2: Pelo Terminal / Linha de Comando

```bash
# 1. Instalar dependências (apenas na primeira execução)
npm install

# 2. Iniciar a aplicação
npm start
# ou
node api-gateway/server.js
```

Para desligar, basta pressionar `Ctrl + C` no terminal.

---

### 🐳 Opção 3: Usando Docker & Docker Compose

```bash
# Subir aplicação conteinerizada em segundo plano
docker compose up -d

# Visualizar logs
docker compose logs -f

# Parar os containers
docker compose down
```

---

## 🌐 Endereços de Acesso

### ☁️ Produção Oficial na Nuvem (HTTPS Seguro com Let's Encrypt):
| Dispositivo / Finalidade | Endereço de Acesso Seguro | Descrição |
|---|---|---|
| **Painel Desktop Principal** | `https://patio.jbcunha.com.br/` | Gestão completa do Pátio, Dossiê Operacional e Compras |
| **Televisão do Galpão (Modo TV)** | `https://patio.jbcunha.com.br/#tv` | Modo TV em tela cheia com auto-refresh (6s) e relógio operacional (Zero-Scroll) |
| **Celular dos Técnicos (PWA Mobile)** | `https://patio.jbcunha.com.br/mobile` | Interface touch para checklist rápido, troca de baia e fotos com câmera |
| **Healthcheck da API** | `https://patio.jbcunha.com.br/api/jbc/v1/status` | Verificação de disponibilidade e integridade do sistema |

### 🏠 Acesso Local / Rede Interna de Oficina:
| Dispositivo / Finalidade | Endereço de Acesso Local |
|---|---|
| **Computador Local** | `http://localhost:3000` |
| **Modo TV Local** | `http://localhost:3000/#tv` |
| **Celular dos Técnicos (Wi-Fi Local)** | `http://<IP_LOCAL>:3000/mobile` |

---

## 🔐 Credenciais de Acesso de Produção

O ambiente de produção foi provisionado com as credenciais administrativas e operacionais oficiais:

| Perfil | Usuário | Senha Padrão | Função no Sistema |
|---|---|---|---|
| **Administrador / Aprovador** | `manuel` | `jbc@2026` | Gerência Geral, autorização de compras diretas, gestão de usuários |
| **Administrador / Operações** | `expedito` | `jbc@2026` | Administração técnica e operacional |
| **Mecânico / Solicitante** | `operador` | `jbc@2026` | Operação de pátio (abertura de OS, baias, checklists e fotos) |

*(A senha padrão pode ser alterada a qualquer momento no perfil do usuário autenticado).*

---

## 🏭 Principais Funcionalidades da Oficina

1. **Gestão Visual de Baias & Pátio Aberto**:
   - Visão unificada de todo o maquinário em manutenção.
   - Filtros instantâneos por etapa: *No Pátio*, *Diagnóstico*, *Aprovação*, *Execução*, *Aguardando Peça*, *Usinagem*, *Pronto* e *Entregues*.
   - Indicadores luminosos pulsantes (*status dots*) e alertas para equipamentos sem movimentação recente ou com prazos vencidos.

2. **Dossiê Operacional & Diário de Bordo**:
   - Stepper interativo de avanço de etapas.
   - Checklist dinâmico de tarefas mecânicas com marcação em tempo real.
   - Diário de bordo com anexação de fotos reais de avarias e relatórios de peças substituídas.

3. **Módulo de Compras Diretas & Rateio**:
   - Solicitação rápida de compras na praça de autopeças.
   - Fluxo de aprovação exclusivo da diretoria (Manuel).
   - Rateio automático de custos vinculado à Ordem de Serviço do equipamento.

4. **Modo TV (Painel de Galpão)**:
   - Desenvolvido especificamente para telas grandes de TV ou monitores industriais.
   - Números de alto contraste legíveis a grande distância.
   - Atualização automática e silenciosa a cada 6 segundos via SSE/Polling.

5. **Design System Moderno & Alternador de Temas**:
   - Estética inspirada em referências modernas de engenharia (Linear, Raycast, Vercel).
   - Alternância imediata entre Modo Escuro (ideal para a oficina) e Modo Claro (ideal para o escritório).

---

## 📁 Estrutura do Repositório

```text
gestao-de-patio/
├── api-gateway/              # Backend Express, serviços e armazenamento
│   ├── server.js             # Servidor HTTP e middlewares
│   ├── data/                 # Banco documental (database.json e usuarios.json)
│   └── src/                  # Rotas, serviços e regras de negócio
├── web-app/                  # Frontend SPA, PWA Mobile e Design System
│   ├── index.html            # Aplicação principal
│   ├── mobile.html           # Interface mobile dos mecânicos
│   ├── css/style.css         # Design system Vanilla CSS
│   └── js/app.js             # Lógica e comunicação com API
├── glpi-plugin/              # Plugin corporativo para integração GLPI 10.x
│   ├── setup.php & hook.php  # Registro e ciclo de vida
│   └── install/install.sql   # Esquema relacional MySQL
├── docs/                     # 📚 Manuais completos de Arquitetura, Infra e Dev
│   ├── ARQUITETURA.md
│   ├── DESENVOLVIMENTO.md
│   ├── INFRAESTRUTURA.md
│   └── API.md
├── scripts/                  # Automações, migrações e rotinas de backup
├── Dockerfile                # Imagem Alpine Node.js para container
├── docker-compose.yml        # Orquestrador local
├── ecosystem.config.js       # Gerenciador de processos PM2
├── nginx.conf.example        # Modelo de proxy reverso com SSL
├── INICIAR_OFICINA.bat       # Launcher de 2 cliques para Windows
├── PARAR_OFICINA.bat         # Desligamento seguro
├── package.json              # Dependências Node.js
└── test_qa_suite.js          # Suíte automatizada de testes
```

---

## 🧪 Qualidade e Testes

Para executar a suíte de testes de integração, segurança e controle de acesso (RBAC):

```bash
# Com o servidor em execução (node api-gateway/server.js)
node test_qa_suite.js
```

---

## 📄 Licença e Propriedade

Desenvolvido para **JB Cunha Manutenção e Serviços**. Todos os direitos reservados.
Distribuído sob licença interna para operações de campo e gestão de oficina pesada.
