## Context

Ver `proposal.md` — Why. O que já está fixado: o critério de "pronto para
revisão" (`state = 'new' OR dueAt <= now`) já existe em
`review.service.ts#getReviewQueue`, por baralho; aqui ele precisa do mesmo
resultado, mas para todos os baralhos do usuário de uma vez.

## Goals / Non-Goals

**Goals**

- `GET /decks` continua sendo uma única chamada, independente de quantos
  baralhos o usuário tem.
- O critério de "pronto para revisão" usado aqui é o mesmo já usado na
  fila de revisão — não uma segunda definição que possa divergir.

**Non-Goals**

- Não expõe a lista de cards prontos na listagem de baralhos — só a
  contagem. Ver a fila em si continua sendo `GET /decks/:id/reviews/queue`.
- Não muda `GET /decks/:id` (detalhe) — ele já expõe `cardCount` sozinho, e
  o frontend do detalhe já calcula sua própria contagem de prontos
  chamando a fila; esta mudança é só da listagem, que é o que o mockup em
  questão cobre.

## Decisions

### Três `groupBy`, não N chamadas

Uma contagem por baralho, feita com um `SELECT ... WHERE deckId = ?`
repetido para cada baralho, custaria uma consulta a mais por baralho na
lista — ok para poucos baralhos, ruim para uma conta com dezenas. Em vez
disso, três `prisma.card.groupBy({ by: ['deckId'], where: {...} })`
(cardCount, dueCount, matureCount), cada um agrupado por `deckId` e
filtrado por `deck: { userId }`, trazem a contagem de todos os baralhos do
usuário em uma consulta só — o custo por chamada a `GET /decks` fica em
"decks do usuário" + 3, não "decks do usuário" × algo.

Baralhos sem nenhum card não aparecem no resultado de um `groupBy` (não há
linha para agrupar) — o merge com a lista de baralhos preenche `0` para
qualquer baralho ausente de um dos três mapas.

### "Maduro" = `review` com `intervalDays >= 21`

Sem essa convenção já emprestada de outro lugar do sistema, "maduro"
precisaria de uma definição nova. O Anki (de onde este motor de repetição
já toma outras constantes — `LEARNING_STEPS_MINUTES`, `GRADUATING_INTERVAL_DAYS`)
usa exatamente esse corte: um card com intervalo de 21 dias ou mais é
"maduro", abaixo disso é "jovem" (`young`). Não expomos o estado
intermediário "jovem" agora — o mockup só pede a fração madura, e o
`cardCount` total já dá o resto por subtração no frontend, se algum dia
precisar.

## Risks / Trade-offs

- Quatro consultas por `GET /decks` (a lista + três `groupBy`) em vez de
  uma — aceitável porque nenhuma delas escala com o número de baralhos, e
  o endpoint já não tinha garantia de round-trip único (a listagem de
  cards de cada baralho, por exemplo, já é uma chamada à parte).

## Migration Plan

Reversível por `git revert` — campos aditivos, nenhum dado migrado.
