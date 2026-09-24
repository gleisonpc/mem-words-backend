## ADDED Requirements

### Requirement: Autenticação por Google

O sistema MUST permitir autenticar apresentando um ID token do Google,
emitido pelo Google Identity Services no cliente, como alternativa ao
par e-mail/senha.

O sistema MUST verificar a assinatura, o emissor, a audiência (contra o
Client ID configurado da aplicação) e a validade do ID token antes de
aceitá-lo. O sistema MUST recusar um ID token cujo e-mail não venha
marcado como verificado pelo Google.

Autenticação por Google bem-sucedida MUST emitir o mesmo par de tokens que
a autenticação por credenciais — token de acesso no corpo da resposta e
token de renovação pelo cookie `HttpOnly` — sujeito às mesmas regras de
rotação e detecção de reuso já existentes para qualquer sessão.

A conta MUST ser resolvida pelo e-mail verificado do token, nesta ordem:

- Se já existe uma conta com o identificador do Google (`sub`) daquele
  token vinculado, autentica-se essa conta.
- Senão, se já existe uma conta com o mesmo e-mail (por exemplo, criada
  por cadastro com senha), o identificador do Google MUST ser vinculado a
  essa conta e ela é autenticada — o vínculo automático é seguro porque o
  Google já garantiu a posse do e-mail.
- Senão, uma conta nova MUST ser criada com nome e e-mail do perfil do
  Google, sem senha definida.

#### Scenario: Primeira entrada com e-mail novo

- **WHEN** chega um ID token do Google válido, com e-mail verificado, que
  não corresponde a nenhuma conta existente
- **THEN** uma conta nova é criada, sem senha, com o identificador do
  Google vinculado, e a resposta é `200` com token de acesso no corpo e
  token de renovação pelo cookie `HttpOnly`

#### Scenario: E-mail já cadastrado por senha

- **WHEN** chega um ID token do Google válido cujo e-mail já pertence a
  uma conta criada por cadastro com senha, ainda sem identificador do
  Google vinculado
- **THEN** o identificador do Google passa a ser vinculado a essa conta
- **AND** a pessoa é autenticada nessa mesma conta, mantendo a senha
  existente utilizável

#### Scenario: Entrada subsequente já vinculada

- **WHEN** chega um ID token do Google cujo identificador já está
  vinculado a uma conta
- **THEN** essa conta é autenticada diretamente, sem nova vinculação

#### Scenario: ID token inválido ou malformado

- **WHEN** o ID token apresentado não tem assinatura válida, está
  expirado, ou tem audiência diferente do Client ID configurado
- **THEN** a resposta é `401` e nenhuma conta é criada ou vinculada

#### Scenario: E-mail não verificado pelo Google

- **WHEN** o ID token apresentado é válido, mas o e-mail nele não está
  marcado como verificado
- **THEN** a resposta é `401` e nenhuma conta é criada ou vinculada

## MODIFIED Requirements

### Requirement: Autenticação por credenciais

O sistema MUST autenticar por e-mail e senha, devolvendo um token de acesso de
vida curta no corpo da resposta e emitindo um token de renovação de vida
longa por cookie `HttpOnly`.

O corpo da resposta MUST NOT incluir o token de renovação — nenhum
JavaScript, legítimo ou injetado por um ataque, pode ter acesso a ele.

A resposta a credenciais inválidas MUST ser indistinguível entre e-mail
inexistente, senha incorreta e conta existente sem senha definida (criada
via login com Google) — tanto na mensagem quanto no tempo de resposta —
para não revelar quais endereços possuem conta nem por qual meio ela foi
criada.

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

#### Scenario: Conta sem senha definida

- **WHEN** o e-mail informado pertence a uma conta criada por login com
  Google, que nunca teve senha definida
- **THEN** a resposta é `401` com a mesma mensagem genérica dos demais
  cenários de credencial inválida, em tempo de resposta equivalente
