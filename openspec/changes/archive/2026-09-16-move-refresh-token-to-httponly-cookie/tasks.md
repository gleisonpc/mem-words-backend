## 1. Cookie do token de renovação

- [x] 1.1 Criar um módulo (`src/lib/refreshTokenCookie.ts` ou similar) com uma
      constante para o nome do cookie, uma função para lê-lo de
      `req.headers.cookie` (analisador mínimo, sem `cookie-parser`) e funções
      para emiti-lo e limpá-lo via `res.cookie()`/`res.clearCookie()`, com
      `httpOnly: true`, `secure: true`, `sameSite: 'none'`, `path: '/auth'` e
      `maxAge` calculado a partir de `env.jwtRefreshExpiresIn` (reaproveitar
      ou extrair `durationToMs` de `auth.service.ts`); verificar que o
      arquivo exporta as três funções e não depende de nenhum pacote novo.
- [x] 1.2 Escrever um teste manual do analisador com entradas variadas — um
      só cookie, vários cookies separados por `; `, cookie ausente, valor
      vazio — confirmando por leitura do resultado que cada caso devolve o
      valor esperado ou `null`.

## 2. Emissão e leitura no fluxo de autenticação

- [x] 2.1 Em `auth.service.ts`, remover `refreshToken` do valor de retorno de
      `issueTokens` usado no corpo da resposta, mantendo o valor do token
      disponível para quem emite o cookie; verificar por leitura que a
      interface `AuthTokens` não expõe mais `refreshToken` a quem consome o
      corpo.
- [x] 2.2 Em `auth.controller.ts`, `login` passa a escrever o cookie do token
      de renovação na resposta antes de enviar o corpo (sem `refreshToken`);
      verificar com uma chamada local que `Set-Cookie` aparece na resposta e
      o corpo não contém a chave `refreshToken`.
- [x] 2.3 `refresh` passa a ler o token do cookie da requisição (não de
      `req.body`), reemitir o cookie com o novo token, e responder o corpo
      sem `refreshToken`; verificar com uma chamada local usando o cookie
      recebido do login.
- [x] 2.4 `logout` passa a ler o token do cookie, chamar o serviço apenas
      quando o cookie está presente (ausência de cookie responde `204`
      direto, sem tocar o banco), e limpar o cookie na resposta em ambos os
      casos; verificar os dois caminhos manualmente.
- [x] 2.5 Ajustar `auth.service.ts#logout` para aceitar a chamada apenas
      quando há token a revogar — a decisão de "nada a revogar" fica no
      controller, que já sabe se o cookie existia; verificar que a assinatura
      da função não mudou para quem já a chama com um token presente.

## 3. Rotas e validação

- [x] 3.1 Remover `validate(refreshSchema)` de `/auth/refresh` e
      `/auth/logout` em `auth.routes.ts`, já que essas rotas não recebem mais
      corpo; verificar que uma chamada sem corpo a essas rotas não é
      rejeitada por validação.
- [x] 3.2 Confirmar que `refreshSchema` ainda é usado em algum lugar ou, se
      não for, removê-lo de `user.schema.ts`; verificar por busca no projeto.

## 4. CORS com credenciais condicionais

- [x] 4.1 Em `cors.ts`, calcular `credentials` a partir do mesmo dado que
      decide `origin`: `true` quando a lista é específica (array de
      string/RegExp), `false` quando é `'*'`; verificar por leitura que os
      dois branches retornam o `credentials` esperado.
- [x] 4.2 Verificar manualmente com `curl -i` que uma origem específica
      permitida recebe `Access-Control-Allow-Credentials: true`, e que com
      `CORS_ORIGIN` vazio ou `*` a resposta não inclui esse cabeçalho.

## 5. Verificação manual do fluxo completo

- [x] 5.1 Subir o servidor local com `CORS_ORIGIN` apontando para uma origem
      de teste e, com um cliente que preserva cookies entre chamadas (ex.:
      `curl -c/-b` com arquivo de cookies, ou um script), executar
      login → refresh → logout em sequência, confirmando: login devolve
      `Set-Cookie` e o corpo sem `refreshToken`; refresh usando o cookie
      devolve novo token de acesso e novo `Set-Cookie`; logout limpa o
      cookie e responde `204`.
- [x] 5.2 Confirmar os atributos do cookie emitido (`HttpOnly`, `Secure`,
      `SameSite=None`, `Path=/auth`) inspecionando o cabeçalho `Set-Cookie`
      bruto.
- [x] 5.3 Confirmar que reapresentar o cookie de um refresh já usado (repetir
      a mesma chamada com o cookie antigo) responde `401` e revoga as demais
      sessões — a detecção de reuso não pode ter sido afetada pela mudança de
      transporte.
- [x] 5.4 Confirmar que `/auth/refresh` e `/auth/logout` sem cookie algum
      respondem, respectivamente, `401` e `204`.
- [x] 5.5 Confirmar que uma chamada antiga, no formato anterior (`refreshToken`
      no corpo, sem cookie), é rejeitada — prova de que o corte é direto e
      não aceita os dois formatos.

## 6. Verificação final

- [x] 6.1 Rodar `npm run typecheck` e `npm run build`; verificar que ambos
      passam sem erro.
- [x] 6.2 Confirmar que `package.json` não ganhou dependência nova.
- [x] 6.3 Rodar `openspec validate --specs` e confirmar que as duas
      capacidades modificadas (`user-auth`, `http-api-foundation`) passam.
