## 1. Schema e migration

- [x] 1.1 Em `prisma/schema.prisma`, adicionar `currentStreak Int @default(0) @map("current_streak")` e `lastActiveOn DateTime? @map("last_active_on") @db.Date` ao model `User`
- [x] 1.2 Escrever a migration à mão em `prisma/migrations/<timestamp>_add_user_streak/migration.sql` (`ALTER TABLE "users" ADD COLUMN ...`), seguindo o formato das migrations existentes — sem banco disponível neste ambiente para `prisma migrate dev`
- [x] 1.3 Rodar `npm run typecheck` (roda `prisma generate` sem precisar de banco) e confirmar que o client gerado reflete os campos novos

## 2. Sequência de dias (streak)

- [x] 2.1 Criar `src/lib/streak.ts` com `nextStreak(currentStreak, lastActiveOn, now)`, pura, implementando as regras do design.md (mesmo dia/dia seguinte/intervalo maior/nulo)
- [x] 2.2 Em `src/services/user.service.ts`, adicionar `currentStreak` a `PublicUser`/`toPublicUser`, e `registerReviewActivity(userId, now)` que lê o usuário, aplica `nextStreak` e grava `currentStreak`/`lastActiveOn`

## 3. Resumo diário entre baralhos

- [x] 3.1 Em `src/services/review.service.ts`, adicionar `getTodaySummary(userId)`: três `prisma.card.count` em paralelo (`new`/`learning` com `dueAt` vencido/`review` com `dueAt` vencido, sempre `suspended: false` e `deck: { userId }`), somando `dueCount`
- [x] 3.2 Em `recordReview`, chamar `registerReviewActivity(userId, new Date())` depois de persistir o card

## 4. Rota

- [x] 4.1 Em `src/controllers/review.controller.ts`, adicionar o handler `today` chamando `reviewService.getTodaySummary` e respondendo `200` com `{ today }`
- [x] 4.2 Em `src/routes/review.routes.ts`, montar `authenticate` em `/reviews` e adicionar `GET /reviews/today`

## 5. Verificação final

- [x] 5.1 Rodar `npm run typecheck` no repositório inteiro e confirmar que passa sem erros
- [x] 5.2 Reler os deltas de `openspec/changes/add-home-dashboard-summary/specs/**/*.md` contra o código final e confirmar que cada cenário tem código correspondente (não há suíte de testes automatizada neste repositório)
- [x] 5.3 Atualizar a tabela de endpoints autenticados do `README.md` com `GET /reviews/today`
