## 1. Constante de maturidade

- [ ] 1.1 Em `src/lib/scheduling.ts`, adicionar `MATURE_INTERVAL_DAYS = 21`,
      com comentário citando a convenção do Anki, ao lado das demais
      constantes do motor.

## 2. Agregação na listagem

- [ ] 2.1 Em `src/services/deck.service.ts`, `listDecksByUser` passa a
      rodar três `prisma.card.groupBy({ by: ['deckId'], where: {...},
      _count: true })` (total, prontos para revisão, maduros), todos
      filtrados por `deck: { userId }`, e mesclar os totais na lista de
      baralhos — baralho ausente de um dos três mapas entra com `0`.
- [ ] 2.2 Estender `PublicDeck` (ou introduzir um tipo específico da
      listagem) com `cardCount`, `dueCount` e `matureCount`.

## 3. Verificação

- [ ] 3.1 `npm run typecheck` sem erro.
- [ ] 3.2 Manualmente (Postgres local): baralho sem cards aparece com as
      três contagens em `0`; baralho com cards em `new`/`learning`/`review`
      variados mostra `dueCount` batendo com o tamanho da fila de revisão
      daquele baralho (`GET /decks/:id/reviews/queue`); um card levado a
      `intervalDays >= 21` (repetidas notas `easy`/`good` até passar do
      teto) passa a contar em `matureCount`, e um card com intervalo menor
      não conta.

## 4. Verificação final

- [ ] 4.1 `openspec validate --specs` passa para `decks`.
