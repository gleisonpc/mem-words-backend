## Context

Ver `proposal.md` — Why para a motivação. `src/config/cors.ts` hoje separa
`CORS_ORIGIN` em `*` (todas) ou uma lista de strings exatas passada direto
para a opção `origin` do pacote `cors`. `src/config/env.ts` só lê a variável
crua, sem interpretar seu conteúdo.

## Goals / Non-Goals

**Goals:**

- Reconhecer padrão com `*` em uma entrada de `CORS_ORIGIN`, ao lado de
  origens exatas, sem mudar o comportamento de quem já usa string exata ou
  `*` sozinho.
- Restringir a origem padrão de produção sem quebrar a verificação de PRs do
  frontend, cujas URLs de revisão mudam a cada deploy.

**Non-Goals:**

- Descobrir automaticamente as origens permitidas (ex.: consultando a API da
  Vercel). A lista continua declarada por variável de ambiente, como o
  requisito já exige.
- Cobrir outra plataforma de preview além do padrão observado na Vercel. Se o
  projeto trocar de hospedagem, o valor de `CORS_ORIGIN` muda com ele.

## Decisions

### Curinga vira `RegExp`, não uma biblioteca de glob

`cors` aceita `RegExp` na lista de `origin` (confirmado no tipo
`StaticOrigin` do pacote: `string | RegExp | Array<string | RegExp>`).
Convertendo cada entrada com `*` para uma expressão regular ancorada
(escapando os demais caracteres especiais e trocando `*` por `.*`), a
correspondência é feita pelo próprio `cors`, sem código de comparação
adicional no projeto.

*Alternativa considerada:* `minimatch` ou `micromatch`. Rejeitada — uma
dependência inteira para um padrão de um caractere curinga é desproporcional.

### O valor concreto fica em `render.yaml`, não no código

A lista de origens é dado de configuração, não lógica. Hardcodar a origem do
frontend em `cors.ts` acoplaria o backend a um deploy específico do frontend
dentro do código-fonte; deixá-la em `render.yaml` mantém o requisito já
existente — "restringir o acesso não exige alteração de código" — literal
mesmo com o valor mudando.

### Um padrão cobre os dois formatos de URL de revisão da Vercel

As URLs observadas nas prévias deste projeto seguem dois formatos, ambos com
o mesmo prefixo e sufixo:

- `mem-words-frontend-git-<branch>-memo-65b2.vercel.app` (prévia por branch)
- `mem-words-frontend-<hash>-memo-65b2.vercel.app` (prévia por deploy)

Um único padrão, `https://mem-words-frontend-*-memo-65b2.vercel.app`, cobre
os dois: o curinga absorve tanto `git-<branch>` quanto `<hash>`.

### Correção do domínio de produção fica documentada, não bloqueada

Ver "Ponto que merece decisão explícita" em `proposal.md`. Sem acesso à
Vercel a partir deste ambiente, o valor de produção
(`https://mem-words-frontend.vercel.app`) é a convenção de domínio padrão da
Vercel para um projeto sem domínio customizado — mas não uma confirmação.
Documentar a suposição e deixá-la corrigível por uma linha em `render.yaml` é
preferível a bloquear a mudança esperando uma confirmação que este ambiente
não consegue obter sozinho.

## Risks / Trade-offs

- **O domínio de produção suposto está errado** → A falha é ruidosa (o
  navegador bloqueia a resposta e mostra o erro de CORS no console), não
  silenciosa; a correção é uma linha em `render.yaml`. Documentado no
  `proposal.md` como ponto de revisão.
- **Sem suíte de testes automatizada no projeto** (`npm test` é um
  placeholder) → A verificação é manual, com o servidor local respondendo a
  requisições com diferentes cabeçalhos `Origin`. `tasks.md` registra os
  casos como passos repetíveis.
- **Um padrão amplo demais liberaria origens indesejadas** → Mitigado pela
  ancoragem da expressão regular (`^...$`) e por escapar todo caractere que
  não seja o curinga, incluindo o `.` do domínio — sem isso, `.` casaria
  qualquer caractere, e não só um ponto literal.

## Migration Plan

Mudança de configuração e de uma função pura. Sem migração de dados. Reverter
é `git revert` do commit ou, mais simples ainda, devolver `CORS_ORIGIN` a
`*` em `render.yaml` sem tocar no código.
