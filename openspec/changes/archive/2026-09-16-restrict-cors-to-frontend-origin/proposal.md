## Why

`CORS_ORIGIN` está em `*` desde que a política de CORS foi criada — correto
enquanto não havia frontend algum para liberar. O frontend agora existe,
publicado na Vercel, e consome rotas que criam e mantêm sessão (`/auth/*`,
`/users/me`). Deixar a origem aberta nesse ponto é a única peça de defesa em
profundidade que falta: o token continua sendo exigido, mas qualquer site
pode tentar a requisição.

A dificuldade prática de restringir é que a Vercel gera uma URL nova a cada
branch e a cada deploy de revisão — a lista de origens exatas nunca fica
completa, e travar em uma lista estática quebraria a verificação de cada PR
do frontend contra este backend.

## What Changes

- `buildCorsOptions` passa a aceitar padrões com `*` em `CORS_ORIGIN`, além de
  origens exatas — convertidos para expressão regular, sem biblioteca nova
  (`cors` já aceita `RegExp` na lista de origens).
- `CORS_ORIGIN` em produção deixa de ser `*` e passa a listar a origem de
  produção do frontend mais um padrão cobrindo os deploys de revisão do mesmo
  projeto na Vercel.
- `.env.example` documenta a sintaxe de padrão.

Nenhuma mudança de comportamento para quem já usa `CORS_ORIGIN` vazio, `*` ou
uma lista de origens exatas — o padrão com `*` é reconhecido a mais, não uma
sintaxe que troca a existente.

## Capabilities

### Modified Capabilities

- `http-api-foundation`: a requisição "Política de CORS configurável" ganha
  reconhecimento de padrão com curinga além de origem exata.

## Impact

**Código afetado**

- `src/config/cors.ts` — lógica de análise de `CORS_ORIGIN`.
- `render.yaml` — valor de `CORS_ORIGIN`.
- `.env.example` — documentação da variável.

**Sem impacto**

- Nenhuma dependência nova (`cors` e seus tipos já suportam `RegExp` na
  lista de origens).
- Nenhuma rota, schema ou middleware muda.

**Ponto que merece decisão explícita na revisão**

A origem de produção exata do frontend não pôde ser confirmada a partir deste
ambiente — o acesso a `vercel.com` está bloqueado pela política de rede desta
sessão. O valor usado (`https://mem-words-frontend.vercel.app`) é o domínio
que a Vercel atribui por padrão a um projeto sem domínio customizado, dado o
nome do projeto observado nas prévias (`mem-words-frontend`, time
`memo-65b2`). É uma suposição fundamentada, não uma confirmação. Corrigi-la,
se estiver errada, é editar um valor em `render.yaml` — nenhuma mudança de
código.
