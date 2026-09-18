## ADDED Requirements

### Requirement: Resumo diário entre baralhos

O sistema SHALL, para o usuário autenticado, agregar entre todos os seus
baralhos os cards prontos para revisão agora, usando o mesmo critério da
fila de revisão de um baralho: todo card em `new`, e todo card em
`learning` ou `review` cujo `dueAt` já tenha passado, excluindo sempre
cards suspensos.

O resumo SHALL trazer o total (`dueCount`) e a divisão por tipo
(`newCount`, `learningCount`, `reviewCount`), com `dueCount` sempre igual
à soma dos três.

#### Scenario: Conta com baralhos e cards prontos
- **WHEN** o usuário autenticado envia `GET /reviews/today`
- **THEN** o sistema responde `200` com `newCount`, `learningCount`,
  `reviewCount` e `dueCount`, somando os cards prontos de todos os seus
  baralhos

#### Scenario: Card pronto só conta o tipo certo
- **WHEN** a conta tem cards prontos em `new`, em `learning` com `dueAt`
  vencido e em `review` com `dueAt` vencido
- **THEN** cada um aparece só na contagem do seu próprio tipo, e nenhum
  aparece em mais de um

#### Scenario: Cards não vencidos ou suspensos não contam
- **WHEN** a conta tem cards em `learning`/`review` com `dueAt` no futuro,
  ou cards suspensos de qualquer tipo
- **THEN** nenhum deles entra em `newCount`, `learningCount`,
  `reviewCount` ou `dueCount`

#### Scenario: Conta sem nada pronto
- **WHEN** o usuário autenticado não tem nenhum card pronto para revisão
  agora, em nenhum baralho
- **THEN** o sistema responde `200` com `newCount`, `learningCount`,
  `reviewCount` e `dueCount` todos iguais a `0`

#### Scenario: Resumo é só da própria conta
- **WHEN** o usuário autenticado tem baralhos, e outras contas também têm
  cards prontos para revisão
- **THEN** o resumo conta apenas os cards de baralhos pertencentes ao
  usuário autenticado

## MODIFIED Requirements

### Requirement: Registro de uma nota de revisão

O sistema SHALL permitir que o dono do baralho de um card registre uma nota
de revisão (`again`, `hard`, `good`, `easy`) para esse card, e SHALL usar
essa nota para recalcular seu estado, intervalo e `dueAt` segundo o
algoritmo de repetição espaçada:

- Um card em `new` que recebe qualquer nota SHALL passar a `learning`.
- Um card em `learning` que recebe `again` SHALL voltar ao primeiro passo de
  aprendizado. `hard` SHALL repetir o passo atual. `good` SHALL avançar ao
  próximo passo, ou, se não houver próximo passo, graduar para `review` com
  o intervalo de graduação. `easy` SHALL graduar direto para `review`, com
  um intervalo maior que o de graduação por `good`.
- Um card em `review` que recebe `again` SHALL voltar a `learning`, reiniciar
  o passo de aprendizado e reduzir o fator de facilidade. `hard`, `good` e
  `easy` SHALL manter o card em `review`, recalculando seu intervalo a
  partir do fator de facilidade — `hard` reduz o fator de facilidade,
  `good` o mantém, `easy` o aumenta — respeitando um intervalo máximo fixo.

Nenhuma nota SHALL exigir ou aceitar dados além da nota em si — o
agendamento resultante é sempre determinado pelo estado atual do card e
pela nota recebida, nunca por um valor de intervalo informado pelo cliente.

Registrar qualquer nota, de qualquer valor, SHALL contar como atividade do
dia para a sequência de dias seguidos do usuário dono do baralho (ver
`user-management`): a nota em si não precisa ser bem-sucedida em fazer o
card avançar para contar como atividade — errar (`again`) também conta.

#### Scenario: Card novo recebe a primeira nota
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "good"` para um card em `new`
- **THEN** o sistema responde `200` com o card em `learning`, no primeiro
  passo de aprendizado avançado, e `dueAt` correspondente

#### Scenario: Card em aprendizado erra a resposta
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "again"` para um card em `learning`
- **THEN** o sistema responde `200` com o card de volta ao primeiro passo de
  aprendizado

#### Scenario: Card em aprendizado gradua para revisão
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "good"` para um card em `learning` já no último passo
- **THEN** o sistema responde `200` com o card em `review`, com o intervalo
  de graduação e `dueAt` recalculado a partir dele

#### Scenario: Card maduro erra a resposta
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "again"` para um card em `review`
- **THEN** o sistema responde `200` com o card de volta a `learning`, no
  primeiro passo, e com o fator de facilidade reduzido

#### Scenario: Card maduro é lembrado facilmente
- **WHEN** o dono do baralho envia `POST /cards/:id/reviews` com `grade:
  "easy"` para um card em `review`
- **THEN** o sistema responde `200` com o card ainda em `review`, fator de
  facilidade maior e um intervalo maior que o anterior, sem ultrapassar o
  intervalo máximo

#### Scenario: Nota inválida
- **WHEN** um usuário envia `POST /cards/:id/reviews` com um valor de
  `grade` fora de `again`/`hard`/`good`/`easy`
- **THEN** o sistema responde `400` com o formato de erro padrão e não
  altera o card, nem a sequência de dias do usuário

#### Scenario: Usuário tenta registrar nota em card de baralho de outra conta
- **WHEN** um usuário autenticado envia `POST /cards/:id/reviews` para um
  card cujo baralho pertence a outro usuário
- **THEN** o sistema responde `403` e não altera o card, nem a sequência de
  dias de nenhum dos dois usuários

#### Scenario: Card inexistente
- **WHEN** um usuário autenticado envia `POST /cards/:id/reviews` com um
  `id` que não corresponde a nenhum card
- **THEN** o sistema responde `404`

#### Scenario: Nota registrada conta como atividade do dia
- **WHEN** o dono de um baralho registra uma nota válida, em qualquer
  card, pela primeira vez em um dia
- **THEN** a sequência de dias seguidos desse usuário é recalculada
  segundo as regras de `user-management`
