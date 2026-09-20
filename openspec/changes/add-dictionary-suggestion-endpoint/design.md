## Context

Ver `proposal.md`. A lógica inteira já existe e já foi validada em produção,
só que no lugar errado: `mem-words-frontend/src/api/dictionaryLookup.js`
(change `add-card-dictionary-lookup`, mesclado) implementa `
resolveLanguagePair` e `fetchSuggestion`, chamando três serviços públicos
direto do navegador:

- Wiktionary REST (`https://en.wiktionary.org/api/rest_v1/page/definition/{word}`)
  — definição/exemplo em inglês.
- Datamuse (`https://api.datamuse.com/words?rel_syn={word}&max=8`) —
  sinônimos por similaridade.
- MyMemory (`https://api.mymemory.translated.net/get?q={word}&langpair=en|{target}`)
  — tradução; sujeita a cota diária por IP (já observado em produção).

Nenhum dos três exige chave de API hoje. Portar essa lógica para o backend
é, na prática, mover os mesmos arquivos e a mesma função para
TypeScript — o comportamento observável (o que a tela de criação de card
recebe) não muda.

## Goals / Non-Goals

**Goals:**
- Um único lugar de saída para serviços externos, consistente com o resto
  do backend.
- Comportamento idêntico ao que já está em produção: mesmos serviços, mesma
  tabela de idiomas, mesma degradação silenciosa em vez de erro.

**Non-Goals:**
- Cache das respostas dos serviços externos — pode vir depois, se o volume
  justificar; este change só move a chamada de lugar.
- Autenticação/chave de API para os três serviços — nenhum exige hoje.
- Mudar a tabela de idiomas reconhecidos ou os critérios de degradação —
  são portados como estão.

## Decisions

### Endpoint autenticado, sem escopo de baralho/card

`GET /dictionary/suggest` exige access token (mesmo padrão de
`GET /reviews/today`: autenticado, mas sem `:id` de baralho ou card — a
sugestão não pertence a nenhum registro do banco, só precisa de uma sessão
válida para não virar um proxy público e anônimo para os três serviços de
terceiros a partir da infraestrutura do backend.

Alternativa descartada: endpoint público (sem autenticação), já que os três
serviços de origem também são públicos. Rejeitada porque um proxy aberto no
backend do mem-words viraria alvo de uso indevido (qualquer um poderia usá-lo
para consultar Wiktionary/Datamuse/MyMemory através da infraestrutura do
projeto, sem relação com o app) — autenticar custa uma checagem de token e
fecha essa porta.

### `word`, `sourceLanguage`, `targetLanguage` por query string

`GET`, não `POST`: a operação é uma consulta, sem efeito colateral, e cabe
inteira em três parâmetros curtos — o mesmo padrão de
`GET /decks/:id/cards?q=&status=`. Os três são obrigatórios: sem `word` não
há o que buscar, e sem os dois idiomas não há como saber se o par é
reconhecido nem qual código de destino usar na tradução.

### Serviço portado quase literalmente do frontend

`resolveLanguagePair` e `fetchSuggestion` migram de
`dictionaryLookup.js` para `src/services/dictionary.service.ts` preservando
a lógica exata: a tabela de idiomas reconhecidos (português/inglês, sem
diferenciar maiúsculas/acentos, para inglês/português/espanhol/francês/
alemão/italiano/japonês), a resolução do par em qualquer sentido (a origem
*ou* o destino do baralho pode ser o lado em inglês — ver a correção já
aplicada no frontend para o caso "Português → Inglês"), as três chamadas em
paralelo com `Promise.allSettled`, e a regra de nunca lançar: qualquer falha
vira ausência dessa parte da sugestão, nunca um erro.

Diferença mecânica: `fetch`/`AbortController` do backend são os globais do
Node 22 (mesma API, sem import extra), e as funções ganham tipos.

### Tempo limite de 4s por chamada, igual ao original

Mantido o mesmo valor do frontend — a motivação (a soma das três chamadas
não deve travar a resposta; os serviços de dicionário não têm o mesmo
motivo para demorar que o backend hospedado tem para hibernar) vale igual
rodando no servidor.

## Risks / Trade-offs

- Os três serviços continuam gratuitos e sem SLA — a diferença é que agora
  uma instabilidade aparece nos logs do backend, não silenciosamente no
  navegador de cada usuário.
- O backend hospedado (Render) precisa de saída HTTPS livre para os três
  domínios — nenhum motivo para não ter, mas é uma dependência de rede nova
  para esse processo, que antes só falava com o Neon/Postgres.
