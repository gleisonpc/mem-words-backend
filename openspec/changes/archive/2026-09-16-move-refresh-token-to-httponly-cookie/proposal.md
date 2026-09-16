## Why

O token de renovação — de vida longa (7 dias) e capaz de gerar sessões novas
indefinidamente enquanto não é revogado — hoje viaja no corpo da resposta e no
corpo das requisições, e o frontend o guarda em `localStorage` para poder
reenviá-lo. Qualquer XSS no frontend alcança esse token, e com ele consegue
manter acesso à conta mesmo depois de a vítima trocar a senha (mas não do
token de acesso, que expira em 15 minutos).

Um cookie `httpOnly` fecha essa lacuna: o navegador guarda e envia o cookie
sozinho, e nenhum JavaScript — nem o legítimo, nem o injetado por um ataque —
consegue lê-lo. Essa mudança foi registrada como pendência já na proposta que
introduziu a autenticação, à espera de o backend ter uma origem de frontend
específica para restringir o CORS — o que o PR anterior (CORS por origem)
acabou de resolver, e que um cookie entre origens diferentes exige.

## What Changes

- `POST /auth/login` e `POST /auth/refresh` **BREAKING**: deixam de devolver
  `refreshToken` no corpo. O token de renovação passa a ser entregue por
  `Set-Cookie`, com `HttpOnly`, `Secure` e `SameSite=None` — necessário porque
  frontend e backend estão em domínios diferentes (Vercel e Render).
- `POST /auth/refresh` e `POST /auth/logout` **BREAKING**: deixam de esperar
  `refreshToken` no corpo. O token é lido do cookie da requisição.
- O cookie é escopado a `Path=/auth` — só é enviado às próprias rotas de
  autenticação, não a toda chamada ao backend.
- `POST /auth/logout` sem cookie presente responde `204` sem tentar revogar
  nada — continua idempotente, mas o "nada a revogar" agora inclui "nenhum
  token foi apresentado".
- CORS ganha `credentials: true`, mas **somente** quando `CORS_ORIGIN` lista
  origens específicas. Com a lista vazia ou `*` (qualquer origem liberada),
  `credentials` permanece `false` — combinar `Access-Control-Allow-Origin: *`
  com credenciais é uma configuração que o próprio navegador recusa, e usá-la
  do mesmo jeito seria abrir a leitura de cookies de sessão para qualquer site.

Nenhuma mudança na duração das sessões, na rotação a cada uso ou na detecção
de reuso — o mecanismo de renovação continua o mesmo; muda apenas por onde o
token de renovação viaja.

## Capabilities

### Modified Capabilities

- `user-auth`: onde e como o token de renovação é entregue e apresentado —
  cookie `httpOnly`, não mais corpo da requisição/resposta.
- `http-api-foundation`: a política de CORS ganha a regra de que credenciais
  só acompanham uma lista de origens específica, nunca o modo aberto.

## Impact

**Código afetado**

- `src/services/auth.service.ts` — `issueTokens` deixa de incluir
  `refreshToken` no valor de retorno usado na resposta.
- `src/controllers/auth.controller.ts` — `login` e `refresh` escrevem o cookie
  na resposta; `refresh` e `logout` leem o token do cookie da requisição, não
  de `req.body`.
- `src/routes/auth.routes.ts` — `refresh` e `logout` deixam de validar corpo
  (não esperam mais `refreshToken` nele).
- `src/schemas/user.schema.ts` — `refreshSchema` deixa de ser usado nessas
  duas rotas.
- `src/config/cors.ts` — `credentials` passa a depender do modo de origem.
- `.env.example`, `render.yaml` — sem variável nova; os atributos do cookie
  não dependem de configuração.

**Consumidor externo**

O frontend (`mem-words-frontend`) é o único consumidor desta API e está sendo
migrado na sequência, em mudança própria naquele repositório. Entre o deploy
deste backend e o deploy do frontend atualizado, sessões que dependam de
`refreshToken` no corpo — o frontend hoje em produção — deixam de renovar e
pedem login de novo. Corte direto, sem período de transição com os dois
formatos aceitos: aceitável para um produto em desenvolvimento inicial, sem
usuários reais a proteger; o custo é sessões ativas caindo durante a janela
curta entre os dois deploys, não perda de dados.

**Sem impacto**

- Nenhuma dependência nova: os atributos de cookie são escritos com
  `res.cookie()`/`res.clearCookie()`, já parte do Express; a leitura do cookie
  da requisição usa um analisador mínimo escrito para este único cookie, pela
  mesma razão que o padrão de CORS anterior evitou uma biblioteca de glob —
  desproporcional para o tamanho do problema.
- O modelo de dados (`RefreshToken` no banco) não muda: o hash, a rotação e a
  detecção de reuso continuam idênticos. Muda o transporte, não a regra de
  negócio.
