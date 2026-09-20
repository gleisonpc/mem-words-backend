## Purpose

Agrega, a partir de serviços públicos de dicionário e tradução, uma sugestão
de tradução, frase de exemplo e sinônimos para uma palavra — usado pela tela
de criação de card do frontend para reduzir o preenchimento manual.

## ADDED Requirements

### Requirement: Sugestão de tradução/exemplo/sinônimos

O sistema SHALL expor `GET /dictionary/suggest`, autenticado, que recebe
`word`, `sourceLanguage` e `targetLanguage` por query string e responde com
`{ suggestion }`, onde `suggestion` é `null` ou um objeto com `translation`,
`exampleSentence` e/ou `synonyms` (cada campo presente só quando obtido).

A sugestão SHALL ser buscada apenas quando um dos dois idiomas informados —
origem ou destino, em qualquer ordem — for reconhecido como inglês, e o
outro for reconhecido como um dos idiomas cobertos pela tradução. Fora
disso, `suggestion` SHALL ser `null` sem que nenhuma chamada externa seja
feita.

Falha, tempo esgotado ou resposta sem conteúdo aproveitável de qualquer um
dos serviços externos usados SHALL ser tratada como ausência apenas daquela
parte da sugestão — nunca como erro da requisição. A requisição SHALL
responder `200` mesmo quando nenhum serviço externo trouxer nada, com
`suggestion: null`.

#### Scenario: Par de idiomas reconhecido, com conteúdo disponível
- **WHEN** um usuário autenticado envia `GET /dictionary/suggest` com uma
  palavra em inglês comum e um par de idiomas em que um lado é inglês e o
  outro é reconhecido
- **THEN** o sistema responde `200` com `suggestion` trazendo ao menos um
  entre `translation`, `exampleSentence` e `synonyms`

#### Scenario: Par de idiomas em qualquer sentido
- **WHEN** `sourceLanguage` é inglês e `targetLanguage` é outro idioma
  reconhecido, ou o inverso (`targetLanguage` inglês e `sourceLanguage`
  outro idioma reconhecido)
- **THEN** os dois casos produzem a mesma busca, usando o lado em inglês
  como a palavra a definir e o outro lado como idioma de destino da
  tradução

#### Scenario: Par de idiomas não reconhecido
- **WHEN** nenhum dos dois idiomas informados é reconhecido como inglês, ou
  o lado reconhecido como inglês tem o outro lado fora da tabela de idiomas
  cobertos
- **THEN** o sistema responde `200` com `suggestion: null`, sem chamar
  nenhum serviço externo

#### Scenario: Nenhum serviço externo traz conteúdo aproveitável
- **WHEN** o par de idiomas é reconhecido, mas os três serviços externos
  falham, expiram, ou não trazem nada aproveitável para a palavra
- **THEN** o sistema responde `200` com `suggestion: null`, não um erro

#### Scenario: Um serviço externo falha, os outros não
- **WHEN** o par de idiomas é reconhecido e um dos três serviços externos
  falha ou expira, enquanto os outros dois respondem com conteúdo
  aproveitável
- **THEN** o sistema responde `200` com `suggestion` trazendo os campos dos
  serviços que responderam, sem o campo do que falhou

#### Scenario: Parâmetro obrigatório ausente
- **WHEN** `GET /dictionary/suggest` é enviado sem `word`, sem
  `sourceLanguage` ou sem `targetLanguage`
- **THEN** o sistema responde `400` com o formato de erro padrão

#### Scenario: Requisição sem autenticação
- **WHEN** `GET /dictionary/suggest` é enviado sem um access token válido
- **THEN** o sistema responde `401`
