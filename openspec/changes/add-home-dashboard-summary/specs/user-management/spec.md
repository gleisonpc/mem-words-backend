## MODIFIED Requirements

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
