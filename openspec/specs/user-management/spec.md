# user-management Specification

## Purpose
Permitir que cada pessoa consulte, corrija e encerre a própria conta, sem
alcançar a conta de ninguém mais.

## Requirements

### Requirement: Consulta da própria conta

O sistema MUST permitir que o usuário autenticado obtenha os próprios dados,
sem precisar conhecer o próprio identificador.

A resposta MUST incluir `currentStreak`: quantos dias seguidos, até hoje,
o usuário registrou ao menos uma nota de revisão (ver `reviews`). Um
usuário que nunca registrou nenhuma nota, ou cuja sequência foi
interrompida (passou ao menos um dia sem registrar nenhuma), MUST ter
`currentStreak` igual a `0`.

#### Scenario: Consulta autenticada

- **WHEN** o usuário autenticado consulta os próprios dados
- **THEN** a resposta é `200` com nome, e-mail, identificador e
  `currentStreak`, sem o hash da senha

#### Scenario: Sequência de um usuário que nunca revisou

- **WHEN** um usuário autenticado nunca registrou nenhuma nota de revisão
- **THEN** `currentStreak` na resposta é `0`

#### Scenario: Sequência mantida no mesmo dia

- **WHEN** o usuário registra uma ou mais notas de revisão no mesmo dia
  calendário
- **THEN** `currentStreak` conta esse dia uma única vez, não uma vez por
  nota

#### Scenario: Sequência avança no dia seguinte

- **WHEN** o usuário registrou ao menos uma nota no dia calendário anterior
  e registra outra hoje
- **THEN** `currentStreak` é o valor anterior mais `1`

#### Scenario: Sequência reinicia após intervalo

- **WHEN** o usuário registrou sua última nota há mais de um dia
  calendário e registra uma nova nota hoje
- **THEN** `currentStreak` reinicia em `1`, mesmo que o valor anterior
  fosse maior

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
