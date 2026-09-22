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
| `GET` | `/health` | Sinal de vida → `{ "status": "ok" }` (não consulta o banco) |
| `GET` | `/health/ready` | Prontidão → `200` se o banco responde, `503` se não |
| `POST` | `/auth/register` | Cria um usuário → `201` |
| `POST` | `/auth/login` | Autentica → access token no corpo, refresh token por cookie `HttpOnly` |
| `POST` | `/auth/refresh` | Troca o refresh token (cookie) por um novo par |
| `POST` | `/auth/logout` | Revoga o refresh token do cookie → `204` |
| `POST` | `/auth/mobile/login` | Autentica → access **e** refresh token no corpo (cliente mobile, sem cookie) |
| `POST` | `/auth/mobile/refresh` | Troca o refresh token do corpo por um novo par, também no corpo |
| `POST` | `/auth/mobile/logout` | Revoga o refresh token informado no corpo → `204` |

### Autenticados

Exigem o header `Authorization: Bearer <accessToken>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/users/me` | Dados do usuário autenticado |
| `PATCH` | `/users/:id` | Edita a própria conta |
| `DELETE` | `/users/:id` | Exclui a própria conta → `204` |
| `GET` | `/decks` | Lista os baralhos do usuário autenticado |
| `POST` | `/decks` | Cria um baralho → `201` |
| `GET` | `/decks/:id` | Detalhe de um baralho (inclui `cardCount`) |
| `PATCH` | `/decks/:id` | Edita nome e/ou par de idiomas |
| `DELETE` | `/decks/:id` | Exclui o baralho e seus cards em cascata → `204` |
| `GET` | `/decks/:id/cards` | Lista os cards do baralho, paginado (`page`, `pageSize`) |
| `POST` | `/decks/:id/cards` | Cria um card no baralho → `201` |
| `GET` | `/cards/:id` | Detalhe de um card |
| `PATCH` | `/cards/:id` | Edita um card |
| `DELETE` | `/cards/:id` | Exclui um card → `204` |
| `GET` | `/decks/:id/reviews/queue` | Cards prontos para revisão agora, cada um com a prévia das 4 notas |
| `POST` | `/cards/:id/reviews` | Registra uma nota (`again`/`hard`/`good`/`easy`) → card atualizado |
| `GET` | `/reviews/today` | Agregado entre baralhos dos cards prontos agora, por tipo (`newCount`/`learningCount`/`reviewCount`/`dueCount`) |

`PATCH` e `DELETE` só funcionam sobre a **própria** conta: usar o id de outro
usuário devolve `403`, mesmo com um token válido. O mesmo vale para
baralhos e cards: só o dono acessa, edita ou exclui os próprios.

Para baralhos e cards, um `id` que não existe responde `404`; um `id` que
existe mas pertence a outro usuário responde `403` — a resposta não
esconde a existência do recurso, ela só recusa o acesso.

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

Cliente mobile: mesmo fluxo, mas sem cookie — o refresh token vai e volta
pelo corpo (`/auth/mobile/login`, `/auth/mobile/refresh`,
`/auth/mobile/logout`), para ser guardado em armazenamento seguro do
dispositivo (Keychain/Keystore) em vez de um cookie que não existe fora de
um navegador. `/auth/register` é o mesmo para os dois clientes.

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

## Revisão espaçada

Variante fixa e simplificada do SM-2 (estilo Anki) — parâmetros embutidos em
`src/lib/scheduling.ts`, não configuráveis pelo usuário nesta versão.

- **`new`** → recebe qualquer nota → **`learning`**, no primeiro dos passos
  curtos (`1min`, `10min`).
- **`learning`**: `again` volta ao primeiro passo; `hard` repete o passo
  atual; `good` avança ao próximo passo ou gradua para `review`; `easy`
  gradua direto, pulando os passos restantes.
- **`review`** (intervalo em dias, fator de facilidade): `again` volta a
  `learning` e reduz o fator de facilidade; `hard`/`good`/`easy` recalculam
  o intervalo a partir do fator de facilidade (reduzindo, mantendo ou
  aumentando-o, respectivamente), até um teto fixo.

`GET /decks/:id/reviews/queue` traz os cards prontos agora (`new`, ou
`learning`/`review` com `dueAt` vencido) com a prévia do resultado de cada
uma das quatro notas — o mesmo cálculo de `POST /cards/:id/reviews`, só que
sem gravar nada.

Nenhum histórico de revisões é persistido — o card guarda só seu estado
atual.

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
| `DATABASE_URL` | **sim** | — | Connection string do PostgreSQL (use a *pooled*) |
| `DIRECT_DATABASE_URL` | não | `DATABASE_URL` | Conexão **direta**, usada só pelas migrations |
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
| Health Check Path | `/health/ready` |

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
- `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_ACCESS_SECRET` e
  `JWT_REFRESH_SECRET` estão marcadas como `sync: false`: o Render pede o
  valor de cada uma no primeiro deploy, e elas nunca são versionadas

O health check aponta para `/health/ready`, e não para `/health`. A diferença
importa: `/health` só diz que o processo está no ar, então um deploy com
`DATABASE_URL` errada ficaria **verde com o banco fora**, falhando apenas
quando alguém tentasse se cadastrar. `/health/ready` consulta o banco, então
esse deploy falha de imediato.

### Neon: qual connection string usar

O Neon oferece duas. Use a **pooled** (host com `-pooler`) em `DATABASE_URL`,
e a **direta** (sem `-pooler`) em `DIRECT_DATABASE_URL`. Migrations sobre o
endpoint agrupado podem falhar — ele é otimizado para consultas curtas, não
para as operações de esquema.

> Não use o PostgreSQL gratuito do próprio Render para dados que você quer
> manter: esse plano expira e a instância é removida. Por isso a escolha do
> Neon, cujo free tier não tem prazo de validade.

A versão do Node é fixada em duas frentes: `.node-version` (22) e a variável
`NODE_VERSION` no blueprint.

O servidor escuta em `0.0.0.0` (e não apenas em `localhost`), senão o health
check do Render não alcança a aplicação, e trata `SIGTERM` para encerrar as
conexões em andamento a cada deploy.

## Verificando um deploy

`scripts/smoke.sh` exercita um ambiente publicado de ponta a ponta:

```bash
./scripts/smoke.sh https://seu-servico.onrender.com
```

Verifica, nesta ordem: o processo está no ar (`/health`), a aplicação conecta
no banco (`/health/ready`), as tabelas existem (cadastro), e o fluxo de
autenticação funciona — incluindo a rotação do refresh token e a recusa de um
token já usado. Cria um usuário temporário e o remove ao final.

Sai com código `1` na primeira falha, com o diagnóstico provável. Útil em CI
ou como verificação pós-deploy.

> No plano gratuito o serviço hiberna após inatividade: a primeira requisição
> pode levar cerca de um minuto. O script já usa timeout generoso.

## OpenSpec

O projeto usa [OpenSpec](https://github.com/Fission-AI/OpenSpec) para
desenvolvimento orientado a especificação, configurado para o **Claude Code**.

```bash
npm install -g @fission-ai/openspec@latest
```

### Como está organizado

```
openspec/
├── config.yaml              # contexto do projeto, lido pela IA ao planejar
├── specs/                   # o que o sistema JÁ faz (baseline consolidada)
│   ├── health-check/
│   └── http-api-foundation/
└── changes/
    ├── add-user-auth/       # mudança em andamento (aguarda merge do PR)
    └── archive/             # mudanças concluídas e consolidadas
        └── 2026-09-15-add-api-foundation/
```

A distinção que importa: `specs/` descreve o comportamento **já entregue**;
`changes/` descreve o que está **em andamento**. Uma mudança só vira spec ao
ser arquivada.

Cada mudança tem quatro artefatos: `proposal.md` (o quê e por quê),
`specs/<capability>/spec.md` (requisitos em cenários WHEN/THEN),
`design.md` (como, com as alternativas descartadas) e `tasks.md`
(passos de implementação).

### O ciclo

```bash
/opsx:propose "sua ideia"   # cria a mudança e todos os artefatos
/opsx:apply                 # implementa, marcando as tasks
openspec archive <nome>     # consolida os deltas em specs/ após o merge
```

Comandos úteis fora do ciclo:

```bash
openspec list               # mudanças em andamento
openspec list --specs       # capacidades já consolidadas
openspec validate --all     # valida specs e mudanças
openspec show <nome>        # exibe uma mudança ou spec
```

### Convenções

Os artefatos são escritos **em português**, mas as palavras-chave normativas
(`MUST`, `MUST NOT`, `SHALL`) e os títulos estruturais ficam **em inglês** —
é o que o `openspec validate` espera, e está declarado no `config.yaml`.
