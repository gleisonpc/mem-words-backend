## Context

Ver `proposal.md` — Why para a motivação. Estado atual relevante:

- `src/services/auth.service.ts#issueTokens` devolve `{ accessToken,
  refreshToken, tokenType, expiresIn }`; os controllers colocam isso direto no
  corpo da resposta.
- `/auth/refresh` e `/auth/logout` leem `req.body.refreshToken`, validado por
  `refreshSchema` (`{ body: { refreshToken: string } }`).
- `src/config/cors.ts` (mudança anterior) resolve `origin` como `'*'` ou um
  array de string/RegExp; `credentials` está fixo em `false`.
- Express 5 tem `res.cookie()`/`res.clearCookie()` nativos para **emitir**
  cookies. Não tem leitura de `req.cookies` sem middleware — isso é
  `cookie-parser`, que o projeto não usa.
- Frontend e backend estão em domínios diferentes (`*.vercel.app` e
  `*.onrender.com`): um cookie entre eles é necessariamente "cross-site" para
  fins de `SameSite`, exigindo `SameSite=None; Secure`.

## Goals / Non-Goals

**Goals:**

- O token de renovação nunca mais aparece em um lugar que JavaScript consegue
  ler — nem no corpo de resposta, nem em `document.cookie`.
- Nenhuma dependência nova.
- Preservar intocado o mecanismo de rotação e detecção de reuso: muda o
  transporte, não a regra.

**Non-Goals:**

- Período de transição aceitando os dois formatos (corpo e cookie) ao mesmo
  tempo. Decisão do usuário: corte direto, dois PRs (backend, depois
  frontend), aceitando uma janela curta de sessões derrubadas entre os dois
  deploys — ver "Migration Plan".
- Mover o token de *acesso* para cookie também. Ele continua no corpo da
  resposta e no cabeçalho `Authorization`; é de vida curta (15 min) e seu
  valor para um atacante é bem menor que o do token de renovação de 7 dias.
- Sincronizar a expiração do cookie com um refresh antecipado (`expiresIn` em
  segundos em vez de texto) — mudança independente, já registrada como
  questão em aberto na mudança anterior.

## Decisions

### Leitura do cookie por um analisador mínimo, não `cookie-parser`

Só existe **um** cookie para ler, em duas rotas. Um analisador de `req.headers.cookie`
para esse único nome é algumas linhas; `cookie-parser` resolveria um problema
mais geral (múltiplos cookies, várias formas de acesso) que este projeto não
tem. Mesma lógica já aplicada à mudança de CORS, que preferiu uma regex de
uma linha a `minimatch` para o padrão de curinga.

*Alternativa considerada:* `cookie-parser`. Rejeitada por desproporção: uma
dependência inteira para ler um valor de um cabeçalho.

### `SameSite=None; Secure` sempre, não condicional a `NODE_ENV`

A topologia real — frontend na Vercel, backend no Render — é cross-site em
qualquer ambiente que não seja `localhost` nos dois lados. Um código
condicional (`SameSite=Lax` em dev, `None` em produção) manteria um caminho
que só roda localmente, nunca testado contra o cenário que a produção de fato
usa.

O efeito colateral é que, em desenvolvimento local com backend em HTTP puro
(não HTTPS), `Secure` impede o cookie de ser gravado em navegadores que não
tratam `localhost` como origem segura. Chrome trata; Firefox, em versões mais
antigas, não. Isso é uma fricção de ambiente de desenvolvimento, documentada
abaixo, não um problema de produção.

*Alternativa considerada:* atributos condicionais a `NODE_ENV`. Rejeitada:
economiza uma fricção de desenvolvimento ao custo de nunca exercitar em
desenvolvimento os atributos que a produção realmente usa.

### `credentials` do CORS depende do modo de origem, não é um `true` fixo

`Access-Control-Allow-Origin: *` combinado com `Access-Control-Allow-Credentials:
true` é uma combinação que o navegador recusa — e mesmo que não recusasse,
seria liberar cookies de sessão para qualquer origem da internet. Como o modo
"qualquer origem liberada" existe precisamente para quando não há frontend
específico a restringir, ele nunca pode coexistir com credenciais.

`buildCorsOptions` passa a decidir `credentials` a partir do mesmo dado que já
decide `origin`: lista específica → `credentials: true`; vazio/`*` →
`credentials: false`.

### Cookie escopado a `Path=/auth`

O cookie só precisa chegar a `/auth/refresh` e `/auth/logout`. Escopá-lo a
`/auth` em vez de `/` evita que ele seja enviado — e portanto exposto a
inspeção de tráfego, logging de borda, etc. — em toda chamada ao backend que
nada tem a ver com autenticação.

### Logout sem cookie responde sucesso, sem tentar revogar

A spec já exigia idempotência e não revelar se um token existia. Sem cookie
presente, a extensão natural dessa regra é: nada a revogar, sucesso do mesmo
jeito. A alternativa — exigir o cookie e responder `400`/`401` na ausência —
vazaria informação (a resposta mudaria conforme o cookie existe ou não) e
quebraria a idempotência que a spec já garantia.

## Risks / Trade-offs

- **Janela de sessões derrubadas entre os dois deploys** → Aceito
  explicitamente (decisão do usuário). Sessões caem, não dados; o caminho de
  recuperação (login de novo) é imediato. Ver "Migration Plan".
- **`Secure` sem HTTPS local pode não gravar o cookie em alguns navegadores**
  → Efeito restrito a desenvolvimento local em navegadores sem a exceção de
  `localhost`; Chrome não é afetado. Documentado no `README.md` se necessário
  durante a implementação.
- **Sem framework de testes no projeto**, a verificação de atributos de
  cookie e do encadeamento CORS+credenciais é manual, como já foi para a
  mudança de CORS anterior — roteiro repetível em `tasks.md`.
- **Um analisador de cookie escrito à mão pode ter um caso de borda que uma
  biblioteca madura já resolveu** → Escopo mínimo (um nome fixo, sem
  necessidade de suportar múltiplos cookies ou caracteres exóticos no valor,
  já que o valor é gerado pelo próprio backend) reduz a superfície do
  problema a algo verificável por leitura.

## Migration Plan

Corte direto, dois PRs:

1. **Este PR (backend):** passa a exigir e emitir o cookie. A partir do
   deploy, `/auth/login` e `/auth/refresh` não devolvem mais `refreshToken`
   no corpo, e `/auth/refresh`/`/auth/logout` não aceitam mais `refreshToken`
   no corpo.
2. **PR seguinte (frontend, mudança própria):** passa a confiar no cookie —
   para de guardar e enviar o token de renovação manualmente.

Entre o deploy deste PR e o deploy do frontend atualizado, o frontend em
produção (que ainda envia `refreshToken` no corpo) recebe `401` de
`/auth/refresh`/`/auth/logout` — a validação de corpo rejeita a ausência do
campo antes mesmo de tentar autenticar. O efeito prático: sessões existentes
que precisem renovar durante essa janela caem e pedem login de novo. Login e
cadastro continuam funcionando normalmente (o cookie é emitido; o corpo da
resposta só deixa de trazer o campo que o frontend antigo ignoraria de
qualquer modo, pois ele lê pelo nome).

Reversão: `git revert` do commit. Sem migração de dados — o modelo
`RefreshToken` no banco não muda.
