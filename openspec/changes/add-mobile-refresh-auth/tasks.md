## 1. Schemas

- [ ] 1.1 Adicionar `mobileRefreshSchema` (`{ body: { refreshToken:
      z.string().min(1) } }`) e `mobileLogoutSchema` (`{ body: {
      refreshToken: z.string().min(1).optional() } }`) a
      `src/schemas/user.schema.ts`, exportando os tipos correspondentes —
      verificar `npm run typecheck`

## 2. Controller e rotas

- [ ] 2.1 Adicionar `mobileLogin`, `mobileRefresh`, `mobileLogout` a
      `src/controllers/auth.controller.ts`: mesma lógica de
      `login`/`refresh`/`logout`, mas lendo/gravando `refreshToken` no
      corpo em vez de cookie (nenhuma chamada a
      `setRefreshTokenCookie`/`readRefreshTokenCookie`/`clearRefreshTokenCookie`)
      — verificar que os handlers existentes (`login`, `refresh`,
      `logout`) permanecem inalterados
- [ ] 2.2 Registrar `POST /auth/mobile/login` (com `loginSchema`),
      `POST /auth/mobile/refresh` (com `mobileRefreshSchema`),
      `POST /auth/mobile/logout` (com `mobileLogoutSchema`) em
      `src/routes/auth.routes.ts` — verificar `npm run dev` sobe sem erro
      e as rotas aparecem registradas

## 3. Verificação manual

- [ ] 3.1 Com `curl`: `POST /auth/mobile/login` com credenciais corretas
      responde `200` com `refreshToken` no corpo e sem `Set-Cookie` no
      cabeçalho da resposta (`curl -i` e inspecionar os headers)
- [ ] 3.2 `POST /auth/mobile/refresh` com o `refreshToken` da resposta
      anterior responde `200` com um `refreshToken` novo e diferente,
      ainda sem `Set-Cookie`
- [ ] 3.3 Reapresentar o `refreshToken` já trocado no passo 3.2 responde
      `401`, e uma tentativa de refresh subsequente com o token mais
      recente (emitido no passo 3.2) também responde `401` — confirma que
      a detecção de reuso derruba a sessão mobile como já fazia para a
      web
- [ ] 3.4 `POST /auth/mobile/logout` com um `refreshToken` válido responde
      `204`, e uma tentativa de `POST /auth/mobile/refresh` com o mesmo
      token depois do logout responde `401`
- [ ] 3.5 `POST /auth/mobile/refresh` sem `refreshToken` no corpo responde
      `400`; `POST /auth/mobile/logout` sem `refreshToken` no corpo
      responde `204` sem tentar revogar nada
- [ ] 3.6 Repetir o roteiro de `curl` já existente para `/auth/login`,
      `/auth/refresh`, `/auth/logout` (cookie) e confirmar que continuam
      se comportando exatamente como antes desta change

## 4. Documentação e verificação final

- [ ] 4.1 Atualizar `README.md` com as três rotas novas, seguindo o estilo
      da seção de autenticação já existente
- [ ] 4.2 `npm run typecheck` passa sem erros
- [ ] 4.3 `openspec validate --specs` passa para `user-auth`
