# mem-words-backend

Backend para aplicação que ajuda a memorizar palavras.

API em Node.js com TypeScript, Express e PostgreSQL, com autenticação JWT.

## Requisitos

- Node.js 22+
- npm 10+

O TypeScript é uma dependência de desenvolvimento — não precisa ser instalado globalmente.

## Instalação

```bash
npm install
cp .env.example .env     # preencha DATABASE_URL e os dois segredos de JWT
npm run db:migrate       # cria as tabelas
```

Gere os segredos com `openssl rand -base64 48` (um para cada, **diferentes
entre si**). A aplicação recusa subir sem eles — é proposital: melhor falhar
no boot do que rodar com um segredo vazio.

## Execução

```bash
npm run dev        # desenvolvimento, com reload automático (tsx watch)
npm run build      # compila TypeScript para dist/
npm start          # produção (executa dist/, exige build antes)
npm run typecheck  # checagem de tipos sem emitir arquivos
```

> `npm start` apenas executa `dist/`. **Rode `npm run build` antes** — sem isso
> o Node falha com `Cannot find module dist/server.js`.

O servidor sobe em `http://localhost:3000` por padrão (configurável via `PORT`).

## Endpoints

### Públicos

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Health-check → `{ "status": "ok" }` |
| `POST` | `/auth/register` | Cria um usuário → `201` |
| `POST` | `/auth/login` | Autentica → access + refresh token |
| `POST` | `/auth/refresh` | Troca o refresh token por um novo par |
| `POST` | `/auth/logout` | Revoga o refresh token → `204` |

### Autenticados

Exigem o header `Authorization: Bearer <accessToken>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/users/me` | Dados do usuário autenticado |
| `PATCH` | `/users/:id` | Edita a própria conta |
| `DELETE` | `/users/:id` | Exclui a própria conta → `204` |

`PATCH` e `DELETE` só funcionam sobre a **própria** conta: usar o id de outro
usuário devolve `403`, mesmo com um token válido.

### Exemplo de fluxo

```bash
# 1. cadastro
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Gleison","email":"gleison@example.com","password":"senha12345"}'

# 2. login — devolve accessToken e refreshToken
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gleison@example.com","password":"senha12345"}'

# 3. rota autenticada
curl http://localhost:3000/users/me -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. renovar quando o access token expirar
curl -X POST http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### Formato de erro

```json
{ "error": "Dados inválidos.", "code": "BAD_REQUEST",
  "details": [{ "field": "body.email", "message": "E-mail inválido." }] }
```

## Autenticação

Dois tokens, com papéis distintos:

- **Access token** — JWT curto (15min por padrão), validado só pela
  assinatura, sem ida ao banco. Vai no header `Authorization`.
- **Refresh token** — valor opaco e aleatório (não é JWT), de vida longa
  (7 dias), persistido para poder ser revogado.

Decisões de segurança relevantes:

| Decisão | Motivo |
| --- | --- |
| Senha com hash **bcrypt** (custo 12) | a senha em texto puro nunca é persistida |
| Refresh token guardado como **hash SHA-256** | um vazamento do banco não permite reusar os tokens |
| **Rotação** a cada refresh | o token usado é revogado e um novo é emitido |
| **Detecção de reuso** | reapresentar um token já gasto revoga todas as sessões do usuário |
| Login com mensagem genérica | não revela quais e-mails estão cadastrados |
| Troca de senha exige `currentPassword` | um access token roubado não basta para assumir a conta |
| Troca de senha revoga as sessões abertas | derruba quem estava logado em outros dispositivos |

## Banco de dados

PostgreSQL com [Prisma](https://www.prisma.io/). Em produção usamos o
[Neon](https://neon.tech) — free tier que não expira e acessível por
`DATABASE_URL` padrão, sem lock-in.

```bash
npm run db:migrate   # cria/aplica migrations em desenvolvimento
npm run db:deploy    # aplica migrations pendentes (usado no deploy)
npm run db:studio    # abre o Prisma Studio
```

O client do Prisma é **gerado** em `src/generated/` e não vai para o git —
`npm run build` roda `prisma generate` antes do `tsc`.

Tabelas: `users` e `refresh_tokens` (com `ON DELETE CASCADE`, então excluir
um usuário remove suas sessões).

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | **sim** | — | Connection string do PostgreSQL |
| `JWT_ACCESS_SECRET` | **sim** | — | Segredo do access token |
| `JWT_REFRESH_SECRET` | **sim** | — | Segredo do refresh token (diferente do anterior) |
| `PORT` | não | `3000` | Porta HTTP |
| `NODE_ENV` | não | `development` | Ambiente de execução |
| `CORS_ORIGIN` | não | `*` | Origens permitidas (lista separada por vírgula) |
| `JWT_ACCESS_EXPIRES_IN` | não | `15m` | Validade do access token |
| `JWT_REFRESH_EXPIRES_IN` | não | `7d` | Validade do refresh token |

Em produção os segredos precisam ter ao menos 32 caracteres — validado no boot.

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
├── config/                 # cors.ts, env.ts
├── controllers/            # health, auth, user
├── errors/AppError.ts      # erros com status e código estáveis
├── lib/                    # prisma.ts, jwt.ts, password.ts
├── middlewares/            # authenticate.ts, validate.ts, errorHandler.ts
├── routes/                 # health, auth, user + index
├── schemas/user.schema.ts  # validação com Zod
├── services/               # auth.service.ts, user.service.ts
└── types/                  # contratos de resposta

prisma/
├── schema.prisma           # modelos User e RefreshToken
└── migrations/             # histórico versionado
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

## Deploy (Render)

O `render.yaml` na raiz mantém a configuração versionada. Ao criar o serviço,
use a opção **Blueprint** apontando para o repositório que o Render lê esse
arquivo — não é preciso configurar nada pela interface.

Se preferir criar o serviço manualmente, configure exatamente:

| Campo | Valor |
| --- | --- |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Dois detalhes são obrigatórios, e cada um causa uma falha diferente:

1. **O build precisa rodar.** O build command padrão do Render é só
   `npm install`, que não compila o TypeScript. O start então quebra com
   `Error: Cannot find module '/opt/render/project/src/dist/server.js'`.
2. **`--include=dev` é obrigatório.** O Render define `NODE_ENV=production`,
   e nesse modo o npm pula as `devDependencies` — onde está o `typescript`.
   Sem a flag o build falha com `tsc: not found`.

Variáveis de ambiente no Render:

- `PORT` é injetado automaticamente — **não** defina manualmente
- `NODE_ENV=production` e `CORS_ORIGIN` já vêm declarados no `render.yaml`
- `DATABASE_URL`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` estão marcadas
  como `sync: false`: o Render pede o valor de cada uma no primeiro deploy,
  e elas nunca são versionadas

> Não use o PostgreSQL gratuito do próprio Render para dados que você quer
> manter: esse plano expira e a instância é removida. Por isso a escolha do
> Neon, cujo free tier não tem prazo de validade.

A versão do Node é fixada em duas frentes: `.node-version` (22) e a variável
`NODE_VERSION` no blueprint.

O servidor escuta em `0.0.0.0` (e não apenas em `localhost`), senão o health
check do Render não alcança a aplicação, e trata `SIGTERM` para encerrar as
conexões em andamento a cada deploy.

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
