## 1. Corrigir o escopo do cookie

- [x] 1.1 Em `src/lib/refreshTokenCookie.ts`, trocar `COOKIE_OPTIONS.path` de
      `'/auth'` para `'/'`; atualizar o comentário que hoje descreve
      `Path=/auth`.

## 2. Verificação

- [x] 2.1 Testes automatizados existentes continuam passando (nenhum deles
      deveria depender do valor de `Path`, mas confirmar). Não há suite de
      testes automatizados no projeto (`npm test` não está configurado);
      `npm run typecheck` passa sem erros.
- [x] 2.2 Localmente: login, seguido de uma chamada a `/auth/refresh` sem o
      prefixo `/api` (topologia de desenvolvimento) continua funcionando —
      `Path=/` é superconjunto de `Path=/auth`, não deveria quebrar nada.
      Confirmado com Postgres local: cadastro, login, e `POST /auth/refresh`
      usando o cookie jar do curl respondeu `200`.
- [ ] 2.3 Depois do deploy, repetir contra produção a reprodução do
      problema: Playwright com `--test-third-party-cookie-phaseout`,
      cadastro pelo frontend (que chama por `/api/auth/...`), recarregar a
      página e confirmar que a sessão sobrevive — a renovação responde `200`
      em vez de `401`.

## 3. Verificação final

- [x] 3.1 `openspec validate --specs` passa para `user-auth`.
