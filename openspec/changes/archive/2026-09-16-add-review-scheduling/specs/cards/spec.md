## MODIFIED Requirements

### Requirement: Criação de card em um baralho
O sistema SHALL permitir que o dono de um baralho crie um card informando
ao menos a palavra e a tradução; classe gramatical, sinônimos, frase de
exemplo, tradução da frase e anotação pessoal são opcionais. Todo card
criado SHALL iniciar no estado `new`, sem `dueAt` — um card novo só entra
no agendamento de revisão quando recebe sua primeira nota (ver capability
`reviews`).

#### Scenario: Criação com campos obrigatórios
- **WHEN** o dono de um baralho envia `POST /decks/:id/cards` com `word`
  e `translation` válidos
- **THEN** o sistema cria o card vinculado ao baralho com `state: "new"`
  e `dueAt: null`, e responde `201` com o card criado

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

### Requirement: Detalhe de um card
O sistema SHALL retornar o detalhe de um card apenas para o usuário dono
do baralho ao qual ele pertence, incluindo seu agendamento de revisão
atual (`state`, `dueAt`, e, quando aplicável ao estado, o passo de
aprendizado, o fator de facilidade e o intervalo em dias).

#### Scenario: Dono consulta o próprio card
- **WHEN** o dono do baralho de um card envia `GET /cards/:id`
- **THEN** o sistema responde `200` com todos os dados do card, incluindo
  seu agendamento de revisão atual

#### Scenario: Usuário tenta ver card de baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /cards/:id` para um card cujo
  baralho pertence a outro usuário
- **THEN** o sistema responde `403`

#### Scenario: Card inexistente
- **WHEN** um usuário autenticado envia `GET /cards/:id` com um `id` que
  não corresponde a nenhum card
- **THEN** o sistema responde `404`
