## 1. Serviço de sugestão de dicionário

- [x] 1.1 Criar `src/services/dictionary.service.ts` portando `resolveLanguagePair` e a tabela `LANGUAGE_CODES` de `mem-words-frontend/src/api/dictionaryLookup.js`, com tipos (`{ source: string; target: string } | null`)
- [x] 1.2 Portar `fetchExampleSentence`, `fetchSynonyms`, `fetchTranslation` e `fetchSuggestion` para o mesmo arquivo, usando `fetch`/`AbortController` globais do Node, timeout de 4s por chamada, `Promise.allSettled` para as três em paralelo
- [x] 1.3 Rodar `npm run typecheck` e confirmar que o novo arquivo compila sem erros (`@types/node` ^26 já cobre `fetch`/`AbortController`/`Response` globais, sem precisar de `lib: ["DOM"]`)

## 2. Rota e validação

- [x] 2.1 Criar `src/schemas/dictionary.schema.ts` com `suggestQuerySchema`: `word`, `sourceLanguage`, `targetLanguage` como strings obrigatórias (trim, min 1) na query
- [x] 2.2 Criar `src/controllers/dictionary.controller.ts` com `suggest` (`GET /dictionary/suggest`): chama `dictionaryService.fetchSuggestion` e responde `200` com `{ suggestion }`
- [x] 2.3 Criar `src/routes/dictionary.routes.ts` (`authenticate` + `validate(suggestQuerySchema)`) e registrar em `src/routes/index.ts`

## 3. Verificação

- [x] 3.1 Rodar `npm run typecheck` no repositório inteiro e confirmar que passa sem erros
- [x] 3.2 Testado manualmente (backend local, Postgres real, `curl` com um access token real) `GET /dictionary/suggest?word=overwhelm&sourceLanguage=Ingl%C3%AAs&targetLanguage=Portugu%C3%AAs` — devolveu tradução, frase de exemplo e sinônimos reais
- [x] 3.3 Testado com o par invertido (`sourceLanguage=Portugues&targetLanguage=ingles`, o par real do baralho que motivou o bugfix no frontend) — mesma sugestão; e com um par não reconhecido (Klingon) — `suggestion: null`
- [x] 3.4 Testado sem `Authorization` — `401 UNAUTHORIZED`; e sem `sourceLanguage`/`targetLanguage` — `400 BAD_REQUEST` com os dois campos listados em `details`

## 4. Correção pós-merge: qualidade da sugestão (change `improve-dictionary-suggestion-quality`)

- [x] 4.1 Reduzir `max=8` para `max=3` em `fetchSynonyms` (Datamuse) — três sinônimos bastam para o card
- [x] 4.2 Trocar `fetchTranslation` de MyMemory (cota por IP, quase sempre esgotada em produção — confirmado nesta sessão) para o endpoint não-oficial do Google Tradutor (`translate.googleapis.com/translate_a/single`), parseando `data[0]` (array de segmentos `[traduzido, original, ...]`) e concatenando os textos traduzidos
- [x] 4.3 Rodar `npm run typecheck` e confirmar que passa sem erros
- [x] 4.4 Testado manualmente (backend local, Postgres real) `GET /dictionary/suggest` para "overwhelm" (Inglês→Português, e o par invertido Português→Inglês), "gratitude" (Inglês→Espanhol) e um par não reconhecido — tradução real do Google Tradutor em todos os casos aplicáveis, no máximo 3 sinônimos, e `suggestion: null` sem chamada externa para o par não reconhecido

## 5. Correção pós-merge: sinônimos misturando sentidos diferentes da palavra (change `improve-synonym-quality`)

- [x] 5.1 Reproduzido o problema relatado: "fast" devolvia `profligate`, `prompt`, `libertine` (sinônimos do sentido raro "de hábitos dissolutos" de "fast"), não do sentido comum "rápido"
- [x] 5.2 Adicionar `fetchSynonymsBySense` em `dictionary.service.ts`: busca no Free Dictionary API (`api.dictionaryapi.dev/api/v2/entries/en/{word}`), agrupa por `meanings[].synonyms` (já vem por classe gramatical) e usa a classe com mais sinônimos listados, exigindo ao menos 2 para considerar válido
- [x] 5.3 Renomear a implementação Datamuse existente para `fetchSynonymsByRelation`; `fetchSynonyms` agora roda as duas em paralelo (`Promise.allSettled`) e prefere o resultado por sentido quando disponível
- [x] 5.4 Rodar `npm run typecheck` e confirmar que passa sem erros
- [x] 5.5 Verificado que a lógica de seleção está correta contra uma resposta real do Free Dictionary API para "fast" (`quick, rapid, speedy`) — o Free Dictionary API se mostrou instável neste ambiente de desenvolvimento (`522` intermitente, em ambos os caminhos de rede testados), então a maioria das tentativas nesta sessão caiu de volta para o Datamuse; a instabilidade em si não é um defeito desta correção — é o motivo de a segunda fonte existir, e só a observação em produção (IP do Render, diferente dos testados aqui) vai dizer com que frequência a fonte melhor está disponível
