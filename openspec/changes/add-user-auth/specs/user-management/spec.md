## Purpose

Permitir que cada pessoa consulte, corrija e encerre a própria conta, sem
alcançar a conta de ninguém mais.

## ADDED Requirements

### Requirement: Consulta da própria conta

O sistema MUST permitir que o usuário autenticado obtenha os próprios dados,
sem precisar conhecer o próprio identificador.

#### Scenario: Consulta autenticada

- **WHEN** o usuário autenticado consulta os próprios dados
- **THEN** a resposta é `200` com nome, e-mail e identificador, sem o hash da
  senha

### Requirement: Edição restrita à própria conta

O sistema MUST permitir editar nome, e-mail e senha da própria conta.

O sistema MUST recusar a operação quando o recurso indicado pertencer a outro
usuário, ainda que o token apresentado seja válido — autenticação identifica,
mas não autoriza por si só.

#### Scenario: Edição da própria conta

- **WHEN** o usuário edita o próprio nome
- **THEN** a resposta é `200` com os dados atualizados

#### Scenario: Tentativa de editar conta alheia

- **WHEN** um usuário autenticado tenta editar a conta de outro
- **THEN** a resposta é `403` e nada é alterado

#### Scenario: Identificador malformado

- **WHEN** o identificador informado não tem o formato esperado
- **THEN** a resposta é `400`

#### Scenario: E-mail já pertencente a outra conta

- **WHEN** o novo e-mail já está em uso
- **THEN** a resposta é `409` e nada é alterado

### Requirement: Troca de senha com confirmação

Alterar a senha MUST exigir a senha atual, para que um token de acesso obtido
indevidamente não baste para assumir a conta em definitivo.

A troca de senha MUST revogar as sessões ativas, encerrando acessos abertos em
outros dispositivos.

#### Scenario: Troca sem informar a senha atual

- **WHEN** a nova senha é enviada sem a senha atual
- **THEN** a resposta é `400`

#### Scenario: Senha atual incorreta

- **WHEN** a senha atual informada não confere
- **THEN** a resposta é `401` e a senha não é alterada

#### Scenario: Troca bem-sucedida

- **WHEN** a senha atual confere e a nova atende às regras
- **THEN** a senha é alterada, a anterior deixa de autenticar e as sessões
  ativas são revogadas

### Requirement: Exclusão restrita à própria conta

O sistema MUST permitir que o usuário exclua a própria conta, e MUST recusar a
exclusão de contas de terceiros.

#### Scenario: Exclusão da própria conta

- **WHEN** o usuário exclui a própria conta
- **THEN** a resposta é `204` e as credenciais deixam de autenticar

#### Scenario: Tentativa de excluir conta alheia

- **WHEN** um usuário autenticado tenta excluir a conta de outro
- **THEN** a resposta é `403` e a conta permanece
