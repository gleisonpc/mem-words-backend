## Context

Ver `proposal.md` para a motivação. Pontos relevantes do estado atual que
moldam a abordagem:

- `auth.service.ts` já concentra emissão/rotação/revogação de tokens numa
  única função (`issueTokens`), reaproveitada por login e pelas rotas
  mobile — o novo fluxo de Google reaproveita a mesma função.
- `User.passwordHash` é hoje `String` obrigatório; `email` é `@unique`.
- `login()` já mede o tempo de resposta de um e-mail inexistente contra um
  hash bcrypt inválido fixo, para não revelar por timing se a conta existe.
- `user.service.updateUser`/`deleteUser` exigem `currentPassword`
  incondicionalmente hoje.
- CORS/cookie do refresh token não mudam: o Google só entrega um ID token
  ao frontend, que o repassa por `POST /auth/google` como qualquer outra
  chamada autenticada por corpo.

## Goals / Non-Goals

**Goals:**
- Autenticar com um ID token do Google verificado no servidor, sem exigir
  client secret nem fluxo de redirecionamento OAuth.
- Reaproveitar 100% da emissão/rotação/revogação de sessão já existente.
- Permitir que uma conta exista com senha, só com Google, ou com os dois
  vinculados, sem exigir uma migração de dados dos usuários atuais.

**Non-Goals:**
- Fluxo mobile/nativo de Google Sign-In (`mem-words-app`) — client id e SDK
  diferentes; fica para uma change futura, à parte.
- "Desvincular" o Google de uma conta ou remover a senha de uma conta que
  já tem as duas formas — não há requisito de produto para isso ainda.
- Buscar ou armazenar a foto de perfil do Google — fora do que `PublicUser`
  expõe hoje.

## Decisions

### Verificação do ID token: `google-auth-library`, não JWKS manual

A biblioteca oficial (`OAuth2Client.verifyIdToken`) cuida de buscar e
cachear as chaves públicas do Google, verificar assinatura, `iss`, `exp` e
`aud`. Implementar isso à mão com `jsonwebtoken` + JWKS reproduziria uma
biblioteca já mantida pelo próprio Google, com risco maior de erro
(rotação de chave, `alg` inesperado). Alternativa descartada: aceitar um
`access_token` do Google e chamar o `userinfo` endpoint — funciona, mas
troca uma verificação criptográfica local por uma chamada de rede síncrona
no caminho de login.

### Um único endpoint (`POST /auth/google`), sem servidor trocar `code` por token

Como o frontend usa Google Identity Services (GIS) no navegador, o ID
token já chega assinado e pronto — não há `authorization code` para o
backend trocar, então não há necessidade de client secret nem de uma rota
de callback OAuth. Isso mantém o backend sem segredo novo além do
`GOOGLE_CLIENT_ID` (que é público por natureza — é o mesmo valor que o
frontend usa para inicializar o GIS).

### Vínculo automático por e-mail verificado

Quando o e-mail do token já pertence a uma conta com senha, vincula-se o
`googleId` automaticamente em vez de recusar ou exigir uma etapa extra de
confirmação. Alternativa descartada: exigir que a pessoa primeiro entre
com senha e depois vincule o Google manualmente numa tela separada — mais
seguro em teoria, mas sem necessidade aqui porque o Google só emite um ID
token com `email_verified: true` para um e-mail que ele mesmo confirmou
ser dono; o risco que essa etapa extra mitigaria (alguém alegar um e-mail
alheio) já não existe.

### `passwordHash` nulo, não uma senha aleatória gerada

Contas só-Google recebem `passwordHash: null` em vez de uma senha aleatória
inutilizável. Uma senha aleatória exigiria ainda assim tratar login por
credenciais de forma especial (o hash nunca bateria, então o efeito
observável seria idêntico), mas deixaria uma senha "morta" na coluna sem
propósito, e falsearia consultas que hoje assumem "tem `passwordHash` ⇒
tem senha utilizável" (como a decisão de exigir `currentPassword`).
`null` deixa essa pergunta responder a si mesma.

### Timing do rejeitar-conta-sem-senha em `login()`

Para uma conta com `passwordHash: null`, `login()` executa o mesmo
`verifyPassword` contra o hash inválido fixo já usado para e-mail
inexistente, em vez de checar `passwordHash === null` e devolver o erro
imediatamente. Devolver mais rápido nesse caso vazaria, pelo tempo de
resposta, que aquele e-mail existe e é só-Google.

## Risks / Trade-offs

- [Risco] Vínculo automático por e-mail confia inteiramente na verificação
  do Google (`email_verified`) → Mitigação: a própria biblioteca recusa
  tokens sem assinatura válida ou emissor incorreto antes de o backend
  olhar qualquer campo do payload; `email_verified` só é consultado depois
  dessa verificação passar.
- [Risco] `GOOGLE_CLIENT_ID` ausente ou incorreto em produção derrubaria
  silenciosamente só a rota nova → Mitigação: seguir o padrão já existente
  em `env.ts` (`required(...)`), que falha no boot da aplicação inteira,
  não em runtime da rota — mesmo tratamento dado a `JWT_ACCESS_SECRET`.
- [Trade-off] `passwordHash` nulo exige tocar duas funções de
  `user.service.ts` que hoje assumem senha sempre presente
  (`updateUser`, `deleteUser`) → aceito porque a alternativa (senha
  fantasma) espalharia o mesmo problema para mais lugares de forma menos
  visível.

## Migration Plan

1. Migration do Prisma: tornar `password_hash` nullable e adicionar
   `google_id` (`text`, `unique`, nullable) — aditiva, sem backfill
   necessário (linhas existentes já têm `password_hash` preenchido).
2. Deploy do backend com a variável `GOOGLE_CLIENT_ID` configurada antes de
   ativar a rota nova em produção (o boot falha sem ela, então a ordem é
   naturalmente forçada).
3. Sem rollback especial: reverter o código com a coluna já nullable é
   seguro (nenhuma linha existente fica inválida); só reverter a migration
   exigiria antes garantir que nenhuma conta só-Google foi criada.
