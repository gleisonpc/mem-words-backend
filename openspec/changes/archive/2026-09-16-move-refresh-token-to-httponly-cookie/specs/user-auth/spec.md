## MODIFIED Requirements

### Requirement: Autenticação por credenciais

O sistema MUST autenticar por e-mail e senha, devolvendo um token de acesso de
vida curta no corpo da resposta e emitindo um token de renovação de vida
longa por cookie `HttpOnly`.

O corpo da resposta MUST NOT incluir o token de renovação — nenhum
JavaScript, legítimo ou injetado por um ataque, pode ter acesso a ele.

A resposta a credenciais inválidas MUST ser indistinguível entre e-mail
inexistente e senha incorreta — tanto na mensagem quanto no tempo de resposta
— para não revelar quais endereços possuem conta.

#### Scenario: Credenciais corretas

- **WHEN** e-mail e senha conferem
- **THEN** a resposta é `200` com o token de acesso e os dados do usuário no
  corpo, e o token de renovação chega por `Set-Cookie`

#### Scenario: Senha incorreta

- **WHEN** o e-mail existe mas a senha não confere
- **THEN** a resposta é `401` com uma mensagem genérica

#### Scenario: E-mail não cadastrado

- **WHEN** o e-mail informado não pertence a nenhuma conta
- **THEN** a resposta é `401` com a mesma mensagem do cenário anterior

### Requirement: Renovação de sessão com rotação

O sistema MUST permitir trocar um token de renovação válido por um novo
token de acesso, sem exigir as credenciais novamente.

O token de renovação MUST ser apresentado por cookie, nunca pelo corpo da
requisição.

Cada renovação MUST invalidar o token apresentado e emitir um novo — o token
de renovação é de uso único. O novo token MUST ser entregue pelo mesmo cookie
`HttpOnly`, substituindo o anterior.

O token de renovação MUST ser armazenado apenas como hash, de modo que o
vazamento do banco não permita reutilizá-lo.

#### Scenario: Renovação válida

- **WHEN** um token de renovação válido e não expirado é apresentado pelo
  cookie
- **THEN** a resposta é `200` com um novo token de acesso no corpo, e um novo
  token de renovação chega por `Set-Cookie`, diferente do anterior

#### Scenario: Token de renovação expirado

- **WHEN** o token apresentado passou da validade
- **THEN** a resposta é `401`

#### Scenario: Cookie ausente

- **WHEN** a requisição de renovação não traz o cookie do token de renovação
- **THEN** a resposta é `401`

### Requirement: Encerramento de sessão

O sistema MUST permitir revogar o token de renovação apresentado pelo cookie,
encerrando aquela sessão, e MUST limpar o cookie na resposta.

A operação MUST ser idempotente e MUST NOT revelar se o token existia — isso
inclui a ausência completa do cookie, que MUST responder sucesso sem tentar
revogar nada.

#### Scenario: Logout

- **WHEN** o cookie do token de renovação está presente na requisição
- **THEN** a resposta é `204`, o token deixa de servir para renovação, e o
  cookie é limpo

#### Scenario: Logout repetido

- **WHEN** o mesmo cookie é enviado para encerramento novamente
- **THEN** a resposta continua sendo `204`

#### Scenario: Logout sem cookie

- **WHEN** a requisição de encerramento não traz o cookie do token de
  renovação
- **THEN** a resposta é `204` sem nenhuma tentativa de revogação

## ADDED Requirements

### Requirement: Cookie do token de renovação

O cookie que carrega o token de renovação MUST ser `HttpOnly`, `Secure` e
`SameSite=None` — o conjunto necessário para um cookie legível entre origens
diferentes (frontend e backend em domínios distintos), e o único que impede
leitura por JavaScript.

O cookie MUST ser escopado a um caminho que cubra apenas as rotas de
autenticação, e não toda chamada ao backend.

A validade do cookie MUST acompanhar a validade do token de renovação que ele
carrega.

#### Scenario: Atributos do cookie

- **WHEN** o backend emite o token de renovação
- **THEN** o cookie correspondente tem `HttpOnly`, `Secure` e `SameSite=None`

#### Scenario: Escopo do cookie

- **WHEN** o cookie é emitido
- **THEN** seu caminho restringe o envio às rotas de autenticação
