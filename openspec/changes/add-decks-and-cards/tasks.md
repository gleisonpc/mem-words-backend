## 1. Modelo de dados

- [x] 1.1 Adicionar os modelos `Deck`, `Card` e o enum `CardState` ao
      `prisma/schema.prisma` conforme design.md, e gerar a migration com
      `npm run db:migrate` — verificar que a migration é criada em
      `prisma/migrations/` e aplica sem erro
- [x] 1.2 Rodar `npx prisma generate` (ou `npm run build`) e verificar que
      `src/generated/prisma` expõe os tipos `Deck`, `Card` e `CardState`

## 2. Erros e schemas de validação

- [x] 2.1 Adicionar `ForbiddenError`/reutilizar `AppError` existente para o
      403 de posse, se ainda não houver uma subclasse adequada — verificar
      com `npm run typecheck`. Já existia em `src/errors/AppError.ts`.
- [x] 2.2 Criar `src/schemas/deck.schema.ts` com Zod: `createDeckSchema`
      (`name`, `sourceLanguage`, `targetLanguage`), `updateDeckSchema`
      (campos opcionais) e `deckIdParamSchema` — verificar com um teste
      manual de payload inválido retornando 400 com `details`
- [x] 2.3 Criar `src/schemas/card.schema.ts` com Zod: `createCardSchema`
      (`word`, `translation` obrigatórios; `partOfSpeech`, `synonyms`,
      `exampleSentence`, `exampleTranslation`, `personalNote` opcionais),
      `updateCardSchema` (todos opcionais), `cardIdParamSchema` e
      `listCardsQuerySchema` (`page`, `pageSize`) — mesma verificação de 400.
      Encontrado e corrigido um bug no middleware `validate` compartilhado:
      `req.query` no Express 5 é um getter que reparseia a query string a
      cada leitura (não guarda valor), então `Object.assign` nele — o mesmo
      truque já usado para `req.params` — mutava um objeto descartado na
      hora, e os valores coeridos (`page`/`pageSize` de string para number)
      nunca chegavam ao controller. Corrigido substituindo a própria
      propriedade com `Object.defineProperty`.

## 3. Serviço e API de decks

- [x] 3.1 Criar `src/services/deck.service.ts` com `listDecksByUser`,
      `createDeck`, `findDeckForUser` (retorna `null` se não existe, lança
      403 se existe mas não é do usuário — ver design.md), `updateDeck`,
      `deleteDeck` — verificar com chamadas diretas do service em um script
      ou teste manual. Implementado como `findDeckOrThrow` (privado), que já
      distingue 404 de 403 numa única consulta por id — mais simples que a
      alternativa de duas consultas descrita no design.md, com o mesmo
      resultado observável.
- [x] 3.2 Criar `src/controllers/deck.controller.ts` (`list`, `create`,
      `getById`, `update`, `remove`) seguindo o padrão de
      `user.controller.ts`
- [x] 3.3 Criar `src/routes/deck.routes.ts` registrando
      `GET/POST /decks`, `GET/PATCH/DELETE /decks/:id`, todas atrás de
      `authenticate`, e registrar em `src/routes/index.ts` — verificar
      `npm run dev` sobe sem erro e as rotas aparecem no roteador
- [x] 3.4 Testado manualmente com `curl`: dois usuários, um deck cada,
      `GET /decks/:id` do deck do outro usuário responde `403`, e um `id`
      inexistente responde `404`.

## 4. Serviço e API de cards

- [x] 4.1 Criar `src/services/card.service.ts` com `listCardsByDeck`
      (paginado), `createCard` (fixando `state: "new"`),
      `findCardForUser` (verifica posse via `card.deck.userId`,
      403/404 conforme design.md), `updateCard`, `deleteCard`. Implementado
      como `findCardOrThrow` (privado), resolvendo o card com `include:
      { deck: true }` numa única consulta.
- [x] 4.2 Criar `src/controllers/card.controller.ts` (`list`, `create`,
      `getById`, `update`, `remove`)
- [x] 4.3 Criar `src/routes/card.routes.ts` registrando
      `GET/POST /decks/:id/cards`, `GET/PATCH/DELETE /cards/:id`, atrás de
      `authenticate`, e registrar em `src/routes/index.ts`
- [x] 4.4 Testado manualmente com `curl`: card criado em um deck, listagem
      paginada (`page`, `pageSize`, e o default sem parâmetros), card de um
      baralho de outro usuário respondendo `403` em `GET/PATCH/DELETE
      /cards/:id`, e exclusão do deck removendo o card em cascata
      (`GET /cards/:id` do card excluído responde `404` depois).

## 5. Documentação

- [x] 5.1 Atualizado `README.md` com a nova seção de endpoints (`/decks`,
      `/decks/:id/cards`, `/cards/:id`) e o formato de erro 403 vs 404,
      seguindo o estilo das seções existentes.

## 6. Verificação final

- [x] 6.1 `npm run typecheck` passa sem erros.
- [x] 6.2 `openspec validate --specs` passa para `decks` e `cards`.
