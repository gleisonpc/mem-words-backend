## MODIFIED Requirements

### Requirement: Cookie do token de renovação

O cookie que carrega o token de renovação MUST ser `HttpOnly`, `Secure` e
`SameSite=None` — o conjunto necessário para um cookie legível entre origens
diferentes (frontend e backend em domínios distintos), e o único que impede
leitura por JavaScript.

O cookie MUST ser escopado à raiz (`Path=/`) da origem que o entrega. O
backend MUST NOT restringir o cookie a um subcaminho fixo (como `/auth`):
qual caminho o navegador de fato usa para chegar às rotas de autenticação
depende de haver ou não um proxy entre o navegador e este backend, e o
backend não tem como conhecer esse detalhe — um `Path` mais restrito que o
caminho real usado pelo navegador faz o cookie deixar de ser enviado.

A validade do cookie MUST acompanhar a validade do token de renovação que ele
carrega.

#### Scenario: Atributos do cookie
- **WHEN** o backend emite o token de renovação
- **THEN** o cookie correspondente tem `HttpOnly`, `Secure` e `SameSite=None`

#### Scenario: Escopo do cookie
- **WHEN** o cookie é emitido
- **THEN** seu caminho é a raiz da origem (`Path=/`), para que o cookie seja
  enviado independentemente de haver um proxy prefixando as rotas entre o
  navegador e o backend
