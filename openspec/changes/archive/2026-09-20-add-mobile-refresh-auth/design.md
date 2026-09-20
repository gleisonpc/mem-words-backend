## Context

Ver proposal.md para motivação. `auth.service.ts` já separa `IssuedTokens`
(inclui `refreshToken` em texto puro) de `AuthTokens` (sem ele) — hoje só o
controller decide descartar `refreshToken` do corpo e gravá-lo em cookie.
Essa separação já existente é o que torna esta change pequena: nenhuma
regra de emissão, rotação ou detecção de reuso muda, só a camada de
transporte ganha um segundo caminho.

## Goals / Non-Goals

**Goals:**
- Entregar e receber o refresh token pelo corpo da requisição/resposta
  para um cliente mobile, sem tocar no fluxo por cookie já em produção
  para o `mem-words-frontend`.
- Reaproveitar 100% de `auth.service.ts` sem alteração de assinatura.

**Non-Goals:**
- Nenhuma mudança em como tokens são armazenados, hasheados ou rotacionados.
- Nenhuma segmentação de sessões por tipo de cliente (web vs. mobile) na
  detecção de reuso — continua por usuário, como já é hoje. Se um refresh
  token mobile vazar e for reusado, todas as sessões do usuário caem,
  inclusive as do navegador; aceito como o mesmo comportamento que já
  existe entre múltiplos navegadores/dispositivos do mesmo usuário hoje.
- Rotação de segredo de assinatura, expiração diferente para mobile —
  usa exatamente `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` já
  configurados.

## Decisions

### Rotas próprias (`/auth/mobile/*`) em vez de um cabeçalho de detecção

Alternativa descartada: uma única rota (`/auth/login`) que decide se
devolve o token por cookie ou por corpo a partir de um cabeçalho como
`X-Client: mobile`. Descartada porque:
- Um cabeçalho forjado por engano (ou por um proxy que o remove) muda o
  transporte do token silenciosamente — o tipo de bug mais perigoso de se
  ter em código de autenticação.
- Rotas próprias tornam o comportamento de cada cliente auditável na
  definição da rota (`auth.routes.ts`), sem examinar lógica condicional
  dentro do controller.
- O custo é três rotas a mais, todas finas (poucas linhas cada),
  delegando ao mesmo service.

### Reaproveitamento total do service

Os três handlers novos (`mobileLogin`, `mobileRefresh`, `mobileLogout`)
chamam exatamente `authService.login`/`refresh`/`logout` — as mesmas
funções que os handlers existentes já chamam. A única diferença de cada
par (web vs. mobile) é:
- Onde o `refreshToken` é lido (cookie vs. `req.body.refreshToken`).
- Onde ele é escrito (`Set-Cookie` vs. corpo da resposta).

Nenhuma outra lógica se repete: valida-se com o schema Zod já existente
(`loginSchema`) para o login, e um schema novo, mínimo
(`mobileRefreshSchema`, `mobileLogoutSchema` — ambos só `{ refreshToken:
string }`, o segundo opcional), para as outras duas.

### Corpo sem cookie é aceitável para mobile

O motivo dos atributos `HttpOnly`/`Secure`/`SameSite=None` do cookie é
impedir leitura por JavaScript de página web (mitiga XSS) e permitir uso
entre origens diferentes no navegador. Um app nativo não executa
JavaScript de terceiros no mesmo processo que lê a resposta, então a
mesma superfície de ataque (XSS lendo o token) não existe; o risco
equivalente em mobile é o armazenamento em disco, mitigado guardando o
token em Keychain/Keystore (`expo-secure-store`, do lado do app) — fora do
escopo deste backend, mas é a contrapartida que torna o corpo aceitável
aqui. Este é o padrão descrito pelo OWASP MASVS para tokens de sessão em
apps nativos.

## Risks / Trade-offs

- [Três rotas a mais para manter em paralelo às três já existentes] →
  aceito porque cada uma é uma casca fina sobre o mesmo service; risco de
  divergência de comportamento mitigado por um teste manual espelhado
  (mesmo roteiro de `curl` das rotas web, repetido nas rotas mobile) na
  verificação final desta change.
- [Vazamento de um refresh token mobile derruba sessões web do mesmo
  usuário também] → comportamento herdado do desenho atual de
  `user-auth`, não introduzido por esta change; revisitar apenas se o
  produto precisar de "sair de todos os dispositivos, exceto este".
