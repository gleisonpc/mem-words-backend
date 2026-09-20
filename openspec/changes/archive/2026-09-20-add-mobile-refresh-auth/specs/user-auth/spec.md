## ADDED Requirements

### Requirement: Autenticação de cliente mobile por corpo, sem cookie

O sistema SHALL oferecer `POST /auth/mobile/login`, autenticando por
e-mail e senha com as mesmas regras de `POST /auth/login` (mesma mensagem
genérica para credenciais inválidas, mesmo tempo de resposta
indistinguível), mas devolvendo o token de renovação no **corpo** da
resposta, junto do token de acesso e dos dados do usuário — sem
`Set-Cookie` algum.

#### Scenario: Login mobile com credenciais corretas
- **WHEN** `POST /auth/mobile/login` recebe e-mail e senha que conferem
- **THEN** a resposta é `200` com `accessToken`, `refreshToken`,
  `tokenType`, `expiresIn` e os dados do usuário, todos no corpo
- **AND** a resposta não traz cabeçalho `Set-Cookie`

#### Scenario: Login mobile com credenciais inválidas
- **WHEN** `POST /auth/mobile/login` recebe e-mail inexistente ou senha
  incorreta
- **THEN** a resposta é `401` com a mesma mensagem genérica usada por
  `POST /auth/login`

### Requirement: Renovação de sessão mobile por corpo, sem cookie

O sistema SHALL oferecer `POST /auth/mobile/refresh`, recebendo o token de
renovação no campo `refreshToken` do corpo da requisição — nunca por
cookie — e aplicando exatamente as mesmas regras de rotação, expiração e
detecção de reuso já aplicadas a `POST /auth/refresh`.

A renovação bem-sucedida SHALL devolver um novo `refreshToken` no corpo da
resposta, substituindo o apresentado, sem `Set-Cookie`.

#### Scenario: Renovação mobile válida
- **WHEN** `POST /auth/mobile/refresh` recebe no corpo um `refreshToken`
  válido e não expirado
- **THEN** a resposta é `200` com um novo `accessToken` e um novo
  `refreshToken` no corpo, diferente do apresentado
- **AND** a resposta não traz cabeçalho `Set-Cookie`

#### Scenario: Campo ausente
- **WHEN** `POST /auth/mobile/refresh` é enviado sem `refreshToken` no
  corpo
- **THEN** a resposta é `400` com o formato de erro padrão

#### Scenario: Token de renovação mobile expirado
- **WHEN** o `refreshToken` apresentado no corpo já passou da validade
- **THEN** a resposta é `401`

#### Scenario: Reuso de token de renovação mobile detectado
- **WHEN** um `refreshToken` de um cliente mobile já trocado é apresentado
  de novo em `POST /auth/mobile/refresh`
- **THEN** a resposta é `401` e todas as sessões ativas daquele usuário
  são revogadas — as emitidas por `/auth/login` e por
  `/auth/mobile/login` igualmente, porque ambas compartilham a mesma
  tabela de sessões por usuário

### Requirement: Encerramento de sessão mobile por corpo, sem cookie

O sistema SHALL oferecer `POST /auth/mobile/logout`, revogando o token de
renovação recebido no campo `refreshToken` do corpo — nunca por cookie.

A operação SHALL ser idempotente e SHALL NOT revelar se o token existia,
com o mesmo comportamento do encerramento por cookie: corpo sem
`refreshToken`, ou com um valor que não corresponde a nenhuma sessão,
SHALL responder sucesso do mesmo jeito, sem indicar a diferença.

#### Scenario: Logout mobile com token presente
- **WHEN** `POST /auth/mobile/logout` recebe no corpo um `refreshToken`
  correspondente a uma sessão ativa
- **THEN** a resposta é `204`, e aquele token deixa de servir para
  renovação

#### Scenario: Logout mobile sem token no corpo
- **WHEN** `POST /auth/mobile/logout` é enviado sem `refreshToken` no
  corpo
- **THEN** a resposta é `204`, sem nenhuma tentativa de revogação

#### Scenario: Logout mobile repetido
- **WHEN** o mesmo `refreshToken` já revogado é enviado novamente a
  `POST /auth/mobile/logout`
- **THEN** a resposta continua sendo `204`

### Requirement: Cadastro compartilhado entre cliente web e mobile

`POST /auth/register` SHALL continuar sendo a única rota de cadastro,
usada tanto pelo cliente web quanto pelo mobile — cadastro não emite
token algum, então não há transporte de refresh token a distinguir.

#### Scenario: Cadastro usado pelo cliente mobile
- **WHEN** o app mobile envia `POST /auth/register` com nome, e-mail e
  senha válidos
- **THEN** o comportamento é idêntico ao do cliente web: conta criada,
  `201`, sem token algum no corpo
