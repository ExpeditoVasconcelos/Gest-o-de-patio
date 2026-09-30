# 📡 Especificação da API REST — Gestão de Pátio JB Cunha

Esta documentação detalha todos os endpoints da API REST disponibilizada pelo **API Gateway** (`/api/jbc/v1`).

---

## 1. Padrões de Comunicação & Autenticação

### 1.1. Base URL
```text
http://localhost:3000/api/jbc/v1
```
*(Para compatibilidade com integrações legadas, os endpoints também respondem na raiz `/auth`, `/usuarios`, `/atendimentos`, `/compras`).*

### 1.2. Cabeçalhos Padrão
| Header | Valor | Obrigatório |
|---|---|---|
| `Content-Type` | `application/json` | Sim (em requisições com corpo JSON) |
| `Authorization` | `Bearer <TOKEN_JWT>` | Sim (para endpoints protegidos) |

### 1.3. Códigos de Retorno HTTP
- `200 OK`: Operação concluída com sucesso.
- `201 Created`: Recurso criado com sucesso.
- `400 Bad Request`: Parâmetros inválidos ou campos obrigatórios ausentes.
- `401 Unauthorized`: Token ausente, expirado ou credencial incorreta.
- `403 Forbidden`: Perfil do usuário não tem permissão para esta ação ou ativo.
- `404 Not Found`: Registro não localizado.
- `429 Too Many Requests`: Bloqueio temporário por rate-limiting anti brute-force.
- `500 Internal Server Error`: Erro interno no servidor.

---

## 2. Autenticação & Sessão (`/auth`)

### 2.1. Efetuar Login
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/auth/login`
- **Autenticação**: Pública
- **Body**:
  ```json
  {
    "username": "manuel",
    "password": "sua_senha_aqui"
  }
  ```
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "username": "manuel",
      "nome": "Manuel",
      "role": "admin",
      "empresa_vinculada": null
    }
  }
  ```

### 2.2. Obter Dados do Usuário Logado
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/auth/me`
- **Autenticação**: Bearer Token
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "success": true,
    "usuario": {
      "id": 1,
      "username": "manuel",
      "nome": "Manuel",
      "role": "admin"
    }
  }
  ```

### 2.3. Alterar Senha Própria
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/auth/alterar-senha`
- **Autenticação**: Bearer Token
- **Body**:
  ```json
  {
    "senhaAtual": "senha_antiga",
    "novaSenha": "nova_senha_segura"
  }
  ```

---

## 3. Gestão de Usuários (`/usuarios`) — Apenas Administradores

### 3.1. Listar Usuários
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/usuarios`
- **Permissão**: `role === "admin"`

### 3.2. Criar Novo Usuário
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/usuarios`
- **Permissão**: `role === "admin"`
- **Body**:
  ```json
  {
    "username": "tecnico_joao",
    "nome": "João Soldador",
    "password": "senha_inicial",
    "role": "usuario",
    "empresa_vinculada": null
  }
  ```

---

## 4. Gestão de Atendimentos & Pátio (`/atendimentos`)

### 4.1. Listar Atendimentos
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/atendimentos`
- **Filtros por Query String**:
  - `?etapa=Execução`: Filtra pela etapa operacional atual
  - `?status=aberto`: Apenas equipamentos que estão na oficina (exclui entregues)
  - `?busca=CAT`: Busca textual em placa, cliente ou modelo
- **Comportamento por Perfil**:
  - `admin` e `usuario`: visualizam todos os equipamentos do pátio.
  - `cliente`: visualiza apenas equipamentos pertencentes à sua empresa; valores de custo e números de orçamento ERP são automaticamente omitidos do payload.

### 4.2. Registrar Novo Atendimento
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/atendimentos`
- **Body**:
  ```json
  {
    "cliente": "Vale Logística",
    "responsavel": "Carlos Mecânico",
    "veiculo": "Caminhão Basculante Scania G440",
    "placa": "XYZ-9876",
    "horimetro": 12450.0,
    "km": 340000,
    "servico": "Vazamento no cilindro telescópico da caçamba",
    "baia": "Baia 01 - Hidráulica",
    "prazo_entrega": "2026-10-05"
  }
  ```

### 4.3. Atualizar Etapa Operacional
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/atendimentos/:id/etapa`
- **Body**:
  ```json
  {
    "etapa": "Aguardando Peça",
    "observacao": "Aguardando chegada do jogo de reparo Parker"
  }
  ```

### 4.4. Upload de Foto / Evidência Técnica
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/atendimentos/:id/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `foto`: Arquivo binário de imagem (JPG, PNG, WebP)
  - `legenda`: "Trinca identificada na haste do cilindro"

---

## 5. Módulo de Compras Diretas (`/compras`)

Módulo para aquisição imediata de peças na praça de suprimentos com aprovação gerencial.

### 5.1. Listar Compras Solicitadas
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/compras`
- **Permissão**: `admin`

### 5.2. Solicitar Compra de Peça
- **Método**: `POST`
- **Rota**: `/api/jbc/v1/compras`
- **Body**:
  ```json
  {
    "atendimento_id": 1,
    "descricao": "Jogo de Retentores e O-rings",
    "fornecedor": "Vedaprime Soluções",
    "valor_estimado": 420.50,
    "justificativa": "Substituição emergencial para conclusão do cilindro"
  }
  ```

### 5.3. Aprovar Compra (Manuel)
- **Método**: `PUT`
- **Rota**: `/api/jbc/v1/compras/:id/aprovar`
- **Permissão**: `role === "admin"`

---

## 6. Tempo Real & Modo TV (`/painel` & `/mobile/stream`)

### 6.1. Dados Consolidados para o Painel da TV
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/painel/tv`
- **Autenticação**: Pública (para fácil carregamento em Smart TVs sem teclado)
- **Resposta Sucesso (200 OK)**:
  ```json
  {
    "success": true,
    "totais": {
      "no_patio": 8,
      "em_execucao": 4,
      "aguardando_peca": 2,
      "prontos": 2,
      "atrasados": 1
    },
    "equipamentos": [
      {
        "id": 1,
        "codigo": "AT-0001",
        "veiculo": "Retroescavadeira CAT 416E",
        "placa": "BRA2E19",
        "etapa": "Execução",
        "baia": "Baia 02",
        "atrasado": false
      }
    ],
    "timestamp": "2026-09-30T16:05:00.000Z"
  }
  ```

### 6.2. SSE Stream (Server-Sent Events)
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/mobile/stream`
- **Headers de Resposta**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Mensagens transmitidas**: Eventos `ping` a cada 15 segundos e eventos `data_change` sempre que um atendimento, etapa ou compra direta for adicionada ou alterada.

---

## 7. Status do Sistema
- **Método**: `GET`
- **Rota**: `/api/jbc/v1/status`
- **Resposta (200 OK)**:
  ```json
  {
    "sistema": "Central de Operações JB Cunha",
    "versao": "3.1.0",
    "status": "operacional",
    "timestamp": "2026-09-30T16:05:00.000Z"
  }
  ```
