# cards Specification

## Purpose
Guarda os cards (palavras) que compõem um baralho — palavra, tradução e o
material de apoio para lembrar dela — e expõe seu ciclo de vida por uma API
autenticada, restrita ao dono do baralho.

## Requirements

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

### Requirement: Suspensão e reativação de um card

O sistema SHALL permitir que apenas o dono do baralho de um card o
suspenda e o reative, como uma ação explícita e reversível, escolhida
pelo usuário no momento que ele quiser — nunca automática.

Suspender ou reativar um card SHALL NOT alterar seu agendamento de
revisão (`state`, `learningStep`, `easeFactor`, `intervalDays`, `dueAt`):
reativar um card SHALL retomá-lo exatamente de onde a suspensão o
interrompeu.

Suspender um card já suspenso, e reativar um card já ativo, SHALL ser
aceito sem erro, deixando o card no mesmo estado de suspensão que já
tinha.

#### Scenario: Dono suspende um card
- **WHEN** o dono do baralho de um card envia `POST /cards/:id/suspend`
- **THEN** o sistema marca o card como suspenso e responde `200` com os
  dados atualizados do card
- **AND** `state`, `learningStep`, `easeFactor`, `intervalDays` e `dueAt`
  do card permanecem exatamente como estavam antes

#### Scenario: Dono reativa um card suspenso
- **WHEN** o dono do baralho de um card suspenso envia
  `POST /cards/:id/unsuspend`
- **THEN** o sistema remove a suspensão e responde `200` com os dados
  atualizados do card
- **AND** `state`, `learningStep`, `easeFactor`, `intervalDays` e `dueAt`
  do card permanecem exatamente como estavam antes da reativação

#### Scenario: Suspender um card já suspenso
- **WHEN** o dono do baralho de um card já suspenso envia
  `POST /cards/:id/suspend` de novo
- **THEN** o sistema responde `200` com o card ainda suspenso, sem erro

#### Scenario: Usuário tenta suspender card de baralho de outra conta
- **WHEN** um usuário autenticado envia `POST /cards/:id/suspend` ou
  `POST /cards/:id/unsuspend` para um card cujo baralho pertence a outro
  usuário
- **THEN** o sistema responde `403` e não altera a suspensão do card

#### Scenario: Card inexistente
- **WHEN** um usuário autenticado envia `POST /cards/:id/suspend` ou
  `POST /cards/:id/unsuspend` com um `id` que não corresponde a nenhum
  card
- **THEN** o sistema responde `404`

### Requirement: Busca e filtro na listagem de cards de um baralho

`GET /decks/:id/cards` SHALL aceitar dois parâmetros de consulta
opcionais, combináveis com a paginação já existente:

- `q`: filtra pelos cards cuja palavra (`word`) contém o texto informado,
  sem diferenciar maiúsculas de minúsculas.
- `status`: filtra pelos cards cujo `status` calculado (ver requirement
  "Status calculado de um card") seja exatamente o valor informado —
  `new`, `learning`, `difficult`, `mature`, `reviewing` ou `suspended`.

Os dois parâmetros, quando informados juntos, SHALL se combinar (E lógico
— cards que casam com ambos). `total`, `page` e `pageSize` da resposta
SHALL refletir o resultado já filtrado, não o total geral de cards do
baralho.

#### Scenario: Busca por palavra
- **WHEN** o dono de um baralho envia `GET /decks/:id/cards?q=over`
- **THEN** o sistema responde `200` só com os cards cuja palavra contém
  "over", e `total` reflete essa contagem filtrada

#### Scenario: Filtro por status
- **WHEN** o dono de um baralho envia
  `GET /decks/:id/cards?status=difficult`
- **THEN** o sistema responde `200` só com os cards cujo `status`
  calculado é `difficult`

#### Scenario: Busca e filtro combinados
- **WHEN** o dono de um baralho envia
  `GET /decks/:id/cards?q=over&status=learning`
- **THEN** o sistema responde `200` só com os cards que casam com os dois
  critérios ao mesmo tempo

#### Scenario: Sem `q` nem `status`
- **WHEN** o dono de um baralho envia `GET /decks/:id/cards` sem `q` nem
  `status`
- **THEN** o sistema responde `200` com todos os cards do baralho,
  paginados, como antes desta mudança

#### Scenario: Nenhum card casa com o filtro
- **WHEN** o filtro informado não casa com nenhum card do baralho
- **THEN** o sistema responde `200` com uma lista vazia e `total: 0`, não
  um erro

### Requirement: Status calculado de um card

Toda resposta pública de um card SHALL incluir um campo `status`,
calculado pelo sistema a partir de `suspended`, `state`, `lastGrade` (a
nota da revisão mais recente — ver capability `reviews`) e
`intervalDays`, nesta ordem de prioridade, da mais alta para a mais
baixa:

1. `suspended` — card suspenso, qualquer que seja seu `state`
2. `new` — `state` é `new`
3. `learning` — `state` é `learning`
4. `difficult` — `state` é `review` e `lastGrade` é `hard`
5. `mature` — `state` é `review`, `lastGrade` não é `hard`, e
   `intervalDays` é maior ou igual ao limiar de maturidade (21 dias)
6. `reviewing` — `state` é `review` e nenhuma das condições acima se
   aplica

Nenhum outro campo do card SHALL ser necessário para reconstruir essa
classificação — clientes NÃO SHALL precisar conhecer o limiar de
maturidade nem a ordem de prioridade para exibir o status de um card.

#### Scenario: Card suspenso tem prioridade sobre qualquer outro status
- **WHEN** um card suspenso está em `review` com `intervalDays` maior que
  o limiar de maturidade
- **THEN** seu `status` é `suspended`, não `mature`

#### Scenario: Card difícil não é considerado maduro
- **WHEN** um card em `review` tem `intervalDays` maior ou igual ao
  limiar de maturidade, mas sua última nota (`lastGrade`) foi `hard`
- **THEN** seu `status` é `difficult`, não `mature`

#### Scenario: Card em revisão, jovem e sem dificuldade recente
- **WHEN** um card em `review` tem `intervalDays` menor que o limiar de
  maturidade e sua última nota não foi `hard`
- **THEN** seu `status` é `reviewing`
