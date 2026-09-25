## MODIFIED Requirements

### Requirement: Troca de senha com confirmação

Alterar a senha de uma conta que já tem senha definida MUST exigir a senha
atual, para que um token de acesso obtido indevidamente não baste para
assumir a conta em definitivo.

Definir a primeira senha de uma conta que ainda não tem nenhuma (uma conta
criada por login com Google) MUST NOT exigir senha atual — não há o que
confirmar, e o token de acesso válido já autentica a pessoa.

A troca ou definição de senha MUST revogar as sessões ativas, encerrando
acessos abertos em outros dispositivos.

#### Scenario: Troca sem informar a senha atual

- **WHEN** a conta já tem senha definida e a nova senha é enviada sem a
  senha atual
- **THEN** a resposta é `400`

#### Scenario: Senha atual incorreta

- **WHEN** a senha atual informada não confere
- **THEN** a resposta é `401` e a senha não é alterada

#### Scenario: Troca bem-sucedida

- **WHEN** a senha atual confere e a nova atende às regras
- **THEN** a senha é alterada, a anterior deixa de autenticar e as sessões
  ativas são revogadas

#### Scenario: Primeira senha de uma conta criada via Google

- **WHEN** uma conta sem senha definida envia uma nova senha, sem senha
  atual no corpo
- **THEN** a senha é definida, a resposta é `200`, e as sessões ativas são
  revogadas, exigindo login novamente com o novo par de credenciais ou com
  o Google

### Requirement: Exclusão restrita à própria conta

O sistema MUST permitir que o usuário exclua a própria conta, e MUST recusar a
exclusão de contas de terceiros.

Excluir a conta de quem já tem senha definida MUST exigir a senha atual,
pelo mesmo motivo que a troca de senha já exige: um token de acesso obtido
indevidamente não pode bastar para uma ação irreversível na conta.

Excluir a conta de quem não tem senha definida (conta criada por login com
Google) MUST NOT exigir senha atual — não há o que confirmar, e o token de
acesso válido já autentica a pessoa.

#### Scenario: Exclusão da própria conta

- **WHEN** o usuário exclui a própria conta informando a senha atual correta
- **THEN** a resposta é `204` e as credenciais deixam de autenticar

#### Scenario: Tentativa de excluir conta alheia

- **WHEN** um usuário autenticado tenta excluir a conta de outro
- **THEN** a resposta é `403` e a conta permanece

#### Scenario: Exclusão sem confirmar a senha atual

- **WHEN** a conta tem senha definida e a exclusão é solicitada sem a senha
  atual no corpo da requisição
- **THEN** a resposta é `400` e a conta permanece

#### Scenario: Senha atual incorreta

- **WHEN** a senha atual informada não confere
- **THEN** a resposta é `401` e a conta permanece

#### Scenario: Exclusão de conta sem senha definida

- **WHEN** o usuário autenticado não tem senha definida na conta (criada
  via login com Google) e solicita a exclusão, com ou sem corpo
- **THEN** a resposta é `204` e a conta é excluída
