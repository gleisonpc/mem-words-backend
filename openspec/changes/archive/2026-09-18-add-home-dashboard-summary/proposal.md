## Why

O frontend quer trocar a tela inicial (hoje só a lista de baralhos) por um
resumo do dia — quantos cards estão prontos para revisão agora, divididos
por tipo (novos/aprendendo/revisão), e a sequência de dias seguidos em que
o usuário revisou algo. Nenhum dos dois dados existe hoje:

- `GET /decks` já devolve `newCount`/`learningCount`/`matureCount` por
  baralho (change `add-card-suspension-and-difficulty`), mas nenhum deles é
  filtrado por "pronto agora": `learningCount` conta todo card em
  `learning` independente do `dueAt`, e `matureCount` é uma métrica de
  maturidade (intervalo ≥ 21 dias), não de fila de revisão. Somar esses
  campos no cliente para montar "novos/aprendendo/revisão de hoje"
  produziria números errados.
- Sequência de dias seguidos (streak) não existe em lugar nenhum — nenhum
  campo no usuário, nenhum histórico de atividade.

## What Changes

- Novo endpoint `GET /reviews/today`: agregado, entre todos os baralhos do
  usuário autenticado, dos cards prontos para revisão agora, divididos por
  `newCount`/`learningCount`/`reviewCount` (mesmo critério de "pronto agora"
  já usado pela fila de revisão e por `dueCount`), mais o total
  (`dueCount`).
- `User` ganha `currentStreak` (exposto em `GET /users/me`): quantos dias
  seguidos, até hoje, o usuário registrou ao menos uma nota de revisão.
  Registrar uma nota (`POST /cards/:id/reviews`) atualiza a sequência:
  mesmo dia não muda nada, dia seguinte incrementa, qualquer intervalo
  maior reinicia em `1`.

## Capabilities

### Modified Capabilities

- `reviews`: ganha o agregado diário entre baralhos (`GET /reviews/today`)
  e passa a atualizar a sequência de dias do usuário a cada nota
  registrada.
- `user-management`: a consulta da própria conta passa a incluir
  `currentStreak`.

## Impact

- `prisma/schema.prisma`: `User` ganha `currentStreak` (`Int`, padrão `0`)
  e `lastActiveOn` (`Date`, opcional) — campo interno, não exposto.
- Nova migration (`prisma/migrations/`).
- Novo `src/lib/streak.ts`: função pura que decide a próxima sequência a
  partir da sequência atual, do último dia ativo e de agora.
- `src/services/user.service.ts`: `currentStreak` em `PublicUser`/
  `toPublicUser`; nova `registerReviewActivity(userId, now)`.
- `src/services/review.service.ts`: nova `getTodaySummary(userId)`;
  `recordReview` passa a chamar `registerReviewActivity`.
- `src/controllers/review.controller.ts` e `src/routes/review.routes.ts`:
  novo handler/rota `GET /reviews/today`.
- `README.md`: nova linha na tabela de endpoints autenticados.
