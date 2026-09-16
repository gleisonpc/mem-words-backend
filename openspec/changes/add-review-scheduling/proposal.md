## Why

O card já nasce com um campo `state`, mas ele só assume um valor (`"new"`) —
a mudança que o criou (`add-decks-and-cards`) deixou de propósito a máquina
de estados e os campos de agendamento (intervalo, facilidade, próxima
revisão) para depois: "o próximo change". Sem isso, o app não faz a única
coisa que o nome promete — não há como saber quais cards revisar hoje, nem
como uma resposta do usuário ("lembrei fácil" vs. "esqueci") muda quando
aquele card volta a aparecer.

## What Changes

- `Card.state` ganha os valores `learning` e `review`, além de `new` — e os
  campos de agendamento que faltavam: passo de aprendizado atual, fator de
  facilidade, intervalo (em dias) e data da próxima revisão (`dueAt`).
- Algoritmo de repetição espaçada (variante simplificada do SM-2/Anki), com
  parâmetros fixos nesta mudança (não configuráveis pelo usuário — isso é a
  tela de configurações de revisão do mockup, fora de escopo aqui):
  passos de aprendizado em minutos, fator de facilidade inicial, intervalo
  de graduação e intervalo máximo.
- `GET /decks/:id/reviews/queue`: lista os cards de um baralho que estão
  prontos para revisão agora (novos ainda não estudados + `learning`/`review`
  com `dueAt` vencido), cada um já com a prévia do intervalo resultante de
  cada uma das quatro notas possíveis.
- `POST /cards/:id/reviews`: recebe a nota da revisão (`again`, `hard`,
  `good`, `easy`), aplica o algoritmo e responde com o card atualizado
  (novo estado, intervalo, `dueAt`).
- Nenhum histórico de revisões é persistido nesta mudança — o card guarda só
  seu estado atual. Estatísticas e sequência de dias (streak) exigem esse
  histórico e ficam para a mudança que implementar as telas correspondentes.

## Capabilities

### New Capabilities

- `reviews`: a fila de revisão de um baralho e o registro de uma nota de
  revisão — o algoritmo de repetição espaçada, a ordem da fila, e como cada
  nota (`again`/`hard`/`good`/`easy`) muda o agendamento de um card.

### Modified Capabilities

- `cards`: o requisito de criação passa a descrever o estado inicial
  completo (`new`, sem agendamento) e a representação pública do card passa
  a incluir os campos de agendamento (`learningStep`, `easeFactor`,
  `intervalDays`, `dueAt`) — nenhum requisito de posse, paginação ou edição
  de conteúdo muda.

## Impact

- `prisma/schema.prisma`: `CardState` ganha `learning` e `review`; `Card`
  ganha `learningStep`, `easeFactor`, `intervalDays`, `dueAt`; nova
  migration.
- `src/services/card.service.ts`: `toPublicCard` passa a expor os campos de
  agendamento.
- Novo `src/services/review.service.ts`: o algoritmo de repetição espaçada e
  a montagem da fila.
- Novo `src/controllers/review.controller.ts`, `src/routes/review.routes.ts`,
  `src/schemas/review.schema.ts`.
- `src/app.ts` (ou onde as rotas são registradas): nova rota de revisões.
- Nenhuma dependência nova; nenhuma mudança em autenticação ou em outras
  capabilities.
