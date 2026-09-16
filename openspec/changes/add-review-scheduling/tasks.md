## 1. Modelo de dados

- [x] 1.1 Em `prisma/schema.prisma`: adicionar `learning` e `review` ao enum
      `CardState`; adicionar ao model `Card` os campos `learningStep`
      (`Int`, default `0`), `easeFactor` (`Float`, default `2.5`),
      `intervalDays` (`Float`, default `0`), `dueAt` (`DateTime?`, default
      `null`). Adicionado também um índice em `dueAt` (não estava no
      design.md, mas a fila de revisão filtra por ele a cada busca).
- [x] 1.2 Gerar a migration com `npm run db:migrate` — aplicou em uma única
      migration sem erro: o risco do design.md (usar um valor de enum
      recém-adicionado na mesma transação) não se materializou porque
      nada nesta migration referencia `learning`/`review` — só adiciona os
      valores e colunas não relacionadas ao enum. Verificado em banco
      limpo.
- [x] 1.3 Rodar `npx prisma generate` e verificar que
      `src/generated/prisma` expõe `learning`/`review` em `CardState` e os
      novos campos em `Card`.

## 2. Algoritmo de repetição espaçada

- [x] 2.1 Criar `src/lib/scheduling.ts` com as constantes do design.md
      (`LEARNING_STEPS_MINUTES`, `GRADUATING_INTERVAL_DAYS`,
      `EASY_INTERVAL_DAYS`, `DEFAULT_EASE`, `MIN_EASE`,
      `MAX_INTERVAL_DAYS`) e a função pura `computeNextSchedule(card,
      grade, now)`, cobrindo as transições de `new`, `learning` e `review`
      descritas no design.md — verificado com um script (`tsx`) cobrindo
      as 15 combinações de estado × nota dos cenários da spec `reviews`,
      incluindo o teto de `MAX_INTERVAL_DAYS` e o piso `MIN_EASE`: todas
      passaram.

## 3. Cards expõem o agendamento

- [x] 3.1 Em `src/services/card.service.ts`: `PublicCard` e `toPublicCard`
      passam a incluir `learningStep`, `easeFactor`, `intervalDays` e
      `dueAt` — `npm run typecheck` passa. `toPublicCard`,
      `ensureDeckOwnership` e `findCardOrThrow` exportados para reuso em
      `review.service.ts`.
- [x] 3.2 Confirmar que `createCard` continua criando com os defaults do
      schema (`state: "new"`, `dueAt: null`) sem precisar de mudança no
      service — confirmado por leitura.

## 4. Serviço de revisão

- [x] 4.1 Criar `src/schemas/review.schema.ts` com Zod: `recordReviewSchema`
      (`params.id` do card, `body.grade` restrito a
      `again`/`hard`/`good`/`easy`) e `reviewQueueParamSchema`
      (`params.id` do baralho) — confirmado que um `grade` fora do
      conjunto (`"terrible"`) responde `400`.
- [x] 4.2 Criar `src/services/review.service.ts` com `getReviewQueue(deckId,
      userId)`: reaproveita `ensureDeckOwnership` de `card.service.ts`,
      busca os cards em `new` e os em `learning`/`review` com `dueAt <=
      now`, ordena `learning` > `review` > `new`, e monta a prévia das
      quatro notas chamando `computeNextSchedule` uma vez por nota, por
      card, sem persistir — confirmado manualmente que um card recém
      colocado em `learning` (dueAt futuro) não aparece na fila, e que,
      manipulando `due_at` direto no banco para o passado, ele volta a
      aparecer, na ordem correta (`learning`, `review`, `new`).
- [x] 4.3 Em `review.service.ts`, `recordReview(cardId, userId, grade)`:
      reaproveita `findCardOrThrow`, exportado de `card.service.ts`, chama
      `computeNextSchedule` com o estado atual e persiste o resultado —
      confirmado, para as 4 transições principais (new→learning,
      learning→learning, learning→review, review→learning, review→review
      com intervalo crescente), que o card retornado bate exatamente com o
      que `computeNextSchedule` calcula.

## 5. API de revisão

- [x] 5.1 Criar `src/controllers/review.controller.ts`: `queue` (`GET
      /decks/:id/reviews/queue`) e `create` (`POST /cards/:id/reviews`),
      seguindo o padrão de `card.controller.ts`.
- [x] 5.2 Criar `src/routes/review.routes.ts` registrando as duas rotas
      atrás de `authenticate`, e registrar em `src/routes/index.ts` —
      `npm run dev` sobe sem erro.
- [x] 5.3 Testado manualmente com `curl` contra Postgres local: baralho e
      card criados, fila mostrando o card `new` com a prévia das 4 notas
      (idênticas entre si, como o design.md prevê para `new`), `good`
      levando a `learning`, fila deixando de mostrar o card com `dueAt`
      futuro, duas notas `good` seguidas graduando para `review`
      (`intervalDays: 1`), `good` em `review` crescendo o intervalo
      (`intervalDays: 2.5` = `1 × 2.5`), e `again` em `review` voltando a
      `learning` com `easeFactor` reduzido (`2.5 → 2.3`). Testado também,
      manipulando `due_at` direto no banco, que a fila reordena
      corretamente (`learning`, `review`, `new`) quando os três estados
      têm cards prontos ao mesmo tempo.
- [x] 5.4 Testado `403`/`404`: fila de baralho de outro usuário (`403`),
      nota em card de outro usuário (`403`), nota em card inexistente
      (`404`), fila de baralho inexistente (`404`).

## 6. Documentação

- [x] 6.1 Atualizado `README.md` com os novos endpoints (`GET
      /decks/:id/reviews/queue`, `POST /cards/:id/reviews`) e uma nova
      seção "Revisão espaçada" resumindo o algoritmo, seguindo o estilo
      das seções existentes.

## 7. Verificação final

- [x] 7.1 `npm run typecheck` passa sem erros.
- [x] 7.2 `openspec validate --specs` passa para `reviews` e `cards`.
