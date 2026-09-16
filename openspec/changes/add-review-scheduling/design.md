## Context

Ver `proposal.md` para motivação. Hoje `Card.state` é um enum `CardState`
com um único valor possível (`new`) — a mudança que o criou já previu que a
máquina de estados completa viria depois. As camadas existentes (`routes ->
middlewares -> controllers -> services -> prisma`) e a checagem de posse
via dono do baralho (`card.service.ts`) são reaproveitadas sem mudança de
padrão.

## Goals / Non-Goals

**Goals:**
- Definir o algoritmo de repetição espaçada (estados, campos de
  agendamento, fórmula de cada nota) com parâmetros fixos, embutidos no
  código.
- Expor a fila de revisão de um baralho e o endpoint de registro de nota.
- Deixar o algoritmo puro (função determinística `estado atual + nota ->
  novo estado`) para que a fila possa mostrar a prévia das quatro notas sem
  gravar nada.

**Non-Goals:**
- Parâmetros configuráveis por usuário (passos de aprendizado, fator de
  facilidade inicial, intervalo máximo, ordem da fila) — tela de
  configurações de revisão do mockup, mudança futura. Os valores fixos
  desta mudança SHALL virar os padrões dessa configuração quando ela
  existir, não uma segunda fonte de verdade.
- Estado `suspended`/pausar um card manualmente.
- "Enterrar irmãos" (mesma palavra não repetir no mesmo dia) — só faz
  sentido quando um baralho tem múltiplos cards da mesma palavra, cenário
  que hoje não existe.
- Histórico de revisões (quando cada nota foi dada, streak, retenção) —
  exigiria uma tabela nova e é consumido só pela tela de estatísticas,
  fora de escopo aqui. O card guarda unicamente seu estado atual.
- Limite diário de cards novos por baralho — a fila retorna todo `new`
  pronto; um limite é política de configuração, não do motor de
  agendamento.

## Decisions

### Três estados (`new`, `learning`, `review`), sem `suspended`

Cobre exatamente os três badges que o mockup usa nas telas de revisão
(1g/1h, em escopo). "Maduro" (mockup 1e/1f, fora de escopo aqui) é uma
leitura de UI sobre `state: "review"` combinado com `intervalDays` — não
precisa de um quarto estado no banco. `suspended` (mockup 1e) é uma ação
manual sem tela nesta mudança; adicionar o estado agora sem ação nenhuma
para chegar nele seria enum morto.

### Algoritmo: variante fixa e simplificada do SM-2 (estilo Anki)

Parâmetros embutidos como constantes (não em tabela nem env var — viram
configuráveis só quando a tela de configurações existir):

- `LEARNING_STEPS_MINUTES = [1, 10]` — os mesmos dois passos padrão do
  Anki; nenhum motivo para inventar um valor menos testado como default.
- `GRADUATING_INTERVAL_DAYS = 1`, `EASY_INTERVAL_DAYS = 4` — intervalo ao
  sair de `learning` para `review` via `good` e via `easy`.
- `DEFAULT_EASE = 2.5`, `MIN_EASE = 1.3` — fator de facilidade inicial e
  piso, para que notas ruins repetidas não colapsem o intervalo a zero.
- `MAX_INTERVAL_DAYS = 180` — teto de intervalo em `review`.

Transições (card em `learning`, índice `i` do passo atual):
- `again`: volta ao passo `0`, `dueAt = agora + LEARNING_STEPS_MINUTES[0]`.
- `hard`: repete o passo atual, `dueAt = agora + LEARNING_STEPS_MINUTES[i]`.
- `good`: se existe passo `i+1`, avança para ele; senão, gradua para
  `review` com `intervalDays = GRADUATING_INTERVAL_DAYS` e
  `easeFactor = DEFAULT_EASE`.
- `easy`: gradua direto para `review`, pulando os passos restantes, com
  `intervalDays = EASY_INTERVAL_DAYS` e `easeFactor = DEFAULT_EASE`.

Transições (card em `review`, intervalo `d` dias, facilidade `e`):
- `again`: volta a `learning` no passo `0`, `easeFactor = max(MIN_EASE, e -
  0.20)` (a queda persiste — a facilidade não reseta ao graduar de novo).
- `hard`: `intervalDays = min(MAX_INTERVAL_DAYS, d * 1.2)`, `easeFactor =
  max(MIN_EASE, e - 0.15)`.
- `good`: `intervalDays = min(MAX_INTERVAL_DAYS, d * e)`, `easeFactor`
  inalterado.
- `easy`: `intervalDays = min(MAX_INTERVAL_DAYS, d * e * 1.3)`,
  `easeFactor = e + 0.15`.

Um card em `new` que recebe qualquer nota entra em `learning` no passo `0`
como se tivesse acabado de errar (`again`) — a primeira exposição a um card
sempre passa pelo primeiro passo, independente da nota, porque não há
"intervalo anterior" para basear `hard`/`good`/`easy` num card nunca visto.

Alternativa descartada: replicar o SM-2 "puro" (com contagem de repetições
e fórmula de EF por qualidade 0-5). O produto só tem quatro botões — o
alfabeto do usuário já é `again/hard/good/easy` — então recriar as seis
qualidades do SM-2 original adicionaria uma tradução sem necessidade.

### Agendamento puro, separado da gravação

`computeNextSchedule(card, grade, now)` é uma função pura que devolve o
próximo `{ state, learningStep, easeFactor, intervalDays, dueAt }`, sem
tocar o banco. `POST /cards/:id/reviews` chama essa função e persiste o
resultado; `GET /decks/:id/reviews/queue` chama essa mesma função uma vez
para cada uma das quatro notas, por card, e descarta o resultado — só
`dueAt` de cada prévia vai na resposta. Nenhuma duplicação de regra entre
"aplicar" e "prever".

### Prévia devolve `dueAt`, não texto formatado

Cada prévia é `{ grade, dueAt }` (timestamp), não `"6 min"`/`"1 dia"`
prontos. Formatar relativo a "agora" é decisão de apresentação — muda com
o fuso e o idioma de quem vê a tela — e o cliente já traduz toda resposta
do backend para português; formatar aqui duplicaria essa responsabilidade
no lugar errado.

### Fila sem paginação, sem limite diário

`GET /decks/:id/reviews/queue` devolve a lista inteira de cards prontos,
sem `page`/`pageSize` como a listagem de cards tem. Um limite diário de
cards novos é política configurável (fora de escopo); sem ele, não há
motivo para paginar algo que o próprio cliente vai consumir por inteiro
numa sessão de revisão. Se o volume crescer a ponto de importar, paginar
essa fila é uma mudança isolada, sem tocar no algoritmo.

### Sem histórico de revisão nesta mudança

Persistir cada nota dada (tabela `card_review`) alimentaria estatísticas e
streak, mas nenhuma tela desta mudança precisa disso — 1g/1h leem e
escrevem só o estado atual do card. Adicionar a tabela agora, sem
consumidor, seria dado morto até a mudança de estatísticas existir; ela
nasce junto com essa mudança, quando o formato que as telas de fato
precisam estiver claro.

## Risks / Trade-offs

- [Parâmetros fixos hoje viram a "migração" implícita do que a tela de
  configurações precisa expor amanhã] → aceito; documentado acima para que
  a mudança de configurações reaproveite os mesmos nomes e valores como
  default, em vez de inventar outro conjunto.
- [`ALTER TYPE ... ADD VALUE` em enum Postgres não pode ser usado na mesma
  transação em que foi adicionado] → a migration desta mudança SHALL, se o
  Prisma gerar os dois passos numa única migration que falhe por isso,
  ser dividida em duas migrations sequenciais (uma só adicionando
  `learning`/`review` ao enum, a seguinte usando os novos valores e
  colunas) — risco conhecido de Postgres, não específico deste desenho.
- [Sem histórico de revisão] → uma mudança futura de estatísticas precisará
  de uma migration própria para a tabela de histórico; nenhum dado desta
  mudança precisa ser retroativamente migrado para ela, porque `dueAt` e
  `intervalDays` já carregam o estado atual independente do histórico.
- [Concorrência: duas notas para o mesmo card quase ao mesmo tempo] →
  aceito sem lock otimista; o produto é de uso pessoal (um único
  dispositivo por vez, tipicamente), e o pior caso é uma nota
  "sobrescrever" a outra no mesmo card, sem corromper dado nenhum.

## Migration Plan

Nova migration Prisma: `CardState` ganha `learning` e `review`; `Card`
ganha `learningStep` (`Int`, default `0`), `easeFactor` (`Float`, default
`2.5`), `intervalDays` (`Float`, default `0`), `dueAt` (`DateTime?`,
default `null`). Cards existentes (todos em `new`) recebem os defaults e
continuam corretos — um card `new` sem `dueAt` é exatamente o estado que a
capability `cards` já espera. Sem backfill manual.

Reversão: `git revert` do commit e uma migration reversa (`prisma migrate
diff` contra o estado anterior) removendo as colunas e os valores do enum
— reversão de enum em Postgres exige recriar o tipo; documentar isso na
migration se for necessário reverter em produção.
