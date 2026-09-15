## ADDED Requirements

### Requirement: Endpoint de prontidão

O sistema MUST expor um endpoint de prontidão distinto do health-check de
vida, que verifique a conexão com o banco de dados antes de responder.

O endpoint MUST responder `200` quando a consulta ao banco tiver êxito, e
`503` quando falhar — para que a plataforma de deploy trate um serviço sem
banco como indisponível, em vez de saudável.

O endpoint MUST NOT expor detalhes do erro de conexão, como host, usuário ou
mensagem original do driver.

O health check da plataforma de deploy MUST apontar para este endpoint, de
modo que um deploy com banco mal configurado falhe de forma visível em vez de
subir quebrado.

#### Scenario: Banco acessível

- **WHEN** o banco responde à consulta de verificação
- **THEN** a resposta é `200` indicando que o serviço está pronto

#### Scenario: Banco inacessível

- **WHEN** a conexão com o banco falha
- **THEN** a resposta é `503`, e o corpo não contém host, credenciais nem a
  mensagem original do driver

#### Scenario: Deploy com credencial de banco incorreta

- **WHEN** o serviço é publicado com uma connection string inválida
- **THEN** o health check da plataforma falha, e o deploy não é dado como
  saudável

#### Scenario: Sinal de vida permanece simples

- **WHEN** o endpoint de vida `GET /health` é consultado
- **THEN** ele responde `200` sem consultar o banco, preservando seu contrato
