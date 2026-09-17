## 1. Exigir senha atual na exclusão

- [x] 1.1 Em `src/schemas/user.schema.ts`, adicionar `deleteUserSchema`
      (`params.id` UUID + `body.currentPassword` obrigatório, mínimo 1
      caractere — mesma regra usada para confirmar a troca de senha).
      Removido `userIdParamSchema`, que ficou sem nenhum outro uso.
- [x] 1.2 Em `src/routes/user.routes.ts`, trocar a validação de
      `DELETE /users/:id` de `userIdParamSchema` para `deleteUserSchema`.
- [x] 1.3 Em `src/controllers/user.controller.ts`, `remove` repassa
      `req.body.currentPassword` para `userService.deleteUser`.
- [x] 1.4 Em `src/services/user.service.ts`, `deleteUser(id, currentPassword)`
      confere a senha com `verifyPassword` antes de excluir — lança
      `UnauthorizedError` se não conferir.

## 2. Verificação

- [x] 2.1 `npm run typecheck` sem erro.
- [x] 2.2 Manualmente (Postgres local, `npm run dev` + curl): excluir sem
      `currentPassword` no corpo respondeu `400`; com `currentPassword`
      incorreta respondeu `401` e o usuário continuou existindo (`GET
      /users/me` respondeu `200` com o mesmo token); com a senha correta
      respondeu `204`; uma chamada seguinte com o mesmo token a `GET
      /users/me` respondeu `404` (o token continua tecnicamente válido até
      expirar, mas o usuário que ele referencia não existe mais — mesmo
      comportamento de `findUserById` já existente antes desta mudança, não
      alterado aqui). Cascata confirmada à parte, direto no banco: criada
      uma conta com um baralho e um card, contada 1 linha em cada uma das
      tabelas `decks`/`cards`; após excluir a conta com a senha correta, as
      contagens em `users`, `decks`, `cards` e `refresh_tokens` para aquele
      usuário/baralho foram todas a `0`.

## 3. Verificação final

- [x] 3.1 `openspec validate --specs` passa para `user-management`.
