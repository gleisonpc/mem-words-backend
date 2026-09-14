# mem-words-backend

Backend para aplicação que ajuda a memorizar palavras.

API em Node.js com TypeScript e Express. No momento apenas o health-check está implementado.

## Requisitos

- Node.js 22+
- npm 10+

O TypeScript é uma dependência de desenvolvimento — não precisa ser instalado globalmente.

## Instalação

```bash
npm install
cp .env.example .env
```

## Execução

```bash
npm run dev        # desenvolvimento, com reload automático (tsx watch)
npm run build      # compila TypeScript para dist/
npm start          # produção (executa dist/, exige build antes)
npm run typecheck  # checagem de tipos sem emitir arquivos
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
├── app.ts                  # instância do Express (middlewares + rotas)
├── server.ts               # bootstrap do servidor HTTP
├── config/
│   ├── cors.ts             # opções de CORS
│   └── env.ts              # leitura e validação das variáveis de ambiente
├── controllers/
│   └── health.controller.ts
├── middlewares/
│   └── errorHandler.ts     # 404 e tratamento centralizado de erros
├── routes/
│   ├── health.routes.ts
│   └── index.ts
└── types/
    └── health.ts           # tipos de resposta do health-check
```

O build gera `dist/` com JavaScript, *source maps* e arquivos de declaração
(`.d.ts`).

### TypeScript

`tsconfig.json` usa `strict` com as checagens adicionais
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`) e `module`/`moduleResolution` em `nodenext`.

Por causa do `nodenext`, **imports relativos levam a extensão `.js`** mesmo
apontando para arquivos `.ts` — é o caminho do arquivo já compilado:

```ts
import env from './config/env.js';
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
