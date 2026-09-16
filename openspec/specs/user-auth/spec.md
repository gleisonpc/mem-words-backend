# user-auth Specification

## Purpose
Estabelecer e verificar a identidade de quem usa a aplicação, para que os
dados de cada pessoa — hoje a conta, adiante as listas de palavras — possam
ser atribuídos a ela e protegidos de acesso alheio.

## Requirements

### Requirement: Cadastro de usuário

O sistema MUST permitir criar uma conta a partir de nome, e-mail e senha.

O e-mail MUST ser único e normalizado (sem espaços nas pontas, em minúsculas)
antes da validação e da gravação, para que o mesmo endereço digitado de formas
diferentes não gere contas duplicadas.

A senha MUST ser armazenada apenas como hash; o texto puro MUST NOT ser
persistido nem devolvido em qualquer resposta.

#### Scenario: Cadastro bem-sucedido

- **WHEN** chega um cadastro com nome, e-mail e senha válidos
- **THEN** a conta é criada, a resposta é `201` e o corpo traz os dados do
  usuário sem o hash da senha

#### Scenario: E-mail com variação de caixa ou espaços

- **WHEN** o e-mail é enviado como `"  PESSOA@Exemplo.com "`
- **THEN** ele é gravado como `pessoa@exemplo.com`

#### Scenario: E-mail já cadastrado

- **WHEN** o e-mail informado já pertence a outra conta
- **THEN** a resposta é `409` e nenhuma conta é criada

#### Scenario: Dados inválidos

- **WHEN** o nome, o e-mail ou a senha não atendem às regras de formato
- **THEN** a resposta é `400`, indicando qual campo falhou e por quê

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

### Requirement: Proteção de rotas por token de acesso

Rotas que operam sobre dados de um usuário MUST exigir um token de acesso
válido apresentado no cabeçalho `Authorization`.

O sistema MUST recusar tokens ausentes, malformados, expirados ou assinados
com outro segredo.

#### Scenario: Token válido

- **WHEN** a requisição traz um token de acesso válido
- **THEN** ela é processada em nome do usuário identificado pelo token

#### Scenario: Token ausente

- **WHEN** a requisição não traz o cabeçalho `Authorization`
- **THEN** a resposta é `401`

#### Scenario: Token forjado

- **WHEN** o token foi assinado com um segredo diferente do da aplicação
- **THEN** a resposta é `401`

#### Scenario: Token expirado

- **WHEN** o token de acesso já passou da validade
- **THEN** a resposta é `401`

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

### Requirement: Detecção de reuso de token de renovação

Reapresentar um token de renovação já consumido indica que ele vazou. O
sistema MUST tratar isso como comprometimento e revogar todas as sessões
ativas do usuário.

#### Scenario: Token já utilizado é reapresentado

- **WHEN** um token de renovação que já foi trocado é apresentado de novo
- **THEN** a resposta é `401` e todas as sessões ativas daquele usuário são
  revogadas

#### Scenario: Sessão legítima também cai

- **WHEN** as sessões foram revogadas por detecção de reuso
- **THEN** o token de renovação emitido mais recentemente também deixa de
  funcionar, exigindo novo login

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

### Requirement: Segredos de assinatura obrigatórios

O sistema MUST exigir segredos distintos para os tokens de acesso e de
renovação, e MUST recusar iniciar quando algum estiver ausente.

Em produção, cada segredo MUST ter comprimento mínimo suficiente para
inviabilizar força bruta.

#### Scenario: Segredo ausente

- **WHEN** a aplicação inicia sem um dos segredos configurados
- **THEN** ela falha na inicialização com uma mensagem indicando a variável
  faltante

#### Scenario: Segredos iguais

- **WHEN** os dois segredos configurados são idênticos
- **THEN** a aplicação falha na inicialização
