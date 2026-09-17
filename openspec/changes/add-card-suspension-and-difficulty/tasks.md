## 1. Schema e migration

- [x] 1.1 Adicionar `enum ReviewGrade { again hard good easy }` (`@@map("review_grade")`) e os campos `suspended Boolean @default(false)` e `lastGrade ReviewGrade? @map("last_grade")` em `Card`, no `prisma/schema.prisma`
- [x] 1.2 Escrever à mão a migration SQL em `prisma/migrations/<timestamp>_add_card_suspension_and_difficulty/migration.sql`, seguindo o estilo das migrations existentes (criar o enum, adicionar as duas colunas) e verificar que `npx prisma generate` roda sem erro
- [x] 1.3 Rodar `npm run typecheck` (`prisma generate` + `tsc --noEmit`) e verificar que passa sem erros

## 2. Motor de classificação e serviço de cards

- [x] 2.1 Em `src/lib/scheduling.ts` (ou novo módulo), adicionar `MATURE_INTERVAL_DAYS` como export reaproveitável (já existe — confirmar que é importável de fora) e escrever uma função pura `deriveCardStatus({ suspended, state, lastGrade, intervalDays })` que devolve `'suspended' | 'new' | 'learning' | 'difficult' | 'mature' | 'reviewing'` na ordem de prioridade do spec de `cards`
- [x] 2.2 Atualizar `PublicCard` e `toPublicCard` em `src/services/card.service.ts` para incluir `suspended`, `lastGrade` e `status` (via `deriveCardStatus`)
- [x] 2.3 Adicionar `suspendCard(id, userId)` e `unsuspendCard(id, userId)` em `card.service.ts`, reaproveitando `findCardOrThrow` para checar posse, idempotentes (não lança erro se já está no estado pedido)
- [x] 2.4 Verificar manualmente (leitura do código) que suspender/reativar não toca em `state`/`learningStep`/`easeFactor`/`intervalDays`/`dueAt`

## 3. Busca e filtro na listagem de cards

- [x] 3.1 Adicionar `q` e `status` opcionais a `listCardsQuerySchema` (`src/schemas/card.schema.ts`), com `status` restrito ao enum de valores válidos (`new`/`learning`/`difficult`/`mature`/`reviewing`/`suspended`)
- [x] 3.2 Escrever `statusWhereClause(status)` (local a `card.service.ts` ou módulo próprio) que traduz cada valor de `status` na combinação `where` do Prisma descrita no design.md
- [x] 3.3 Atualizar `listCardsByDeck` para aceitar `q`/`status`, combinar com `word: { contains: q, mode: 'insensitive' }` quando `q` for informado, e verificar que `total` reflete o resultado filtrado
- [x] 3.4 Atualizar o controller (`cardController.list`) para repassar `q`/`status` da query string ao serviço

## 4. Rotas de suspensão

- [x] 4.1 Adicionar `POST /cards/:id/suspend` e `POST /cards/:id/unsuspend` em `src/routes/card.routes.ts`, reaproveitando `cardIdParamSchema` e o middleware `authenticate` já aplicado a `/cards`
- [x] 4.2 Adicionar os handlers correspondentes em `src/controllers/card.controller.ts`, chamando os serviços da tarefa 2.3 e respondendo `200` com `{ card }`
- [x] 4.3 Verificar com `npm run typecheck` que as rotas novas compilam e seguem o padrão das existentes (try/next(error))

## 5. Fila de revisão e registro de nota

- [x] 5.1 Em `src/services/review.service.ts`, adicionar `suspended: false` ao filtro `where` de `getReviewQueue`, excluindo cards suspensos da fila
- [x] 5.2 Em `recordReview`, incluir `lastGrade: grade` no `data` do `prisma.card.update`, e verificar que `toPublicCard` (chamado no retorno) reflete o `status` correto após a nota (por exemplo, `hard` em `review` produz `status: "difficult"`)

## 6. Contagens de baralho

- [x] 6.1 Em `src/services/deck.service.ts`, redefinir o `where` de `dueCounts` em `listDecksByUser` para excluir suspensos (`suspended: false` combinado ao `OR` existente), e o de `matureCounts` para excluir `lastGrade: 'hard'`
- [x] 6.2 Adicionar `newCounts`, `learningCounts` e `suspendedCounts` a `listDecksByUser`, calculados com `countCardsByDeck` (mesmo padrão de `Promise.all`), e incluir `newCount`/`learningCount`/`suspendedCount` no retorno de cada baralho
- [x] 6.3 Atualizar `PublicDeckWithStats` (ou o tipo equivalente) para incluir os três campos novos
- [x] 6.4 Reescrever `getDeckForUser` para calcular as mesmas seis contagens (`cardCount`, `dueCount`, `newCount`, `learningCount`, `matureCount`, `suspendedCount`) com `where: { deckId }` fixo, substituindo o único `prisma.card.count` atual
- [x] 6.5 Verificar com `npm run typecheck` que os tipos batem entre `listDecksByUser` e `getDeckForUser` (mesma forma de retorno)

## 7. Verificação final

- [x] 7.1 Rodar `npm run typecheck` no repositório inteiro e confirmar que passa sem erros
- [x] 7.2 Reler os deltas de `openspec/changes/add-card-suspension-and-difficulty/specs/**/*.md` contra o código final e confirmar que cada cenário tem código correspondente (não há suíte de testes automatizada neste repositório para validar em CI)
- [x] 7.3 Atualizar o comentário em `prisma/schema.prisma` que hoje diz "Sem `suspended`" (no enum `CardState`) para refletir que a suspensão existe agora como campo separado
