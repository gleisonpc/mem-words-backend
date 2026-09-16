## Purpose

Decide quais cards de um baralho estão prontos para revisão agora e como a
nota dada pelo usuário em cada um (`again`, `hard`, `good`, `easy`) muda
quando ele volta a aparecer — o motor de repetição espaçada do produto.

## ADDED Requirements

### Requirement: Fila de revisão de um baralho

O sistema SHALL, para o dono de um baralho, listar os cards prontos para
revisão agora: todo card em `new` (ainda não estudado), e todo card em
`learning` ou `review` cujo `dueAt` já tenha passado. Cards em `review` ou
`learning` cujo `dueAt` ainda não chegou SHALL NOT aparecer na fila.

Cada card da fila SHALL vir acompanhado da prévia do intervalo resultante
de cada uma das quatro notas possíveis (`again`, `hard`, `good`, `easy`),
calculada a partir do estado atual do card, para que a tela de revisão
mostre essa prévia sem uma chamada por nota.

A fila SHALL ser ordenada com `learning` primeiro, depois `review`, depois
`new` — um card já em andamento tem prioridade sobre um card novo.

#### Scenario: Dono busca a fila do próprio baralho
- **WHEN** o dono de um baralho envia `GET /decks/:id/reviews/queue`
- **THEN** o sistema responde `200` com os cards em `new`, e os em
  `learning`/`review` com `dueAt` vencido, cada um com a prévia de
  intervalo das quatro notas
- **AND** nenhum card com `dueAt` futuro aparece na resposta

#### Scenario: Fila ordenada por prioridade de estado
- **WHEN** um baralho tem cards em `new`, `learning` e `review` todos
  prontos para revisão
- **THEN** a resposta traz primeiro os `learning`, depois os `review`,
  depois os `new`

#### Scenario: Baralho sem cards prontos
- **WHEN** o dono de um baralho sem cards vencidos ou novos envia
  `GET /decks/:id/reviews/queue`
- **THEN** o sistema responde `200` com uma lista vazia

#### Scenario: Usuário tenta ver a fila de baralho de outra conta
- **WHEN** um usuário autenticado envia `GET /decks/:id/reviews/queue` para
  um baralho que pertence a outro usuário
- **THEN** o sistema responde `403`

### Requirement: Registro de uma nota de revisão

O sistema SHALL permitir que o dono do baralho de um card registre uma nota
de revisão (`again`, `hard`, `good`, `easy`) para esse card, e SHALL usar
essa nota para recalcular seu estado, intervalo e `dueAt` segundo o
algoritmo de repetição espaçada:

- Um card em `new` que recebe qualquer nota SHALL passar a `learning`.
- Um card em `learning` que recebe `again` SHALL voltar ao primeiro passo de
  aprendizado. `hard` SHALL repetir o passo atual. `good` SHALL avançar ao
  próximo passo, ou, se não houver próximo passo, graduar para `review` com
  o intervalo de graduação. `easy` SHALL graduar direto para `review`, com
  um intervalo maior que o de graduação por `good`.
- Um card em `review` que recebe `again` SHALL voltar a `learning`, reiniciar
  o passo de aprendizado e reduzir o fator de facilidade. `hard`, `good` e
  `easy` SHALL manter o card em `review`, recalculando seu intervalo a
  partir do fator de facilidade — `hard` reduz o fator de facilidade,
  `good` o mantém, `easy` o aumenta — respeitando um intervalo máximo fixo.

Nenhuma nota SHALL exigir ou aceitar dados além da nota em si — o
agendamento resultante é sempre determinado pelo estado atual do card e
pela nota recebida, nunca por um valor de intervalo informado pelo cliente.

#### Scenario: Card novo recebe a primeira nota
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "good"` para um card em `new`
- **THEN** o sistema responde `200` com o card em `learning`, no primeiro
  passo de aprendizado avançado, e `dueAt` correspondente

#### Scenario: Card em aprendizado erra a resposta
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "again"` para um card em `learning`
- **THEN** o sistema responde `200` com o card de volta ao primeiro passo de
  aprendizado

#### Scenario: Card em aprendizado gradua para revisão
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "good"` para um card em `learning` já no último passo
- **THEN** o sistema responde `200` com o card em `review`, com o intervalo
  de graduação e `dueAt` recalculado a partir dele

#### Scenario: Card maduro erra a resposta
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "again"` para um card em `review`
- **THEN** o sistema responde `200` com o card de volta a `learning`, no
  primeiro passo, e com o fator de facilidade reduzido

#### Scenario: Card maduro é lembrado facilmente
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "easy"` para um card em `review`
- **THEN** o sistema responde `200` com o card ainda em `review`, fator de
  facilidade maior e um intervalo maior que o anterior, sem ultrapassar o
  intervalo máximo

#### Scenario: Nota inválida
- **WHEN** um usuário envia `POST /cards/:id/reviews` com um valor de
  `grade` fora de `again`/`hard`/`good`/`easy`
- **THEN** o sistema responde `400` com o formato de erro padrão e não
  altera o card

#### Scenario: Usuário tenta registrar nota em card de baralho de outra conta
- **WHEN** um usuário autenticado envia `POST /cards/:id/reviews` para um
  card cujo baralho pertence a outro usuário
- **THEN** o sistema responde `403` e não altera o card

#### Scenario: Card inexistente
- **WHEN** um usuário autenticado envia `POST /cards/:id/reviews` com um
  `id` que não corresponde a nenhum card
- **THEN** o sistema responde `404`
