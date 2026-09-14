# mem-words-backend

Backend para aplicação que ajuda a memorizar palavras.

API em Node.js com Express. No momento apenas o health-check está implementado.

## Requisitos

- Node.js 22+
- npm 10+

## Instalação

```bash
npm install
cp .env.example .env
```

## Execução

```bash
npm run dev    # desenvolvimento, com reload automático (nodemon)
npm start      # produção
```

O servidor sobe em `http://localhost:3000` por padrão (configurável via `PORT`).

## Endpoints

| Método | Rota      | Descrição                  | Resposta          |
| ------ | --------- | -------------------------- | ----------------- |
| GET    | `/health` | Health-check da aplicação  | `{ "status": "ok" }` |

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Variáveis de ambiente

| Variável      | Padrão        | Descrição                                          |
| ------------- | ------------- | -------------------------------------------------- |
| `PORT`        | `3000`        | Porta HTTP                                          |
| `NODE_ENV`    | `development` | Ambiente de execução                                |
| `CORS_ORIGIN` | `*`           | Origens permitidas pelo CORS (lista separada por vírgula) |

### CORS

Atualmente o CORS está **liberado para qualquer origem** (`CORS_ORIGIN=*`).
Quando a URL do frontend estiver definida, basta informá-la na variável de
ambiente para restringir o acesso — nenhuma alteração de código é necessária:

```bash
CORS_ORIGIN=https://app.mem-words.com,http://localhost:5173
```

## Estrutura

```
src/
├── app.js                  # instância do Express (middlewares + rotas)
├── server.js               # bootstrap do servidor HTTP
├── config/
│   ├── cors.js             # opções de CORS
│   └── env.js              # leitura das variáveis de ambiente
├── controllers/
│   └── health.controller.js
├── middlewares/
│   └── errorHandler.js     # 404 e tratamento centralizado de erros
└── routes/
    ├── health.routes.js
    └── index.js
```

## OpenSpec

O projeto usa [OpenSpec](https://github.com/Fission-AI/OpenSpec) para
desenvolvimento orientado a especificação, configurado para o **Claude Code**.

```bash
npm install -g @fission-ai/openspec@latest
```

- `openspec/` — specs e changes do projeto (contexto em `openspec/config.yaml`)
- `.claude/commands/opsx/` — slash commands (`/opsx:propose`, `/opsx:apply`, ...)
- `.claude/skills/` — skills do OpenSpec para o Claude Code

Para iniciar uma mudança: `/opsx:propose "sua ideia"`.
