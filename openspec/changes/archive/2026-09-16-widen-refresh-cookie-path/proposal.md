## Why

O frontend passou a chamar o backend por trás de um proxy da Vercel
(`/api/*` → este backend), para que o cookie do token de renovação seja
tratado como primeira parte pelo navegador (mudança anterior deste projeto
tornava o cookie de terceiros, bloqueado por padrão em navegadores reais).

Verificando esse proxy em produção com Playwright (Chromium com
`--test-third-party-cookie-phaseout`), o cadastro e o login funcionaram e o
cookie foi gravado, mas a renovação (`POST /auth/refresh`, chamada pelo
frontend como `/api/auth/refresh`) voltou `401` — o navegador não enviou o
cookie. Causa: o cookie é emitido com `Path=/auth`, e o navegador só anexa um
cookie a requisições cujo caminho começa com o `Path` declarado. Do ponto de
vista do navegador, a requisição vai para `/api/auth/refresh`, que não começa
com `/auth` — o `Path` deixou de casar assim que uma camada de proxy passou a
prefixar as rotas.

Esse é um caminho que existe hoje em produção: qualquer pessoa que recarregue
a página depois de logar cai de volta para a tela de login, porque a
renovação nunca encontra o cookie. É uma regressão da mudança do proxy, não
um problema pré-existente.

## What Changes

- O cookie do token de renovação passa a ser emitido com `Path=/` em vez de
  `Path=/auth`. **BREAKING** apenas no sentido de mudar o escopo do cookie —
  nenhum formato de requisição ou resposta muda.
- A exigência de que o cookie seja "escopado às rotas de autenticação" é
  removida: o backend não pode mais garantir isso, porque não controla (nem
  deveria precisar conhecer) o caminho que o navegador efetivamente usa —
  esse caminho depende de haver ou não um proxy na frente, e com qual
  prefixo. `Path=/` é o único valor correto nos dois casos (com proxy
  prefixando `/api`, e sem proxy, como em desenvolvimento local).

## Impact

**Código afetado**

- `src/lib/refreshTokenCookie.ts` — `COOKIE_OPTIONS.path` de `'/auth'` para
  `'/'`.

**Specs afetadas**

- `user-auth`: o requisito "Cookie do token de renovação" deixa de exigir
  escopo restrito a rotas de autenticação.

Sem mudança de schema, sem mudança de dependência, sem mudança de contrato
de request/response.
