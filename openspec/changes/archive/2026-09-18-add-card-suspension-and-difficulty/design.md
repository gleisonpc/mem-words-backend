## Context

Ver `proposal.md` para motivação. Hoje:

- `CardState = 'new' | 'learning' | 'review'` (`src/lib/scheduling.ts`),
  com o comentário explícito de que `suspended` foi deixado de fora
  propositalmente.
- `Card` (schema.prisma) não tem campo de suspensão nem histórico de
  notas — só o agendamento derivado (`state`, `learningStep`,
  `easeFactor`, `intervalDays`, `dueAt`).
- `deck.service.ts` já calcula `dueCount`/`matureCount` por baralho via
  `countCardsByDeck` (um `groupBy` agregado, não uma consulta por
  baralho) — o mesmo padrão serve para as contagens novas.
- Não há banco disponível neste ambiente (sem `DATABASE_URL`), então a
  migration desta mudança é escrita à mão, seguindo o formato das já
  existentes em `prisma/migrations/`, e validada só com `prisma generate`
  + `tsc --noEmit` — sem `prisma migrate dev` nem teste de integração
  contra um banco real. A migration real só roda em CI/deploy
  (`prisma migrate deploy`), como as anteriores.
- Não há suíte de testes no repositório (`npm test` é um stub) — a
  verificação desta mudança é `tsc --noEmit` mais leitura cuidadosa do
  diff, mesmo padrão dos changes anteriores.

## Goals / Non-Goals

**Goals:**
- Suspender/reativar um card como ação manual, reversível, escolhida pelo
  usuário — sem afetar o agendamento de repetição espaçada.
- Uma classificação de status única, calculada no servidor, que o
  frontend consome sem duplicar limiar de maturidade nem prioridade entre
  estados.
- "Difícil" reaproveitando a nota `hard` que já existe, sem inventar um
  novo conceito de dificuldade.
- Contagens por status (`newCount`/`learningCount`/`matureCount`/
  `suspendedCount`) tanto na listagem quanto no detalhe de um baralho.

**Non-Goals:**
- Suspensão em lote, ou suspensão automática após N erros seguidos — fora
  de escopo; a decisão de suspender é sempre manual, card por card.
- Expor `difficultCount`/`reviewingCount` como contagens de baralho — o
  mockup do frontend só tem quatro blocos (Novos/Aprendendo/Maduros/
  Suspensos); `difficult`/`reviewing` aparecem só como `status` do card
  individual.
- Mudar o algoritmo de repetição espaçada em si
  (`computeNextSchedule`) — suspensão e `lastGrade` são metadados
  ortogonais, sobrepostos ao motor existente, que continua puro e
  inalterado.
- Desfazer suspensão automaticamente por qualquer evento (edição do card,
  nova revisão etc.) — só o próprio endpoint de reativação muda
  `suspended`.

## Decisions

### `suspended` é um campo ortogonal ao `state`, não um quarto valor do enum

Alternativa descartada: adicionar `suspended` como valor de `CardState`.
Rejeitada porque suspender teria que *substituir* o estado atual,
perdendo a informação de onde o card estava (`learning` vs. `review`, e
seu `intervalDays`/`easeFactor`) — reativar precisaria de um campo
paralelo para lembrar o estado anterior de qualquer forma. Um booleano
(`suspended`, padrão `false`) ao lado do `state` existente é mais simples:
nada mais muda ao suspender, e reativar é só zerar o booleano. É também o
modelo usado pelo Anki, de onde vêm as demais constantes do motor.

### `lastGrade` como campo simples, não uma tabela de histórico

Alternativa descartada: uma tabela `CardReview` com uma linha por nota
registrada, permitindo reconstruir todo o histórico. Rejeitada por
desproporcional ao que "difícil" precisa (só a nota mais recente) e por
introduzir uma tabela nova, uma migration mais arriscada de escrever à
mão sem banco para validar, e nenhum outro requisito pedindo histórico
completo (non-goal explícito). Um campo `lastGrade` nullable em `Card`
(`null` até a primeira revisão, sobrescrito a cada
`POST /cards/:id/reviews`) resolve exatamente o que a classificação
`difficult` precisa.

### `status` calculado a cada leitura, não persistido

`status` não é uma coluna — é derivado em `toPublicCard` a partir de
`suspended`, `state`, `lastGrade` e `intervalDays`, sempre que um card é
serializado para resposta pública. Alternativa descartada: persistir
`status` como coluna, recalculada a cada escrita. Rejeitada porque
seria dado derivado guardado (duas fontes de verdade que podem
divergir) por um cálculo barato o bastante para rodar em toda leitura —
o mesmo raciocínio já usado para `matureCount`/`dueCount`, que também são
calculados na leitura via `groupBy`, não guardados no card.

### Prioridade do `status`: suspenso sempre vence

Um card suspenso enquanto `review` e maduro (`intervalDays >= 21`) ainda
aparece como `suspended`, não `mature` — suspender é uma decisão
deliberada do usuário de tirar aquele card de vista; esconder isso atrás
de um selo "maduro" seria surpreendente. Mesma lógica para `new`/
`learning`: um card recém-criado e já suspenso (possível — nada impede
suspender antes da primeira revisão) mostra `suspended`, não `new`.

### `matureCount` redefinido para excluir `difficult`

Antes desta mudança, `matureCount` era só "`review` com `intervalDays >=
21`". Com `difficult` introduzido, um card assim classificado deixa de
contar como maduro — o objetivo de destacar "difícil" é sinalizar que
aquele card precisa de atenção, e contá-lo ao mesmo tempo como "dominado"
no bloco de maduros anularia o sinal. É uma mudança de comportamento
deliberada de um requisito já existente (`decks/spec.md`), documentada
como tal na proposta — não uma mudança de formato de resposta (o campo
continua se chamando `matureCount`, só sua definição muda).

### `dueCount` exclui suspensos, reaproveitando o critério da fila

`dueCount` já usava "mesmo critério da fila de revisão" como definição —
agora que a fila exclui suspensos, `dueCount` acompanha automaticamente
ao ser implementado com a mesma condição `NOT suspended AND (...)`, sem
duas fontes de verdade para "pronto para revisão".

### Filtro por `status` traduzido para `where` do Prisma, um valor por vez

`status` não é coluna — filtrar por ele significa traduzir cada um dos
seis valores para a combinação de colunas reais que o produz (a mesma
lógica de `deriveCardStatus`, mas como predicado Prisma em vez de função
JS sobre um card já carregado):

- `new` → `{ suspended: false, state: 'new' }`
- `learning` → `{ suspended: false, state: 'learning' }`
- `difficult` → `{ suspended: false, state: 'review', lastGrade: 'hard' }`
- `mature` → `{ suspended: false, state: 'review', lastGrade: { not: 'hard' }, intervalDays: { gte: MATURE_INTERVAL_DAYS } }`
- `reviewing` → `{ suspended: false, state: 'review', lastGrade: { not: 'hard' }, intervalDays: { lt: MATURE_INTERVAL_DAYS } }`
- `suspended` → `{ suspended: true }`

Uma função `statusWhereClause(status)` centraliza essa tradução — usada
só pelo filtro de listagem (`listCardsByDeck`), não pelas contagens de
baralho, que continuam com seus próprios `where` (tarefa 5) por já
precisarem rodar em paralelo via `groupBy`/`count` sem um card carregado
para classificar. Alternativa descartada: carregar todos os cards do
baralho e filtrar em memória com `deriveCardStatus` — descartada porque
reintroduziria exatamente o problema que a paginação do backend já existe
para evitar (baralhos grandes).

`q` é `word: { contains: q, mode: 'insensitive' }` — mesmo mecanismo que
o Postgres/Prisma já oferece, sem normalização de acento adicional (fora
de escopo; nenhum outro campo de busca do produto trata acento hoje).

### Endpoints de suspensão como ações dedicadas, não `PATCH /cards/:id`

Alternativa descartada: aceitar `suspended` como mais um campo opcional
em `PATCH /cards/:id`, ao lado de `word`/`translation`/etc. Rejeitada
porque suspender é uma ação de estado (como registrar uma revisão, que já
tem sua própria rota em vez de ir por `PATCH`), não uma edição de
conteúdo — e porque uma rota dedicada deixa a idempotência e a resposta
mais simples de descrever (sempre `200` com o card, nunca precisa do
`refine` de "ao menos um campo" que `updateCardSchema` exige). Duas rotas
simétricas, `POST /cards/:id/suspend` e `POST /cards/:id/unsuspend`,
sem corpo.

### `newCount`/`learningCount`/`suspendedCount` calculados com o mesmo
`countCardsByDeck` já existente

`listDecksByUser` já roda `countCardsByDeck` em paralelo (`Promise.all`)
para `dueCount`/`matureCount`. As três contagens novas usam a mesma
função auxiliar, com `where` diferente:
- `newCount`: `{ state: 'new' }`
- `learningCount`: `{ state: 'learning' }`
- `suspendedCount`: `{ suspended: true }`
- `matureCount` (redefinido): `{ state: 'review', intervalDays: { gte:
  MATURE_INTERVAL_DAYS }, NOT: { lastGrade: 'hard' } }`
- `dueCount` (redefinido): `{ suspended: false, OR: [{ state: 'new' },
  { dueAt: { lte: now } }] }`

Nenhuma consulta por baralho — `groupBy` continua sendo uma consulta
agregada por contagem, independente de quantos baralhos o usuário tem.

### `getDeckForUser` (detalhe) passa a fazer as mesmas agregações da
listagem

Hoje `getDeckForUser` só roda `prisma.card.count({ where: { deckId } })`.
Passa a chamar as mesmas contagens de `listDecksByUser`, mas com
`where: { deckId }` fixo em vez de `groupBy` por usuário (um único
baralho, não precisa agrupar) — `Promise.all` de seis `count`/consultas
simples, aceitável para uma tela de detalhe (uma requisição por
abertura de tela, não por item de lista).

### Migration escrita à mão, seguindo o padrão das anteriores

Sem banco disponível para `prisma migrate dev` gerar o diff, a migration
SQL é escrita seguindo o estilo das já commitadas (nome
`<timestamp>_add_card_suspension_and_difficulty`, mesmas convenções de
nome de coluna/enum via `@map`). Novo enum `review_grade` (espelhando o
`ReviewGrade` já existente só como tipo TypeScript), coluna `suspended
BOOLEAN NOT NULL DEFAULT false`, coluna `last_grade review_grade`
(nullable). Índice novo em `suspended` não é necessário agora: filtragem
por suspensão sempre acompanha outro filtro mais seletivo (`deckId`, ou
`deckId` + `state`/`dueAt`), então o índice composto existente em
`deckId` (cards) já cobre o caso comum.

## Risks / Trade-offs

- [Sem banco para validar a migration à mão] → aceito; mitigado
  escrevendo a migration no mesmo estilo das três já existentes (revisão
  cuidadosa em vez de geração automática), e validando o schema Prisma em
  si com `prisma generate` (que não precisa de conexão).
- [`matureCount` muda de definição para quem já consome `GET /decks`] →
  aceito e documentado na proposta como mudança de comportamento; o
  formato da resposta não muda (mesmo campo, mesmo tipo), só quantos
  cards um baralho com cards difíceis mostra como maduros — o frontend
  que já lê `matureCount` (`HomePage.jsx`) continua funcionando sem
  mudança de código, só com um número potencialmente menor.
- [`getDeckForUser` faz mais consultas que antes] → aceito; são `count`s
  simples e indexados (por `deckId`, com filtro adicional), e a tela de
  detalhe já faz outras chamadas (fila de revisão, lista de cards) na
  mesma carga — o custo adicional é marginal frente ao que já existe.

## Migration Plan

Reversível por `git revert` no código; a migration em si teria uma
`down` implícita (remover as duas colunas e o enum) se precisasse ser
desfeita em produção — não incluída porque o projeto não versiona
migrations `down` hoje (nenhuma das anteriores tem). Nenhum dado
existente precisa de backfill: `suspended` nasce `false` e `lastGrade`
nasce `null` para todo card já existente, o que corresponde exatamente ao
comportamento anterior (nenhum card era suspenso, nenhuma nota histórica
existia).
