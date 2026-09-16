## Purpose

Guarda os cards (palavras) que compõem um baralho — palavra, tradução e o
material de apoio para lembrar dela — e expõe seu ciclo de vida por uma API
autenticada, restrita ao dono do baralho.

## ADDED Requirements

### Requirement: Criação de card em um baralho
O sistema SHALL permitir que o dono de um baralho crie um card informando
ao menos a palavra e a tradução; classe gramatical, sinônimos, frase de
exemplo, tradução da frase e anotação pessoal são opcionais. Todo card
criado SHALL iniciar no estado `new`.

#### Scenario: Criação com campos obrigatórios
- **WHEN** o dono de um baralho envia `POST /decks/:id/cards` com `word`
  e `translation` válidos
- **THEN** o sistema cria o card vinculado ao baralho com `state: "new"`
  e responde `201` com o card criado

#### Scenario: Criação com todos os campos opcionais
- **WHEN** o dono de um baralho envia `POST /decks/:id/cards` incluindo
  `partOfSpeech`, `synonyms`, `exampleSentence`, `exampleTranslation` e
  `personalNote`
- **THEN** o sistema persiste todos os campos enviados e responde `201`
  com o card criado

#### Scenario: Palavra ou tradução ausente
- **WHEN** um usuário envia `POST /decks/:id/cards` sem `word` ou sem
  `translation`
- **THEN** o sistema responde `400` com o formato de erro padrão e não
  cria o card

#### Scenario: Usuário tenta criar card em baralho de outra conta
- **WHEN** um usuário autenticado envia `POST /decks/:id/cards` para um
  baralho que pertence a outro usuário
- **THEN** o sistema responde `403` e não cria o card

### Requirement: Listagem dos cards de um baralho
O sistema SHALL listar os cards de um baralho apenas para o usuário dono
desse baralho, com paginação.

#### Scenario: Dono lista os cards do próprio baralho
- **WHEN** o dono de um baralho envia `GET /decks/:id/cards`
- **THEN** o sistema responde `200` com os cards desse baralho,
  paginados, e nenhum card de outro baralho aparece na resposta

#### Scenario: Usuário tenta listar cards de baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /decks/:id/cards` para um
  baralho que pertence a outro usuário
- **THEN** o sistema responde `403`

### Requirement: Detalhe de um card
O sistema SHALL retornar o detalhe de um card apenas para o usuário dono
do baralho ao qual ele pertence.

#### Scenario: Dono consulta o próprio card
- **WHEN** o dono do baralho de um card envia `GET /cards/:id`
- **THEN** o sistema responde `200` com todos os dados do card

#### Scenario: Usuário tenta ver card de baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /cards/:id` para um card cujo
  baralho pertence a outro usuário
- **THEN** o sistema responde `403`

#### Scenario: Card inexistente
- **WHEN** um usuário autenticado envia `GET /cards/:id` com um `id` que
  não corresponde a nenhum card
- **THEN** o sistema responde `404`

### Requirement: Edição de um card
O sistema SHALL permitir que apenas o dono do baralho de um card altere
seus campos (palavra, tradução, classe gramatical, sinônimos, frase de
exemplo, tradução da frase, anotação pessoal).

#### Scenario: Dono edita a anotação pessoal
- **WHEN** o dono do baralho de um card envia `PATCH /cards/:id` com um
  novo `personalNote`
- **THEN** o sistema atualiza o card e responde `200` com os dados
  atualizados

#### Scenario: Usuário tenta editar card de baralho de outra conta
- **WHEN** um usuário autenticado envia `PATCH /cards/:id` para um card
  cujo baralho pertence a outro usuário
- **THEN** o sistema responde `403` e não altera o card

### Requirement: Exclusão de um card
O sistema SHALL permitir que apenas o dono do baralho de um card o
exclua.

#### Scenario: Dono exclui um card
- **WHEN** o dono do baralho de um card envia `DELETE /cards/:id`
- **THEN** o sistema exclui o card e responde `204`

#### Scenario: Usuário tenta excluir card de baralho de outra conta
- **WHEN** um usuário autenticado envia `DELETE /cards/:id` para um card
  cujo baralho pertence a outro usuário
- **THEN** o sistema responde `403` e não exclui o card
