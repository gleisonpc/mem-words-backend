## Purpose

Agrega, a partir de serviços públicos de dicionário e tradução, uma sugestão
de tradução, frase de exemplo e sinônimos para uma palavra — usado pela tela
de criação de card do frontend para reduzir o preenchimento manual.

## ADDED Requirements

### Requirement: Sugestão de tradução/exemplo/sinônimos

O sistema SHALL expor `GET /dictionary/suggest`, autenticado, que recebe
`word`, `sourceLanguage` e `targetLanguage` por query string e responde com
`{ suggestion }`, onde `suggestion` é `null` ou um objeto com `translation`,
`exampleSentence`, `exampleTranslation`, `partOfSpeech` e/ou `synonyms`
(cada campo presente só quando obtido).

Obtida uma frase de exemplo, o sistema SHALL também tentar traduzi-la para
o idioma de destino (`exampleTranslation`) e SHALL incluir a classe
gramatical (`partOfSpeech`) da mesma acepção de onde a frase veio, em
português. Falha em traduzir a frase, ou ausência de classe gramatical
naquela acepção, SHALL deixar o campo correspondente ausente, sem impedir
o resto da sugestão.

> **Correção pós-lançamento:** a primeira versão só sugeria a tradução da
> palavra, a frase de exemplo em inglês e sinônimos — a tela de criação de
> card continuava sem preencher "Tradução da frase" e "Classe gramatical"
> automaticamente, exigindo trabalho manual que a sugestão deveria evitar.
> Corrigido: a mesma tradução (Google Tradutor) usada para a palavra agora
> também traduz a frase de exemplo, e a classe gramatical (substantivo,
> verbo, adjetivo...) vem junto da acepção de onde a frase foi extraída —
> da Wiktionary, ou do Free Dictionary API quando a Wiktionary não tiver
> nenhuma frase para a palavra.

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
- **WHEN** o par de idiomas é reconhecido e um dos serviços externos falha
  ou expira, enquanto os outros respondem com conteúdo aproveitável
- **THEN** o sistema responde `200` com `suggestion` trazendo os campos dos
  serviços que responderam, sem o campo do que falhou

#### Scenario: Frase de exemplo encontrada, com classe gramatical e tradução
- **WHEN** o par de idiomas é reconhecido e uma frase de exemplo é
  encontrada para a palavra
- **THEN** `suggestion` traz `exampleSentence`, e SHALL tentar trazer
  também `exampleTranslation` (a mesma frase traduzida) e `partOfSpeech`
  (a classe gramatical daquela acepção, em português)

#### Scenario: Frase encontrada, mas a tradução da frase falha
- **WHEN** uma frase de exemplo é encontrada, mas a tradução dessa frase
  falha ou expira
- **THEN** `suggestion` ainda traz `exampleSentence` (e `partOfSpeech`,
  se disponível), sem `exampleTranslation`

#### Scenario: Nenhuma frase de exemplo encontrada
- **WHEN** nenhuma frase de exemplo é encontrada para a palavra
- **THEN** `suggestion` não traz `exampleSentence`, `exampleTranslation`
  nem `partOfSpeech` — não há frase para traduzir nem acepção da qual
  extrair a classe gramatical

#### Scenario: Parâmetro obrigatório ausente
- **WHEN** `GET /dictionary/suggest` é enviado sem `word`, sem
  `sourceLanguage` ou sem `targetLanguage`
- **THEN** o sistema responde `400` com o formato de erro padrão

#### Scenario: Requisição sem autenticação
- **WHEN** `GET /dictionary/suggest` é enviado sem um access token válido
- **THEN** o sistema responde `401`
