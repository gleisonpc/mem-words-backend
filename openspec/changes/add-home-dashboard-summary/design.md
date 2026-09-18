## Context

Ver `proposal.md`. O frontend está desenhando uma tela inicial em formato
de painel (saudação, sequência de dias, resumo "revisão de hoje" com
início rápido de revisão e adição de palavra, lista dos baralhos). Este
change cobre só os dois dados que faltam no backend; a tela em si é um
change separado no `mem-words-frontend`.

`GET /decks` já resolve, por baralho, `dueCount` com o critério "pronto
agora" (`statCriteria` em `deck.service.ts`): `new`, ou
`learning`/`review` com `dueAt` vencido, sempre excluindo suspensos. O
agregado diário deste change usa exatamente o mesmo critério, só que
somado entre todos os baralhos do usuário em vez de agrupado por baralho,
e dividido em `new`/`learning`/`review` em vez de um único número.

## Goals / Non-Goals

**Goals:**
- Um único endpoint que devolve o "pronto agora" da conta inteira, já
  dividido por tipo, sem o frontend precisar buscar e somar `GET /decks`.
- Sequência de dias seguidos, calculada e persistida no servidor — o
  cliente não guarda nem calcula nada sobre isso.

**Non-Goals:**
- Fila de revisão entre baralhos (um único fluxo de revisão que atravessa
  vários baralhos). `GET /reviews/today` só informa quantos e de que tipo
  estão prontos; iniciar uma revisão continua sendo por baralho
  (`GET /decks/:id/reviews/queue`), o frontend decide para qual baralho
  mandar o usuário.
- Histórico de revisões ou de streak (maior sequência já alcançada, dias
  específicos revisados). Só o contador corrente, mesmo espírito de
  "nenhum histórico persistido" já registrado no README para as revisões
  em si.
- Fuso horário por usuário. "Dia" é o dia calendário em UTC, a mesma
  referência de tempo que todo o resto do backend já usa (`new Date()`
  direto, sem conversão de fuso em nenhum outro endpoint).

## Decisions

### `GET /reviews/today` soma direto no banco, sem passar por `GET /decks`

`getTodaySummary(userId)` roda três `prisma.card.count` (um por
`new`/`learning`/`review`, cada um com `deck: { userId }` no `where`) em
paralelo, e soma os três para `dueCount` — mesmo padrão de
`Promise.all` já usado em `listDecksByUser`/`getDeckForUser`, só que sem
`groupBy` por baralho, porque aqui o resultado é um total só, não um por
baralho.

Alternativa descartada: buscar `listDecksByUser` e somar `dueCount` no
controller. Rejeitada porque `dueCount` de cada baralho já mistura
`new`/`learning`/`review` num único número — não dá pra separar por tipo
sem os três `count` de qualquer forma, e rodar os dois caminhos (soma de
`dueCount` E os três `count` novos) seria trabalho duplicado.

### Sequência de dias como dois campos simples no próprio `User`

`currentStreak` (`Int`) e `lastActiveOn` (`Date`, sem hora — `@db.Date`).
Alternativa descartada: uma tabela `ReviewActivity`/`DailyActivity` com uma
linha por dia ativo. Rejeitada por ser mais dado persistido (e mais
migração) do que a contagem exige — a sequência corrente não precisa do
histórico completo de quais dias, só de "quando foi o último dia" e
"quantos dias seguidos até ele".

`nextStreak(currentStreak, lastActiveOn, now)`, pura, em `src/lib/streak.ts`
(mesmo espírito de `computeNextSchedule` em `scheduling.ts` — não lê nem
grava nada, só decide o próximo valor a partir do estado atual):

- `lastActiveOn` nulo (nunca revisou) → sequência `1`.
- Mesmo dia calendário (UTC) que `lastActiveOn` → sequência inalterada
  (já contada hoje; registrar uma segunda nota no mesmo dia não conta
  duas vezes).
- Exatamente um dia depois → sequência atual `+ 1`.
- Qualquer intervalo maior (ou `now` antes de `lastActiveOn`, por
  segurança contra desvio de relógio) → reinicia em `1`.

`registerReviewActivity(userId, now)`, em `user.service.ts` (mesma casa de
`toPublicUser`/`PublicUser`, que também ganha o campo), lê o usuário,
aplica `nextStreak` e grava `currentStreak`/`lastActiveOn` de volta — uma
leitura e uma escrita por nota registrada, chamada a partir de
`review.service.recordReview` depois de persistir o card. Uma nota
registrada sempre atualiza a sequência, mesmo em `again` (o usuário
revisou, o resultado da nota não importa para "esteve ativo hoje").

### Dia calendário como string `YYYY-MM-DD` de `toISOString()`

Comparar dias via `date.toISOString().slice(0, 10)` (UTC) evita reimplementar
aritmética de fuso horário — mesma abordagem "sem biblioteca de datas" já
declarada no design do frontend para `formatDueIn`/`formatNextReview`, e
consistente com o resto do backend, que já trata todo `Date` como UTC
implícito (`dueAt`, `createdAt`, etc. — nenhum outro ponto do sistema
converte fuso).

## Risks / Trade-offs

- [Sequência em UTC, não no fuso do usuário] → aceito; o produto não tem
  conceito de fuso por usuário em nenhum outro lugar (relatórios de
  `dueAt`, por exemplo, já são todos UTC). Um usuário perto da virada do
  dia pode ver a sequência avançar ou reiniciar num horário local
  inesperado; ajustável depois se importar, sem mudar o formato
  armazenado (`currentStreak`/`lastActiveOn` continuam válidos, só a
  fronteira do dia mudaria).
- [`registerReviewActivity` é uma escrita extra por nota] → aceito; mesmo
  custo de uma consulta simples por `id` já pago em toda nota
  (`findCardOrThrow`), sem índice novo necessário (`User.id` já é chave
  primária).

## Migration Plan

Reversível por `git revert` mais uma migration de reversão (`DROP COLUMN`)
se o campo precisar sair depois — nenhum dado de conta existente depende
dele, `currentStreak` nasce em `0` para todo mundo.
