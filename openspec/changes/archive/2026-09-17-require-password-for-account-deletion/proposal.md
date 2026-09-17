## Why

O frontend vai ganhar um botão "Excluir conta" na tela de perfil. Hoje,
`DELETE /users/:id` só exige `ensureSelf` (o token de acesso pertencer à
própria conta) — nenhuma senha é conferida. Isso é inconsistente com a troca
de senha, que já exige `currentPassword` exatamente para que um token de
acesso obtido indevidamente (XSS, extensão maliciosa, token de vida curta
vazado) não baste para tomar uma ação irreversível na conta.

Excluir a conta é estritamente mais grave que trocar a senha: apaga o
usuário e, em cascata, todos os seus baralhos e cards, sem chance de
desfazer. Não faz sentido a ação mais destrutiva ter menos fricção que a
menos destrutiva.

## What Changes

- `DELETE /users/:id` passa a exigir `currentPassword` no corpo da
  requisição, conferida contra o hash da senha antes de excluir — mesmo
  padrão já aplicado à troca de senha em `updateUser`.
- Senha atual ausente responde `400`; senha atual incorreta responde `401`
  e a conta permanece intacta.
- **BREAKING**: um cliente que hoje chama `DELETE /users/:id` sem corpo
  passa a receber `400`. O único cliente é o frontend deste mesmo projeto,
  atualizado na mesma leva de mudanças.

## Impact

**Código afetado**

- `src/schemas/user.schema.ts` — novo `deleteUserSchema` (params + body com
  `currentPassword` obrigatório).
- `src/routes/user.routes.ts` — `DELETE /users/:id` passa a validar com
  `deleteUserSchema` em vez de `userIdParamSchema`.
- `src/controllers/user.controller.ts` — `remove` repassa
  `req.body.currentPassword` ao serviço.
- `src/services/user.service.ts` — `deleteUser` recebe `currentPassword`,
  confere com `verifyPassword` antes de excluir.

**Specs afetadas**

- `user-management`: o requisito "Exclusão restrita à própria conta" passa
  a exigir confirmação por senha atual, com dois novos cenários (senha
  ausente, senha incorreta).

Sem mudança de schema do banco, sem nova dependência.
