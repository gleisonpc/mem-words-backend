## 1. Modelo de dados

- [ ] 1.1 Em `prisma/schema.prisma`: adicionar `learning` e `review` ao enum
      `CardState`; adicionar ao model `Card` os campos `learningStep`
      (`Int`, default `0`), `easeFactor` (`Float`, default `2.5`),
      `intervalDays` (`Float`, default `0`), `dueAt` (`DateTime?`, default
      `null`).
- [ ] 1.2 Gerar a migration com `npm run db:migrate` — se o Prisma gerar os
      dois passos (novo valor de enum + novas colunas/uso) numa única
      migration que falhe ao aplicar (Postgres não permite usar um valor de
      enum recém-adicionado na mesma transação), dividir em duas migrations
      sequenciais conforme o risco já registrado no design.md. Verificar
      que a migration aplica sem erro em um banco limpo.
- [ ] 1.3 Rodar `npx prisma generate` e verificar que
      `src/generated/prisma` expõe `learning`/`review` em `CardState` e os
      novos campos em `Card`.

## 2. Algoritmo de repetição espaçada

- [ ] 2.1 Criar `src/lib/scheduling.ts` com as constantes do design.md
      (`LEARNING_STEPS_MINUTES`, `GRADUATING_INTERVAL_DAYS`,
      `EASY_INTERVAL_DAYS`, `DEFAULT_EASE`, `MIN_EASE`,
      `MAX_INTERVAL_DAYS`) e a função pura `computeNextSchedule(card,
      grade, now)`, cobrindo as transições de `new`, `learning` e `review`
      descritas no design.md — verificar com chamadas diretas da função
      (script ou REPL) para cada combinação de estado × nota descrita nos
      cenários da spec `reviews`, incluindo o teto de `MAX_INTERVAL_DAYS` e
      o piso `MIN_EASE`.

## 3. Cards expõem o agendamento

- [ ] 3.1 Em `src/services/card.service.ts`: `PublicCard` e `toPublicCard`
      passam a incluir `learningStep`, `easeFactor`, `intervalDays` e
      `dueAt` — verificar com `npm run typecheck`.
- [ ] 3.2 Confirmar que `createCard` continua criando com os defaults do
      schema (`state: "new"`, `dueAt: null`) sem precisar de mudança no
      service — verificar por leitura.

## 4. Serviço de revisão

- [ ] 4.1 Criar `src/schemas/review.schema.ts` com Zod: `recordReviewSchema`
      (`params.id` do card, `body.grade` restrito a
      `again`/`hard`/`good`/`easy`) e `reviewQueueParamSchema`
      (`params.id` do baralho) — verificar que um `grade` fora do
      conjunto responde `400`.
- [ ] 4.2 Criar `src/services/review.service.ts` com `getReviewQueue(deckId,
      userId)`: reaproveita a checagem de posse do baralho já usada em
      `card.service.ts`, busca os cards em `new` e os em
      `learning`/`review` com `dueAt <= now`, ordena `learning` >
      `review` > `new`, e monta a prévia das quatro notas chamando
      `computeNextSchedule` uma vez por nota, por card, sem persistir —
      verificar manualmente que um card com `dueAt` futuro não aparece.
- [ ] 4.3 Em `review.service.ts`, `recordReview(cardId, userId, grade)`:
      reaproveita a resolução de posse por dono do baralho já usada em
      `findCardOrThrow` de `card.service.ts` (exportar ou duplicar a
      consulta mínima, conforme ficar mais simples), chama
      `computeNextSchedule` com o estado atual e persiste o resultado —
      verificar que o card retornado reflete exatamente o que
      `computeNextSchedule` calculou.

## 5. API de revisão

- [ ] 5.1 Criar `src/controllers/review.controller.ts`: `queue` (`GET
      /decks/:id/reviews/queue`) e `create` (`POST /cards/:id/reviews`),
      seguindo o padrão de `card.controller.ts`.
- [ ] 5.2 Criar `src/routes/review.routes.ts` registrando as duas rotas
      atrás de `authenticate`, e registrar em `src/routes/index.ts` —
      verificar `npm run dev` sobe sem erro.
- [ ] 5.3 Testar manualmente com `curl`: criar um baralho e um card, buscar
      a fila (card `new` aparece, com a prévia das 4 notas), registrar
      `good` (card vai a `learning`), buscar a fila de novo (card some se
      `dueAt` ainda não passou), registrar notas até graduar para
      `review`, registrar `again` em `review` (volta a `learning`,
      `easeFactor` reduzido) — confirmar cada transição do design.md pelo
      menos uma vez.
- [ ] 5.4 Testar `403`/`404`: fila de baralho de outro usuário, nota em
      card de outro usuário, nota em card inexistente.

## 6. Documentação

- [ ] 6.1 Atualizar `README.md` com os novos endpoints (`GET
      /decks/:id/reviews/queue`, `POST /cards/:id/reviews`) e os novos
      campos do card, seguindo o estilo das seções existentes.

## 7. Verificação final

- [ ] 7.1 `npm run typecheck` passa sem erros.
- [ ] 7.2 `openspec validate --specs` passa para `reviews` e `cards`.
