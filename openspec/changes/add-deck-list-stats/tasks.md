## 1. Constante de maturidade

- [x] 1.1 Em `src/lib/scheduling.ts`, adicionar `MATURE_INTERVAL_DAYS = 21`,
      com comentário citando a convenção do Anki, ao lado das demais
      constantes do motor.

## 2. Agregação na listagem

- [x] 2.1 Em `src/services/deck.service.ts`, `listDecksByUser` passa a
      rodar três `prisma.card.groupBy({ by: ['deckId'], where: {...},
      _count: true })` (total, prontos para revisão, maduros), todos
      filtrados por `deck: { userId }`, e mesclar os totais na lista de
      baralhos — baralho ausente de um dos três mapas entra com `0`.
- [x] 2.2 Estender `PublicDeck` (ou introduzir um tipo específico da
      listagem) com `cardCount`, `dueCount` e `matureCount`. Criado
      `PublicDeckWithStats`.

## 3. Verificação

- [x] 3.1 `npm run typecheck` sem erro.
- [x] 3.2 Manualmente (Postgres local, curl): baralho sem cards responde
      `cardCount`/`dueCount`/`matureCount` todos `0`; baralho com um card
      recém-criado (estado `new`) responde `cardCount: 1, dueCount: 1,
      matureCount: 0`; um card levado a `intervalDays >= 21` por notas
      `easy` sucessivas (new→learning→review 4 dias→13 dias→44.785 dias)
      passa a contar em `matureCount` exatamente quando cruza os 21 dias
      (`matureCount: 0` em 13 dias, `matureCount: 1` em 44.785 dias) — e
      nesse ponto `dueCount` cai a `0`, porque o card recém-agendado não
      está mais pronto para revisão agora.
      Nota de processo: a primeira rodada de verificação usou um servidor
      de desenvolvimento remanescente de uma tarefa anterior, ainda com o
      código antigo em memória (o `pkill` por `tsx watch` não alcança o
      processo filho que o `tsx watch` gera) — os números batidos abaixo
      são da segunda rodada, contra um processo reiniciado do zero.

## 4. Verificação final

- [x] 4.1 `openspec validate --specs` passa para `decks`.
