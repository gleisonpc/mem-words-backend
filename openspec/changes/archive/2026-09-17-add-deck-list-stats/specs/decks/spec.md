## MODIFIED Requirements

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
