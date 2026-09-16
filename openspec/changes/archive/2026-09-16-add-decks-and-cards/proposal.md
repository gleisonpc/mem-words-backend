## Why

Hoje o backend só cadastra e autentica usuários — não existe onde guardar as
palavras que o app deveria ajudar a memorizar. O mockup do frontend
("Mem Words Web") já assume baralhos e cards como a base de todas as outras
telas (revisão, estatísticas, configurações). Sem essa fundação, nenhuma
dessas funcionalidades tem onde persistir dados.

## What Changes

- Novo modelo `Deck` (baralho): nome, par de idiomas (origem → destino),
  pertence a um usuário (`onDelete: Cascade`).
- Novo modelo `Card` (palavra): palavra, tradução, classe gramatical
  (opcional), sinônimos (lista), frase de exemplo + tradução da frase
  (opcionais), anotação pessoal (opcional), pertence a um deck
  (`onDelete: Cascade`). Inclui uma coluna `state` fixada em `"new"` na
  criação — o valor real e as demais colunas de agendamento chegam no change
  de revisão espaçada (SRS), que vem em seguida; aqui só reservamos o campo
  para não migrar de novo.
- Endpoints REST autenticados, seguindo o padrão de `routes -> middlewares
  (validate/authenticate) -> controllers -> services -> prisma`:
  - `GET /decks` — lista os baralhos do usuário autenticado.
  - `POST /decks` — cria um baralho.
  - `GET /decks/:id` — detalhe de um baralho (inclui contagem de cards).
  - `PATCH /decks/:id` — edita nome/idiomas.
  - `DELETE /decks/:id` — exclui o baralho e seus cards em cascata.
  - `GET /decks/:id/cards` — lista os cards do baralho (paginação simples).
  - `POST /decks/:id/cards` — cria um card no baralho.
  - `GET /cards/:id` — detalhe de um card.
  - `PATCH /cards/:id` — edita um card.
  - `DELETE /cards/:id` — exclui um card.
- Autorização: um usuário só acessa/edita/exclui os próprios decks e os
  cards dos próprios decks — mesmo padrão de "só a própria conta" (403) já
  usado em `/users/:id`, adaptado para dono-do-recurso.

## Capabilities

### New Capabilities
- `decks`: CRUD de baralhos pertencentes a um usuário.
- `cards`: CRUD de cards (palavras) pertencentes a um baralho.

### Modified Capabilities

(nenhuma — capacidades existentes não mudam de comportamento)

## Impact

- `prisma/schema.prisma`: novos modelos `Deck` e `Card`; nova migration.
- `src/routes/`: `deck.routes.ts`, `card.routes.ts` (registrados em
  `routes/index.ts`).
- `src/controllers/`: `deck.controller.ts`, `card.controller.ts`.
- `src/services/`: `deck.service.ts`, `card.service.ts`.
- `src/schemas/`: `deck.schema.ts`, `card.schema.ts` (Zod).
- `src/middlewares/`: reuso de `authenticate`; nova checagem de posse
  (dono do deck/card) — ver design.md para decidir entre middleware
  dedicado ou verificação no service.
- Nenhuma dependência nova.
