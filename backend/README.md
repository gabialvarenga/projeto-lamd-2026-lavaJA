# LavaJÁ — Backend API

Plataforma de solicitação e acompanhamento de lavagem de veículos em pontos fixos.

**Disciplina:** Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas
**Instituição:** PUC Minas — 1º Semestre 2026
**Aluna:** Gabriela Alvarenga Cardoso

---

## Arquitetura do sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        Apps Flutter                          │
│   📱 App Cliente (Dart)          📱 App Lavador (Dart)       │
└──────────┬───────────────────────────────┬───────────────────┘
           │ HTTP REST                     │ HTTP REST
           ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│               Backend REST — Node.js / Express               │
│                                                              │
│  routes → middlewares → controllers → services → repos       │
│                                                              │
│  📡 WebSocket Gateway  ←── consume ──  RabbitMQ (MOM)       │
│     (push aos apps)            ↑                             │
│                          publish (services)                  │
└──────────────────────────────────────┬───────────────────────┘
                                       │ SQL (sql.js)
                                       ▼
                            ┌────────────────────┐
                            │  SQLite
                            │    (4 tabelas)     │
                            └────────────────────┘
```

### Protocolos de comunicação

| Conexão | Protocolo | Formato | Direção |
|---|---|---|---|
| App Flutter → Backend | HTTP 1.1 / REST | JSON | Síncrono |
| Backend → App Flutter | WebSocket (ws) | JSON | Assíncrono push |
| Backend → RabbitMQ | AMQP (amqplib) | JSON | Assíncrono |
| RabbitMQ → Backend | AMQP (amqplib) | JSON | Assíncrono |
| Backend → Banco | SQL (sql.js) | SQL | Síncrono |

> **Decisão arquitetural:** os apps Flutter **não se conectam diretamente ao RabbitMQ**. O backend atua como gateway de eventos — consome as mensagens do broker e as entrega aos apps via WebSocket, isolando as credenciais do cliente mobile.

---

## Schema do banco de dados

Banco: **SQLite** (desenvolvimento)
Schema definido em [`src/config/migrate.js`](src/config/migrate.js)

### Entidades e relações

```
usuarios (1) ──────── (N) veiculos
usuarios (1) ──────── (N) solicitacoes  [como cliente_id]
usuarios (1) ──────── (N) solicitacoes  [como lavador_id]
usuarios (1) ──────── (N) historico_status [como alterado_por]
veiculos (1) ──────── (N) solicitacoes
solicitacoes (1) ───── (N) historico_status
```

### usuarios

| Campo | Tipo | Restrição |
|---|---|---|
| id | TEXT | PK — UUID |
| nome | TEXT | NOT NULL |
| email | TEXT | NOT NULL · UNIQUE |
| telefone | TEXT | opcional |
| tipo | TEXT | NOT NULL · CHECK: `cliente` ou `lavador` |
| criado_em | TEXT | NOT NULL · DEFAULT `datetime('now')` |

### veiculos

| Campo | Tipo | Restrição |
|---|---|---|
| id | TEXT | PK — UUID |
| usuario_id | TEXT | NOT NULL · FK → usuarios |
| placa | TEXT | NOT NULL · UNIQUE |
| modelo | TEXT | NOT NULL |
| cor | TEXT | opcional |
| criado_em | TEXT | NOT NULL · DEFAULT `datetime('now')` |

### solicitacoes

| Campo | Tipo | Restrição |
|---|---|---|
| id | TEXT | PK — UUID |
| cliente_id | TEXT | NOT NULL · FK → usuarios |
| lavador_id | TEXT | opcional · FK → usuarios (preenchido no aceite) |
| veiculo_id | TEXT | NOT NULL · FK → veiculos |
| endereco | TEXT | NOT NULL |
| tipo_servico | TEXT | NOT NULL · CHECK: `simples`, `completa`, `polimento` |
| status | TEXT | NOT NULL · DEFAULT `pendente` · CHECK: `pendente`, `aceita`, `recusada`, `em_execucao`, `concluida`, `cancelada` |
| observacoes | TEXT | opcional |
| criado_em | TEXT | NOT NULL · DEFAULT `datetime('now')` |
| atualizado_em | TEXT | NOT NULL · DEFAULT `datetime('now')` |

### historico_status

| Campo | Tipo | Restrição |
|---|---|---|
| id | TEXT | PK — UUID |
| solicitacao_id | TEXT | NOT NULL · FK → solicitacoes |
| status_anterior | TEXT | opcional (null na criação) |
| status_novo | TEXT | NOT NULL |
| alterado_por | TEXT | NOT NULL · FK → usuarios |
| criado_em | TEXT | NOT NULL · DEFAULT `datetime('now')` |

### Máquina de estados

```
pendente ──→ aceita ──→ em_execucao ──→ concluida
    │            │
    └──→ recusada └──→ cancelada  (somente pelo cliente)
    └──→ cancelada
```

---

## Como executar

### Pré-requisitos

- Node.js 18+
- npm
- RabbitMQ (opcional — o sistema opera em modo offline sem o broker)

### Rodando localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Iniciar o servidor (migrations executam automaticamente)
npm run dev
```

### Variáveis de ambiente (`.env`)

```env
PORT=3000
DB_PATH=./database.sqlite
RABBITMQ_URL=amqp://localhost
NODE_ENV=development
```

### Serviços disponíveis após `npm run dev`

| Serviço | Endereço | Descrição |
|---|---|---|
| API REST | http://localhost:3000/api | Endpoints REST |
| WebSocket | ws://localhost:3000 | Gateway de eventos em tempo real |
| Health check | http://localhost:3000/health | Status do servidor |

---

## Endpoints da API

Base URL: `http://localhost:3000/api`

> 🔒 Rotas protegidas exigem o header `x-usuario-id: <uuid>`.
> 👤 Rotas com papel exigem adicionalmente o tipo correto (cliente ou lavador).

### Usuários

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /usuarios | Público | Cadastrar usuário (cliente ou lavador) |
| GET | /usuarios | 🔒 👤 lavador | Listar usuários (filtros: `?tipo=` · `?nome=`) |
| GET | /usuarios/:id | 🔒 | Buscar por ID (cliente vê só o próprio) |

### Veículos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /veiculos | 🔒 👤 cliente | Cadastrar veículo |
| GET | /veiculos | 🔒 👤 cliente | Listar veículos (`?usuario_id=`) |
| GET | /veiculos/:id | 🔒 | Buscar veículo por ID |

### Solicitações

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /solicitacoes | 🔒 👤 cliente | Criar solicitação de lavagem |
| GET | /solicitacoes | 🔒 | Listar (cliente vê só as próprias; lavador vê todas) |
| GET | /solicitacoes/:id | 🔒 | Buscar com histórico embutido |
| PATCH | /solicitacoes/:id/status | 🔒 | Atualizar status |
| GET | /solicitacoes/:id/historico | 🔒 | Histórico de transições |

### Regras de acesso por papel

| Operação | Quem pode |
|---|---|
| Criar solicitação | Apenas cliente |
| Aceitar / recusar | Apenas lavador |
| Iniciar / concluir | Apenas lavador |
| Cancelar | Apenas cliente (status `pendente` ou `aceita`) |
| Ver solicitações de outros | Apenas lavador |

---

## Eventos RabbitMQ

Exchange: `lavaja.solicitacoes` (type: **topic**)

| Routing key | Produzido quando | Consumidor |
|---|---|---|
| `solicitacao.criada` | Cliente abre solicitação | App Lavador (via WebSocket) |
| `solicitacao.aceita` | Lavador aceita | App Cliente (via WebSocket) |
| `solicitacao.recusada` | Lavador recusa | App Cliente (via WebSocket) |
| `solicitacao.em_execucao` | Lavador inicia o serviço | App Cliente (via WebSocket) |
| `solicitacao.concluida` | Lavador conclui | App Cliente (via WebSocket) |
| `solicitacao.cancelada` | Cliente cancela | App Lavador (via WebSocket) |

---

## Stack tecnológica

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4.x |
| Banco de dados | SQLite (sql.js) |
| Message Broker | RabbitMQ (amqplib 0.10) |
| WebSocket | ws 8.x |
| Identificadores | uuid 9.x |
| Variáveis de ambiente | dotenv 16.x |
| Dev server | nodemon 3.x |

### Por que RabbitMQ como MOM?

O enunciado aceita RabbitMQ, Redis Pub/Sub ou equivalente documentado. O RabbitMQ foi escolhido porque:

- Implementa nativamente **Publish/Subscribe** com exchanges do tipo `topic`, permitindo roteamento flexível por routing key — alinhado com os padrões de Hohpe & Woolf (2003)
- Garante **entrega persistente** de mensagens (`persistent: true`) mesmo em caso de reinicialização do broker
- A biblioteca **amqplib** integra facilmente com Node.js com suporte a async/await
- Suporte nativo a **EDA** sem acoplamento direto entre produtores e consumidores

---

## Estrutura do projeto

```
src/
├── models/          # constantes de domínio e máquina de estados
├── repositories/    # único ponto de acesso ao banco (SQL puro)
├── services/        # lógica de negócio + publicação de eventos
├── controllers/     # interface HTTP (req → service → res)
├── routes/          # mapeamento de URLs e cadeia de middlewares
├── middlewares/     # autenticação e controle de acesso por papel
└── config/
    ├── database.js  # inicialização do SQLite (sql.js)
    ├── migrate.js   # criação das tabelas
    ├── rabbitmq.js  # producer de eventos
    └── websocket.js # consumer do RabbitMQ + gateway WebSocket
```

