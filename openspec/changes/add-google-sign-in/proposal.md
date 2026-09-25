## Why

Hoje o `user-auth` só autentica por e-mail e senha. Isso exige que toda
pessoa crie e lembre mais uma senha, e é o maior atrito conhecido no
cadastro de aplicativos como o mem-words. "Entrar com o Google" elimina
esse atrito para quem já tem conta Google (a maioria), sem enfraquecer o
mecanismo de senha para quem prefere continuar usando-o — as duas formas
de entrar SHALL coexistir na mesma conta.

## What Changes

- Nova rota `POST /auth/google`: recebe um ID token do Google (obtido pelo
  frontend via Google Identity Services, sem redirecionamento OAuth nem
  client secret), verifica sua assinatura/emissor/audiência/validade com a
  biblioteca oficial `google-auth-library`, e autentica a pessoa emitindo o
  mesmo par de tokens que `POST /auth/login` — mesma resposta, mesmo cookie
  `HttpOnly` de renovação, mesma rotação e detecção de reuso já existentes.
- Resolução de conta por e-mail verificado pelo Google: `sub` do Google já
  vinculado a uma conta autentica direto; e-mail que já pertence a uma
  conta com senha vincula o `sub` automaticamente (o Google já garantiu
  que o e-mail pertence a quem está entrando); e-mail desconhecido cria
  conta nova, sem senha.
- Contas passam a poder existir sem senha (`passwordHash` nulo). Isso é uma
  mudança de requisito em `user-auth` (login por credenciais) e em
  `user-management` (troca e confirmação de senha, exclusão de conta): as
  regras que hoje exigem senha atual incondicionalmente precisam prever o
  caso de não haver senha nenhuma para confirmar.
- Nova variável de ambiente obrigatória `GOOGLE_CLIENT_ID` (o Client ID
  OAuth 2.0 Web do Google Cloud Console), documentada em `.env.example`.
- **BREAKING** (schema, não de API): `User.passwordHash` deixa de ser
  obrigatório no banco — migration de coluna, sem afetar contratos HTTP
  existentes.
- Fora de escopo: variante mobile/nativa (`/auth/mobile/google`) — o app
  React Native usaria outro SDK e outro client id; fica para uma change
  futura, análoga a `add-mobile-refresh-auth`.

## Capabilities

### New Capabilities

(nenhuma — esta change estende `user-auth` e `user-management`, não
introduz uma capability nova)

### Modified Capabilities

- `user-auth`: adiciona a autenticação por Google como forma alternativa
  de entrar, e ajusta a autenticação por credenciais para tratar contas
  sem senha (criadas via Google) como credenciais inválidas, nunca como
  erro ou como confirmação de que aquele e-mail existe.
- `user-management`: ajusta a exigência de "senha atual" na troca de senha
  e na exclusão de conta para o caso em que a conta ainda não tem senha
  nenhuma (conta criada via Google) — sem enfraquecer a exigência para
  quem já tem senha.

## Impact

- `prisma/schema.prisma` + migration nova: `User.passwordHash` vira
  opcional; novo campo `User.googleId` (único, opcional).
- `src/services/auth.service.ts`: nova função de login por Google,
  reaproveitando `issueTokens`; `login()` passa a tratar `passwordHash`
  nulo como credencial inválida (mesmo tempo de resposta simulado já
  usado para e-mail inexistente).
- `src/services/user.service.ts`: `updateUser` e `deleteUser` passam a
  dispensar `currentPassword` quando a conta não tem senha definida.
- `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`,
  `src/schemas/user.schema.ts`: novo handler, nova rota, novo schema
  (`{ idToken: string }`) para `POST /auth/google`.
- `src/config/env.ts`, `.env.example`: nova variável obrigatória
  `GOOGLE_CLIENT_ID`.
- Nova dependência: `google-auth-library`.
- Nenhuma mudança em CORS, em `refreshTokenCookie.ts` nem nas rotas
  mobile existentes.
