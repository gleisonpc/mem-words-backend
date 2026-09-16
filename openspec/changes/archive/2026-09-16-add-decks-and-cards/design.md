## Context

Ver proposal.md para motivação. Hoje o único padrão de posse-de-recurso no
projeto é `ensureSelf` (`src/middlewares/authenticate.ts`), que compara
`req.params.id` com `req.user.id` — funciona porque o recurso *é* o usuário.
Decks e cards não têm essa propriedade: o dono de um card é o dono do
*baralho* do card, não o próprio `id` da rota. Este design escolhe como
verificar posse nesse cenário indireto.

## Goals / Non-Goals

**Goals:**
- Definir onde e como a checagem "usuário só mexe no que é dele" acontece
  para decks e, indiretamente, para cards.
- Definir o modelo de dados (`Deck`, `Card`) e a migration.
- Definir o formato de paginação de `GET /decks/:id/cards`.

**Non-Goals:**
- Qualquer coisa relacionada a agendamento de revisão (SRS): o campo
  `state` do card fica com um único valor possível (`"new"`) nesta mudança;
  a máquina de estados completa e os campos de agendamento (intervalo,
  facilidade, próxima revisão) são o próximo change.
- Importação de baralhos do Anki (`.apkg`).
- Sugestão automática de tradução/frase/sinônimos via dicionário externo.

## Decisions

### Checagem de posse: no service, não em middleware
`ensureSelf` compara diretamente um param de rota com o usuário logado.
Para decks/cards a checagem depende de uma consulta (achar o dono do
baralho do card). Em vez de um middleware genérico "carregar recurso e
comparar dono" — que exigiria uma convenção nova para descobrir dinamicamente
qual entidade carregar — a posse é verificada dentro do próprio service, no
mesmo lugar que já faz o `findUnique`/`findFirst`:
- Deck: query já filtra por `{ id, userId: req.user.id }`; não encontrar
  significa "não existe ou não é seu", e o controller decide 403 vs 404
  fazendo uma segunda checagem de existência somente quando precisa
  distinguir os dois casos (ver spec: `GET/PATCH/DELETE /decks/:id`
  distinguem 403 de 404).
- Card: a query resolve o card com o `userId` do deck pai
  (`card.deck.userId`) em um único `findFirst` com `include: { deck: true }`
  ou `where` aninhado — evita duas idas ao banco.

Alternativa descartada: middleware `ensureDeckOwner`/`ensureCardOwner`
reutilizável. Foi descartada por enquanto porque cada rota já precisa
carregar o registro para responder o corpo da requisição (não há trabalho
duplicado a evitar), e um middleware faria uma segunda consulta. Se um
terceiro recurso indireto aparecer no futuro, vale reconsiderar.

### Distinção 403 vs 404
Para não vazar a existência de recursos de outra conta, mas seguindo o
padrão HTTP mais comum do projeto (a spec de auth já opta por mensagens
genéricas em vez de esconder tudo), o comportamento escolhido é:
- Registro não existe (nenhum usuário é dono): `404`.
- Registro existe mas pertence a outro usuário: `403`.

Isso é o oposto de "esconder com 404 sempre", mas é consistente com como
`/users/:id` já se comporta hoje (403 ao mexer na conta errada) e é mais
simples de implementar sem duas queries por request.

### Modelo de dados
```prisma
model Deck {
  id             String   @id @default(uuid()) @db.Uuid
  name           String   @db.VarChar(120)
  sourceLanguage String   @map("source_language") @db.VarChar(10)
  targetLanguage String   @map("target_language") @db.VarChar(10)
  userId         String   @map("user_id") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards Card[]

  @@index([userId])
  @@map("decks")
}

enum CardState {
  new

  @@map("card_state")
}

model Card {
  id                  String    @id @default(uuid()) @db.Uuid
  word                String    @db.VarChar(200)
  translation         String    @db.VarChar(200)
  partOfSpeech        String?   @map("part_of_speech") @db.VarChar(40)
  synonyms            String[]  @default([])
  exampleSentence     String?   @map("example_sentence")
  exampleTranslation  String?   @map("example_translation")
  personalNote        String?   @map("personal_note")
  state               CardState @default(new)
  deckId              String    @map("deck_id") @db.Uuid
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  deck Deck @relation(fields: [deckId], references: [id], onDelete: Cascade)

  @@index([deckId])
  @@map("cards")
}
```
Idiomas ficam como `VARCHAR(10)` (código tipo `pt-br`, `en`) em vez de enum:
o mockup já sugere qualquer par de idiomas ("Você escolhe o idioma, não o
app"), então travar em uma lista fixa contradiria o produto.

`CardState` como enum do Postgres (não `String`) mesmo com um único valor
hoje: o próximo change (SRS) adiciona `learning`/`review`/`suspended` a
esse mesmo enum via migration, em vez de trocar o tipo da coluna depois.

### Paginação de `GET /decks/:id/cards`
Cursor simples por `createdAt` seria mais correto sob escrita concorrente,
mas o volume esperado por baralho é baixo (centenas, não milhões) e a tela
de detalhe do baralho no mockup usa paginação convencional ("Mostrando 4 de
412"). Decisão: paginação por `page`/`pageSize` (padrão `pageSize=50`,
máximo `200`), ordenada por `createdAt asc`, respondendo
`{ items, total, page, pageSize }`. Mais simples de implementar e de
consumir no frontend do que cursor, com o trade-off aceito de não ser
100% estável se cards forem inseridos no meio da paginação.

## Risks / Trade-offs

- [Enum `CardState` com um único valor hoje] → aceito conscientemente para
  evitar migrar o tipo da coluna quando o SRS chegar; custo é uma migration
  a mais no futuro para adicionar valores ao enum (`ALTER TYPE ... ADD
  VALUE`), operação leve no Postgres.
- [Checagem de posse duplicada em cada service em vez de middleware único]
  → aceito pela simplicidade atual; revisitar se um terceiro recurso
  indireto aparecer.
- [`synonyms` como `String[]` do Postgres em vez de tabela própria] →
  suficiente porque sinônimos não têm metadados próprios nem são
  consultados isoladamente; se isso mudar, migrar para tabela é trabalho
  localizado.
