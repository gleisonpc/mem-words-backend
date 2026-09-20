## Why

O frontend (`mem-words-frontend`, change `add-card-dictionary-lookup`, já
mesclado) busca sugestão de tradução/exemplo/sinônimos direto do navegador,
chamando Wiktionary, Datamuse e MyMemory sem passar pelo backend. Isso quebra
a única regra de saída da aplicação: em todo o resto do app, o backend é o
único lugar que fala com serviços externos, e o frontend só fala com o
backend (`src/api/client.js` no frontend é documentado como "a única porta de
saída"). Ter um segundo caminho de saída, direto do navegador, tira do
backend qualquer controle sobre esses serviços — limite de taxa, cache,
trocar de provedor, adicionar chave de API no futuro — e deixa o
funcionamento da sugestão refém de CORS de três serviços de terceiros, cada
um livre para mudar sua política a qualquer momento sem que o time saiba.

## What Changes

- Novo endpoint autenticado `GET /dictionary/suggest`, que recebe `word`,
  `sourceLanguage` e `targetLanguage` por query string e devolve
  `{ suggestion: { translation?, exampleSentence?, synonyms? } | null }` — a
  mesma forma que o frontend já monta hoje no navegador.
- Toda a lógica hoje em `dictionaryLookup.js` do frontend (tabela de idiomas
  reconhecidos, resolução do par em qualquer sentido, as três chamadas em
  paralelo, degradação silenciosa) migra para um serviço do backend,
  praticamente linha a linha — o comportamento externo não muda, só troca de
  processo.
- Nenhuma chave de API é necessária hoje (os três serviços são públicos e sem
  autenticação); o endpoint fica pronto para ganhar uma no futuro sem
  precisar mexer no frontend de novo.

## Capabilities

### Added Capabilities

- `dictionary`: endpoint autenticado que agrega sugestão de
  tradução/exemplo/sinônimos de serviços públicos de dicionário, para uso
  pela tela de criação de card do frontend.

## Impact

- Novo `src/schemas/dictionary.schema.ts`: valida `word`/`sourceLanguage`/
  `targetLanguage` na query string.
- Novo `src/services/dictionary.service.ts`: porta `resolveLanguagePair` e
  `fetchSuggestion` de `mem-words-frontend/src/api/dictionaryLookup.js` para
  TypeScript, sem mudar o comportamento.
- Novo `src/controllers/dictionary.controller.ts` e
  `src/routes/dictionary.routes.ts`, registrado em `src/routes/index.ts`.
- Sem mudança no schema do banco — o endpoint não persiste nada.
- No frontend (`mem-words-frontend`, fora deste repositório): `
  dictionaryLookup.js` passa a chamar este endpoint via `request()` de
  `client.js` em vez de `fetch` direto aos três serviços — acompanha em
  proposta própria naquele repositório.
