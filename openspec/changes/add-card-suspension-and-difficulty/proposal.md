## Why

O frontend está redesenhando a tela de detalhe de um baralho para mostrar,
por baralho, quantos cards estão novos, aprendendo, maduros e suspensos, e
para marcar na tabela de cards os que estão "difíceis". Hoje o backend não
tem nenhuma noção de card suspenso — `CardState` só tem `new`/`learning`/
`review`, e o próprio código do motor de repetição (`scheduling.ts`) já
registra que suspender foi propositalmente deixado de fora ("ação manual
sem tela nesta mudança"). Também não existe como saber se um card está
"difícil": nenhum histórico de notas é guardado, só o agendamento atual
derivado delas.

## What Changes

- Suspender um card vira uma ação explícita e reversível do usuário,
  ortogonal ao agendamento de revisão: um novo campo booleano `suspended`
  (padrão `false`), sem tocar em `state`/`learningStep`/`easeFactor`/
  `intervalDays`/`dueAt` — reativar retoma exatamente de onde parou.
- Dois endpoints novos: `POST /cards/:id/suspend` e
  `POST /cards/:id/unsuspend`, restritos ao dono do baralho, idempotentes.
- Card suspenso deixa de contar como "pronto para revisão": some da fila
  (`GET /decks/:id/reviews/queue`) e de `dueCount`, qualquer que seja seu
  `state`/`dueAt`.
- A última nota recebida passa a ser persistida (`lastGrade`, `null` até a
  primeira revisão) — reaproveita a nota `hard` que já existe em vez de
  criar um conceito novo de dificuldade.
- **BREAKING** (comportamento, não formato): a resposta pública de um card
  ganha um campo `status` calculado no servidor —
  `new`/`learning`/`difficult`/`mature`/`reviewing`/`suspended` — que passa
  a ser a fonte única da classificação exibida, prioridade nessa ordem
  (do topo para baixo). Isso redefine `matureCount`: um card em `review`
  com `intervalDays >= 21` cuja última nota foi `hard` deixa de contar
  como maduro (ver design.md).
- `GET /decks` e `GET /decks/:id` passam a expor a mesma contagem por
  status: `newCount`, `learningCount`, `matureCount` (redefinido),
  `suspendedCount`. `GET /decks/:id` ganha essas contagens, que hoje só
  tinha `cardCount`.
- `GET /decks/:id/cards` ganha dois parâmetros de consulta opcionais,
  combináveis com a paginação já existente: `q` (busca por palavra) e
  `status` (filtra pelo `status` calculado do card) — a tela de detalhe
  do baralho no frontend precisa buscar/filtrar sobre o conjunto inteiro
  de cards, não só a página carregada.

## Capabilities

### Modified Capabilities

- `cards`: card ganha `suspended`, `lastGrade` e `status` na resposta
  pública; novos endpoints de suspender/reativar.
- `reviews`: a fila de revisão exclui cards suspensos; registrar uma nota
  passa a gravar `lastGrade`.
- `decks`: `dueCount` exclui cards suspensos; `matureCount` exclui cards
  difíceis; `GET /decks/:id` ganha `newCount`, `learningCount`,
  `matureCount`, `suspendedCount`.

## Impact

- `prisma/schema.prisma`: campo `suspended` e `lastGrade` (+ enum
  `ReviewGrade`) em `Card`; nova migration SQL escrita à mão (sem banco
  disponível neste sandbox para `prisma migrate dev`).
- `src/services/card.service.ts`: `PublicCard` ganha `suspended`,
  `lastGrade`, `status`; nova função pura de classificação; novas funções
  `suspendCard`/`unsuspendCard`.
- `src/services/review.service.ts`: fila exclui suspensos; grava
  `lastGrade` ao registrar nota.
- `src/services/deck.service.ts`: `dueCount` exclui suspensos;
  `matureCount` exclui difíceis; `getDeckForUser` ganha as mesmas
  contagens de `listDecksByUser`.
- `src/routes/card.routes.ts`, `src/controllers/card.controller.ts`: duas
  rotas novas.
- `src/schemas/card.schema.ts`: `listCardsQuerySchema` ganha `q` e
  `status` opcionais.
- `openspec/specs/cards/spec.md`, `openspec/specs/reviews/spec.md`,
  `openspec/specs/decks/spec.md`: deltas correspondentes.
- Frontend (`mem-words-frontend`, mudança separada): passa a consumir
  `status`, `suspended`, as novas contagens e os endpoints de suspender.
