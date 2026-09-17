## MODIFIED Requirements

### Requirement: Exclusão restrita à própria conta

O sistema MUST permitir que o usuário exclua a própria conta, e MUST recusar a
exclusão de contas de terceiros.

Excluir a conta MUST exigir a senha atual, pelo mesmo motivo que a troca de
senha já exige: um token de acesso obtido indevidamente não pode bastar para
uma ação irreversível na conta.

#### Scenario: Exclusão da própria conta

- **WHEN** o usuário exclui a própria conta informando a senha atual correta
- **THEN** a resposta é `204` e as credenciais deixam de autenticar

#### Scenario: Tentativa de excluir conta alheia

- **WHEN** um usuário autenticado tenta excluir a conta de outro
- **THEN** a resposta é `403` e a conta permanece

#### Scenario: Exclusão sem confirmar a senha atual

- **WHEN** a exclusão é solicitada sem a senha atual no corpo da requisição
- **THEN** a resposta é `400` e a conta permanece

#### Scenario: Senha atual incorreta

- **WHEN** a senha atual informada não confere
- **THEN** a resposta é `401` e a conta permanece
