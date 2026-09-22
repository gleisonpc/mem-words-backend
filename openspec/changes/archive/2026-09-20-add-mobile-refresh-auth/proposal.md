## Why

`mem-words-app` (React Native/Expo) vai consumir este backend como BFF, e
`user-auth` hoje só entrega o refresh token por cookie `HttpOnly`
`SameSite=None` — um mecanismo pensado para navegador. Um app nativo não
tem o mesmo controle sobre armazenamento e envio de cookie que um
navegador tem, e o padrão recomendado para apps móveis é guardar o refresh
token em armazenamento seguro do próprio dispositivo (Keychain/Keystore),
não em cookie. Sem um jeito do backend entregar o token de um jeito que o
app possa guardar dessa forma, o app não consegue manter sessão entre
aberturas.

## What Changes

- Três rotas novas, paralelas às já existentes de login/refresh/logout,
  para clientes mobile: `POST /auth/mobile/login`,
  `POST /auth/mobile/refresh`, `POST /auth/mobile/logout`.
- Nessas rotas, o refresh token viaja no **corpo** da requisição/resposta
  em vez de cookie — sem `Set-Cookie` e sem leitura de cookie.
- Reaproveita inteiramente a lógica de emissão, rotação, detecção de reuso
  e revogação já existente em `auth.service.ts` — só a camada de
  transporte (controller/rotas) é nova; nenhuma regra de negócio de
  `user-auth` muda para o fluxo por cookie já existente.
- `POST /auth/register` continua único, compartilhado pelos dois clientes
  (não emite token, não muda).

## Capabilities

### New Capabilities

(nenhuma — esta change estende `user-auth`, não introduz uma capability
nova)

### Modified Capabilities

- `user-auth`: adiciona o fluxo de autenticação para cliente mobile
  (login, renovação e encerramento de sessão com o refresh token por
  corpo em vez de cookie), sem alterar nenhum requirement do fluxo por
  cookie já existente.

## Impact

- `src/routes/auth.routes.ts`: três rotas novas.
- `src/controllers/auth.controller.ts`: três handlers novos
  (`mobileLogin`, `mobileRefresh`, `mobileLogout`), reaproveitando
  `authService.login`/`refresh`/`logout` sem alteração de assinatura.
- `src/schemas/user.schema.ts`: schema novo para o corpo de
  `POST /auth/mobile/refresh` e `POST /auth/mobile/logout`
  (`{ refreshToken: string }`).
- Nenhuma migration, nenhuma dependência nova, nenhuma mudança em
  `auth.service.ts` ou `refreshTokenCookie.ts`.
