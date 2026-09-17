## Why

O mockup da tela de lista de baralhos do frontend mostra, por baralho, um
selo de quantos cards estão prontos para revisão hoje (ou "em dia", quando
nenhum está) e uma barra de progresso com a porcentagem de cards
"maduros". Hoje `GET /decks` só devolve nome e par de idiomas — nenhuma
dessas duas informações existe na listagem, e calculá-las no frontend
exigiria uma chamada extra por baralho (a fila de revisão inteira, só para
contar), o que não escala para quem tem muitos baralhos.

## What Changes

- `GET /decks` passa a incluir, por baralho, `cardCount` (total de
  cards), `dueCount` (quantos estão prontos para revisão agora — mesmo
  critério da fila de revisão) e `matureCount` (quantos já são
  "maduros").
- "Maduro" é definido como card em `review` com `intervalDays >= 21` —
  convenção emprestada do Anki (card cuja repetição já passou de três
  semanas deixa de precisar de atenção constante). Novo `MATURE_INTERVAL_DAYS`
  em `src/lib/scheduling.ts`, ao lado das demais constantes do motor de
  repetição.
- As três contagens são calculadas por consultas agregadas (uma por
  contagem, agrupadas por baralho), não por baralho individualmente —
  o custo não cresce com o número de baralhos do usuário.

## Impact

**Código afetado**

- `src/lib/scheduling.ts` — nova constante `MATURE_INTERVAL_DAYS`.
- `src/services/deck.service.ts` — `listDecksByUser` passa a agregar e
  mesclar as três contagens.

**Specs afetadas**

- `decks`: o requisito "Listagem dos próprios baralhos" passa a exigir
  `cardCount`, `dueCount` e `matureCount` em cada item da lista.

Sem mudança de schema do banco (os campos usados já existem em `Card`),
sem nova dependência. **BREAKING** apenas no sentido aditivo — nenhum campo
existente muda de forma ou nome.
