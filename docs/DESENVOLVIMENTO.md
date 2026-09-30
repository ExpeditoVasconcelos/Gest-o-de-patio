# 💻 Guia Completo de Desenvolvimento — Gestão de Pátio JB Cunha

Este guia destina-se a desenvolvedores e engenheiros de software que irão manter, customizar ou expandir os módulos da **Central de Operações e Gestão de Pátio JB Cunha**.

---

## 1. Filosofia de Desenvolvimento

O projeto foi concebido sob princípios estritos de simplicidade operacional e alta performance:
1. **Zero Ferramentas de Compilação no Frontend**: Sem Webpack, Vite, Babel ou Tailwind CLI em tempo de execução. O CSS e o JavaScript são servidos nativamente para o navegador.
2. **Dependências Mínimas no Backend**: Utilizamos apenas o estritamente necessário (`express`, `cors`, `multer`). Segurança e criptografia são resolvidas com a biblioteca nativa `crypto` do Node.js.
3. **Legibilidade Máxima do Código**: Funções autodescritivas, tratamento transparente de erros e código comentado em português claro.

---

## 2. Requisitos de Ambiente

- **Node.js**: Versão LTS 18.x ou 20.x ([Download Node.js](https://nodejs.org/))
- **NPM**: Versão 9.x ou superior (inclusa no Node)
- **Git**: Versão 2.30+
- **Editor Recomendado**: VS Code, Cursor ou similar com suporte a JavaScript e CSS.
- **Sistema Operacional**: Windows 10/11, Linux (Ubuntu/Debian/CentOS) ou macOS.

---

## 3. Estrutura de Diretórios Detalhada

```text
gestao-de-patio/
├── api-gateway/                      # ⚡ Backend Node.js / Express
│   ├── server.js                     # Ponto de entrada, headers de segurança e roteamento
│   ├── data/                         # Armazenamento persistente local
│   │   ├── database.json             # Documento JSON com atendimentos, baias e custos
│   │   └── usuarios.json             # Cadastro de credenciais com hashes scrypt e papéis
│   └── src/
│       ├── config.js                 # Constantes de configuração e variáveis de ambiente
│       ├── middlewares/
│       │   └── auth.js               # Validação de tokens JWT e verificação de RBAC
│       ├── routes/
│       │   ├── auth.js               # Endpoints de login, /me e troca de senha
│       │   ├── usuarios.js           # CRUD de contas de usuário (Admin apenas)
│       │   ├── atendimentos.js       # Gerenciamento de veículos, fotos e checklists
│       │   ├── compras.js            # Módulo de compras diretas e aprovações
│       │   └── mobile.js             # Endpoints rápidos do técnico e SSE Hub
│       └── services/
│           ├── authService.js        # Motor criptográfico, tokens e rate limiter
│           ├── glpiClient.js         # Cliente HTTP opcional para API REST do GLPI
│           └── storage.js            # Camada de persistência atômica em disco
│
├── web-app/                          # 🖥️ Frontend Nativo (Desktop, Mobile e TV)
│   ├── index.html                    # Interface principal (Painel do Administrador & TV)
│   ├── mobile.html                   # Interface PWA dedicada aos mecânicos no galpão
│   ├── manifest.json                 # Manifesto PWA para instalação no celular
│   ├── service-worker.js             # Cache offline de assets estáticos
│   ├── css/
│   │   └── style.css                 # Design System Vanilla completo (Dark & Light Mode)
│   ├── js/
│   │   └── app.js                    # Motor reativo de interface, filtros e chamadas de API
│   └── uploads/                      # Armazenamento de fotos de laudos e peças
│
├── glpi-plugin/                      # 🔌 Plugin complementar em PHP para GLPI 10.x
│   ├── setup.php                     # Configuração e hooks do plugin
│   ├── hook.php                      # Gatilhos de ciclo de vida
│   ├── inc/                          # Classes PHP de regras de negócio
│   └── install/
│       └── install.sql               # Esquema de banco de dados relacional MySQL/MariaDB
│
├── scripts/                          # 🛠️ Ferramentas auxiliares e automações
│   ├── check-regras.js               # Verificador de alertas operacionais e atrasos
│   ├── fix-batches.js                # Gerador dos executáveis BAT para Windows
│   ├── migrar-dados.js               # Script de upgrade/migração do database.json
│   └── backup-glpi.sh                # Rotina Bash de backup relacional
│
├── docs/                             # 📚 Documentação Técnica Aprofundada
│   ├── ARQUITETURA.md                # Arquitetura, diagramas e modelos
│   ├── DESENVOLVIMENTO.md            # Este guia do desenvolvedor
│   ├── INFRAESTRUTURA.md             # Guia de implantação, servidores e redes
│   └── API.md                        # Referência completa da API REST
│
├── Dockerfile                        # Conteinerização de produção em Alpine Linux
├── docker-compose.yml                # Orquestração local do container
├── ecosystem.config.js               # Configuração do process manager PM2
├── nginx.conf.example                # Template de proxy reverso com SSL e SSE
├── INICIAR_OFICINA.bat               # Launcher de 2 cliques para Windows
├── PARAR_OFICINA.bat                 # Finalizador limpo de processo para Windows
├── package.json                      # Manifesto de dependências do Node.js
└── test_qa_suite.js                  # Suíte de testes automatizados e RBAC
```

---

## 4. Como Executar em Ambiente de Desenvolvimento

### 4.1. Instalação Inicial
Clone o repositório e instale as dependências:
```bash
git clone https://github.com/ExpeditoVasconcelos/Gest-o-de-patio.git
cd Gest-o-de-patio
npm install
```

### 4.2. Executando o Servidor de Desenvolvimento
```bash
npm run dev
# ou
node api-gateway/server.js
```

O servidor inicializará em `http://localhost:3000`. Ele imprime automaticamente os endereços IP da rede local para que você possa abrir o app mobile em celulares conectados ao mesmo Wi-Fi.

### 4.3. Parando a Aplicação
Pressione `Ctrl + C` no terminal onde o processo está ativo, ou execute no Windows:
```cmd
PARAR_OFICINA.bat
```

---

## 5. Design System e Estilização (`web-app/css/style.css`)

O projeto utiliza variáveis CSS nativas (*CSS Custom Properties*) com suporte a alternância instantânea de temas.

### Tokens de Cores e Temas
```css
/* Modo Escuro (Padrão para a Oficina) */
:root {
  --bg-primary: #0d1117;
  --bg-card: rgba(22, 27, 34, 0.85);
  --border-color: rgba(240, 246, 252, 0.1);
  --text-main: #f0f6fc;
  --text-muted: #8b949e;
  --accent-blue: #388bfd;
  --accent-green: #2ea043;
  --accent-orange: #f0883e;
  --accent-red: #f85149;
  --accent-purple: #a371f7;
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Modo Claro (Escritório e Faturamento) */
[data-theme="light"] {
  --bg-primary: #f6f8fa;
  --bg-card: #ffffff;
  --border-color: #d0d7de;
  --text-main: #1f2328;
  --text-muted: #656d76;
}
```

### Regras de Interface:
- **Placas, Horímetros e Valores Monetários**: Sempre utilize a fonte monoespaçada (`font-family: var(--font-mono)`).
- **Sem Emojis na Interface Administrativa**: Utilize sempre vetores SVG minimalistas com espessura uniforme (`stroke-width: 1.75`).
- **Modo TV**: Os contadores da TV utilizam `font-size: clamp(3rem, 6vw, 5.5rem)` para garantir legibilidade a mais de 10 metros de distância.

---

## 6. Persistência de Dados (`storage.js`)

A manipulação de dados em `database.json` é centralizada em `api-gateway/src/services/storage.js`:

```javascript
// Exemplo de leitura segura
const dados = storage.obterDados();

// Exemplo de gravação atômica com backup automático
storage.salvarDados(novosDados);
```

### Salvamento Atômico:
Para impedir arquivos corrompidos se a energia cair durante a escrita:
1. O conteúdo é serializado em JSON formatado.
2. É gravado em um arquivo temporário `database.json.tmp`.
3. Um `fs.renameSync` atômico substitui o arquivo original.

---

## 7. Suíte de Testes Automatizados (Q.A. & RBAC)

O projeto inclui uma suíte completa de testes de integração ponta a ponta sem dependências externas (`test_qa_suite.js`).

### Como Rodar os Testes:
1. Em um terminal, inicie o servidor:
   ```bash
   node api-gateway/server.js
   ```
2. Em outro terminal, execute os testes:
   ```bash
   node test_qa_suite.js
   ```

### O Que a Suíte Valida:
- [x] Presença de todos os 4 cabeçalhos de segurança HTTP (OWASP)
- [x] Bloqueio de senhas incorretas e rejeição de credenciais inválidas
- [x] Geração e validação de tokens JWT HMAC-SHA256
- [x] Bloqueio de rotas administrativas para perfis sem permissão (403 Forbidden)
- [x] Isolamento de dados de clientes (segregação por empresa vinculada)
- [x] Sanitização de campos confidenciais (ocultação de custos de compras para clientes)
- [x] Rate limiting anti-força bruta após 5 tentativas falhas consecutivas

---

## 8. Convenções de Git e Commits

Adotamos o padrão de commits semânticos:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alterações puramente em documentação
- `style:` Ajustes visuais de CSS ou formatação
- `refactor:` Refatoração de código sem alteração de comportamento
- `test:` Inclusão ou modificação de testes
- `chore:` Ajustes em scripts, dependências ou infraestrutura
