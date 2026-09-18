## MODIFIED Requirements

### Requirement: Listagem dos próprios baralhos

O sistema SHALL listar apenas os baralhos pertencentes ao usuário
autenticado.

Cada baralho na lista SHALL incluir `cardCount` (total de cards),
`dueCount` (cards prontos para revisão agora — mesmo critério usado na
fila de revisão: `new`, ou `learning`/`review` com `dueAt` já passado —
excluindo cards suspensos), `newCount` (cards com `status: "new"`),
`learningCount` (cards com `status: "learning"`), `matureCount` (cards
com `status: "mature"` — em `review`, não classificados como `difficult`,
com `intervalDays` maior ou igual a 21) e `suspendedCount` (cards
suspensos).

#### Scenario: Usuário com baralhos

- **WHEN** um usuário autenticado envia `GET /decks`
- **THEN** o sistema responde `200` com a lista de baralhos que pertencem
  a esse usuário, e nenhum baralho de outro usuário aparece na resposta
- **AND** cada baralho traz `cardCount`, `dueCount`, `newCount`,
  `learningCount`, `matureCount` e `suspendedCount`

#### Scenario: Usuário sem baralhos

- **WHEN** um usuário autenticado sem nenhum baralho envia `GET /decks`
- **THEN** o sistema responde `200` com uma lista vazia

#### Scenario: Baralho sem nenhum card

- **WHEN** um dos baralhos do usuário não tem nenhum card
- **THEN** esse baralho aparece na lista com todas as contagens iguais a
  `0`

#### Scenario: Contagem de prontos para revisão

- **WHEN** um baralho tem cards em `new`, ou em `learning`/`review` com
  `dueAt` no passado
- **THEN** `dueCount` desse baralho conta exatamente esses cards, exceto
  os que estiverem suspensos

#### Scenario: Contagem de cards maduros

- **WHEN** um baralho tem cards em `review` com `intervalDays` maior ou
  igual a 21
- **THEN** `matureCount` desse baralho conta exatamente esses cards, e
  nenhum card em `new` ou `learning` é contado como maduro

#### Scenario: Contagem de prontos para revisão exclui suspensos

- **WHEN** um baralho tem cards em `new`, ou em `learning`/`review` com
  `dueAt` no passado, e um desses cards está suspenso
- **THEN** `dueCount` desse baralho conta os elegíveis, exceto o suspenso

#### Scenario: Contagem de cards maduros exclui os difíceis

- **WHEN** um baralho tem cards em `review` com `intervalDays` maior ou
  igual a 21, e um desses cards tem `lastGrade: "hard"`
- **THEN** `matureCount` desse baralho conta os demais, mas não esse card
  difícil
- **AND** nenhum card em `new`, `learning` ou suspenso é contado como
  maduro

### Requirement: Detalhe de um baralho

O sistema SHALL retornar o detalhe de um baralho, incluindo as mesmas
contagens por status expostas em `GET /decks` (`cardCount`, `dueCount`,
`newCount`, `learningCount`, `matureCount`, `suspendedCount`), apenas
para o usuário dono do baralho.

#### Scenario: Dono consulta o próprio baralho
- **WHEN** o usuário dono de um baralho envia `GET /decks/:id`
- **THEN** o sistema responde `200` com os dados do baralho e `cardCount`,
  `dueCount`, `newCount`, `learningCount`, `matureCount` e
  `suspendedCount`

#### Scenario: Usuário tenta ver baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /decks/:id` para um baralho
  que pertence a outro usuário
- **THEN** o sistema responde `403` e não revela dados do baralho

#### Scenario: Baralho inexistente
- **WHEN** um usuário autenticado envia `GET /decks/:id` com um `id` que
  não corresponde a nenhum baralho
- **THEN** o sistema responde `404`
