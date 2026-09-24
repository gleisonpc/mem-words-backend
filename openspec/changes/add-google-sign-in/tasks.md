## 1. Dependência e configuração

- [ ] 1.1 Adicionar `google-auth-library` a `package.json` e verificar que `npm install` conclui sem erro
- [ ] 1.2 Adicionar `googleClientId` (obrigatório, via `required('GOOGLE_CLIENT_ID')`) a `src/config/env.ts`, e verificar que o boot falha com mensagem clara quando a variável está ausente
- [ ] 1.3 Documentar `GOOGLE_CLIENT_ID` em `.env.example`

## 2. Schema e migration

- [ ] 2.1 Em `prisma/schema.prisma`, tornar `User.passwordHash` opcional (`String?`) e adicionar `User.googleId String? @unique @map("google_id")`
- [ ] 2.2 Gerar a migration (`npm run db:migrate`) e verificar que ela aplica limpo sobre o banco de desenvolvimento, sem perda de dado nas linhas existentes
- [ ] 2.3 Rodar `prisma generate` e verificar que `src/generated/prisma` reflete os dois campos novos

## 3. Verificação do ID token e resolução de conta

- [ ] 3.1 Criar `src/lib/googleIdToken.ts` (ou local equivalente) que verifica um ID token com `google-auth-library` contra `env.googleClientId` e devolve `{ sub, email, emailVerified, name }`, lançando `UnauthorizedError` para token inválido, expirado, de audiência errada ou sem verificar assinatura/emissor
- [ ] 3.2 Em `src/services/auth.service.ts`, adicionar `loginWithGoogle(idToken: string)`: verifica o token, recusa e-mail não verificado (`UnauthorizedError`), resolve a conta por `googleId` → por `email` (vinculando `googleId`) → cria conta nova sem senha, e finaliza chamando `issueTokens` — igual a `login()`
- [ ] 3.3 Escrever teste (ou verificação manual documentada, se não houver suíte de testes automatizados no projeto) cobrindo os três caminhos de resolução de conta e o caso de token inválido

## 4. Rota HTTP

- [ ] 4.1 Adicionar `googleLoginSchema` (`{ body: { idToken: string } }`) a `src/schemas/user.schema.ts`, com o tipo `GoogleLoginInput` exportado
- [ ] 4.2 Adicionar `googleLogin` a `src/controllers/auth.controller.ts`, espelhando `login`: chama `authService.loginWithGoogle`, grava o cookie de refresh com `setRefreshTokenCookie`, responde `200` com o mesmo formato de corpo de `login`
- [ ] 4.3 Registrar `POST /auth/google` em `src/routes/auth.routes.ts`, validado por `googleLoginSchema`
- [ ] 4.4 Verificar manualmente (curl ou equivalente) os cenários do spec `user-auth`: e-mail novo, e-mail já cadastrado por senha, `sub` já vinculado, token inválido, e-mail não verificado

## 5. Ajustes em login por credenciais e em gestão de conta

- [ ] 5.1 Em `auth.service.login`, tratar `user.passwordHash === null` como o mesmo caminho de "e-mail inexistente" (mesmo `verifyPassword` contra hash inválido fixo, mesma mensagem, mesmo `UnauthorizedError`) e verificar que o tempo de resposta permanece equivalente ao dos outros dois casos de credencial inválida
- [ ] 5.2 Em `user.service.updateUser`, ajustar a checagem de troca de senha: exigir `currentPassword` apenas quando `user.passwordHash !== null`; quando for `null`, definir a nova senha sem exigir confirmação
- [ ] 5.3 Ajustar `updateUserSchema` em `src/schemas/user.schema.ts` se necessário para permitir `password` sem `currentPassword` (a validação de "exigir `currentPassword` quando há `password`" precisa deixar de ser incondicional na camada de schema, movendo a decisão condicional a `passwordHash` para o service)
- [ ] 5.4 Em `user.service.deleteUser`, exigir `currentPassword` apenas quando `user.passwordHash !== null`; quando for `null`, excluir a conta sem exigir senha
- [ ] 5.5 Ajustar `deleteUserSchema` em `src/schemas/user.schema.ts` para tornar `currentPassword` opcional no corpo, deixando a obrigatoriedade condicional para o service
- [ ] 5.6 Verificar manualmente os cenários novos do spec `user-management`: primeira senha de conta Google sem `currentPassword`, exclusão de conta Google sem `currentPassword`, e que contas com senha continuam exigindo `currentPassword` como antes

## 6. Validação da change

- [ ] 6.1 Rodar `npm run typecheck` e verificar que passa sem erros
- [ ] 6.2 Rodar `openspec validate add-google-sign-in --strict` e verificar que a change passa
