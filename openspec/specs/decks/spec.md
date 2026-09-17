# decks Specification

## Purpose
Guarda os baralhos (decks) de um usuário — o agrupamento de palavras por par
de idiomas e tema — e expõe seu ciclo de vida (criar, listar, editar,
excluir) por uma API autenticada.

## Requirements

### Requirement: Criação de baralho
O sistema SHALL permitir que um usuário autenticado crie um baralho
informando nome e par de idiomas (idioma de origem e idioma de destino).

#### Scenario: Criação com dados válidos
- **WHEN** um usuário autenticado envia `POST /decks` com `name`,
  `sourceLanguage` e `targetLanguage` válidos
- **THEN** o sistema cria o baralho vinculado ao usuário autenticado e
  responde `201` com o baralho criado, incluindo `id`, `name`,
  `sourceLanguage`, `targetLanguage`, `createdAt` e `updatedAt`

#### Scenario: Nome ausente ou vazio
- **WHEN** um usuário autenticado envia `POST /decks` sem `name` ou com
  `name` vazio
- **THEN** o sistema responde `400` com o formato de erro padrão
  (`{ error, code, details }`) e não cria nenhum registro

### Requirement: Listagem dos próprios baralhos

O sistema SHALL listar apenas os baralhos pertencentes ao usuário
autenticado.

Cada baralho na lista SHALL incluir `cardCount` (total de cards),
`dueCount` (cards prontos para revisão agora — mesmo critério usado na
fila de revisão: `new`, ou `learning`/`review` com `dueAt` já passado) e
`matureCount` (cards em `review` com `intervalDays` maior ou igual a 21).

#### Scenario: Usuário com baralhos

- **WHEN** um usuário autenticado envia `GET /decks`
- **THEN** o sistema responde `200` com a lista de baralhos que pertencem
  a esse usuário, e nenhum baralho de outro usuário aparece na resposta
- **AND** cada baralho traz `cardCount`, `dueCount` e `matureCount`

#### Scenario: Usuário sem baralhos

- **WHEN** um usuário autenticado sem nenhum baralho envia `GET /decks`
- **THEN** o sistema responde `200` com uma lista vazia

#### Scenario: Baralho sem nenhum card

- **WHEN** um dos baralhos do usuário não tem nenhum card
- **THEN** esse baralho aparece na lista com `cardCount`, `dueCount` e
  `matureCount` todos iguais a `0`

#### Scenario: Contagem de prontos para revisão

- **WHEN** um baralho tem cards em `new`, ou em `learning`/`review` com
  `dueAt` no passado
- **THEN** `dueCount` desse baralho conta exatamente esses cards

#### Scenario: Contagem de cards maduros

- **WHEN** um baralho tem cards em `review` com `intervalDays` maior ou
  igual a 21
- **THEN** `matureCount` desse baralho conta exatamente esses cards, e
  nenhum card em `new` ou `learning` é contado como maduro

### Requirement: Detalhe de um baralho
O sistema SHALL retornar o detalhe de um baralho, incluindo a contagem de
cards que ele contém, apenas para o usuário dono do baralho.

#### Scenario: Dono consulta o próprio baralho
- **WHEN** o usuário dono de um baralho envia `GET /decks/:id`
- **THEN** o sistema responde `200` com os dados do baralho e a contagem
  total de cards vinculados a ele

#### Scenario: Usuário tenta ver baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /decks/:id` para um baralho
  que pertence a outro usuário
- **THEN** o sistema responde `403` e não revela dados do baralho

#### Scenario: Baralho inexistente
- **WHEN** um usuário autenticado envia `GET /decks/:id` com um `id` que
  não corresponde a nenhum baralho
- **THEN** o sistema responde `404`

### Requirement: Edição de um baralho
O sistema SHALL permitir que apenas o dono de um baralho altere seu nome
e/ou par de idiomas.

#### Scenario: Dono edita nome
- **WHEN** o usuário dono de um baralho envia `PATCH /decks/:id` com um
  novo `name`
- **THEN** o sistema atualiza o baralho e responde `200` com os dados
  atualizados

#### Scenario: Usuário tenta editar baralho de outra conta
- **WHEN** um usuário autenticado envia `PATCH /decks/:id` para um
  baralho que pertence a outro usuário
- **THEN** o sistema responde `403` e não altera o baralho

### Requirement: Exclusão de um baralho com seus cards
O sistema SHALL permitir que apenas o dono de um baralho o exclua, e a
exclusão SHALL remover em cascata todos os cards desse baralho.

#### Scenario: Dono exclui um baralho com cards
- **WHEN** o usuário dono de um baralho que contém cards envia
  `DELETE /decks/:id`
- **THEN** o sistema exclui o baralho e todos os seus cards, e responde
  `204`

#### Scenario: Usuário tenta excluir baralho de outra conta
- **WHEN** um usuário autenticado envia `DELETE /decks/:id` para um
  baralho que pertence a outro usuário
- **THEN** o sistema responde `403` e não exclui o baralho nem seus cards
