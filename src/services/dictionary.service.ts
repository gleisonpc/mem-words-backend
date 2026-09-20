/**
 * Agrega sugestão de tradução/exemplo/sinônimos de serviços públicos de
 * dicionário e tradução — usado pelo endpoint `GET /dictionary/suggest`.
 *
 * Portado quase literalmente de `dictionaryLookup.js` do frontend (change
 * `add-card-dictionary-lookup`, mesclado): a lógica só mudou de processo, o
 * comportamento observável não muda. Ver design.md do change
 * `add-dictionary-suggestion-endpoint`.
 */

const TIMEOUT_MS = 4000;

export interface LanguagePair {
  source: string;
  target: string;
}

export interface DictionarySuggestion {
  translation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  partOfSpeech?: string;
  synonyms?: string[];
}

/**
 * Texto comum, em português e inglês, para os idiomas cobertos pela
 * sugestão — sem diferenciar maiúsculas/acentos (ver `normalize`). Lugar
 * único para estender a cobertura depois.
 */
const LANGUAGE_CODES: Record<string, string> = {
  ingles: 'en',
  inglesa: 'en',
  english: 'en',
  en: 'en',
  portugues: 'pt',
  portuguesa: 'pt',
  portuguese: 'pt',
  pt: 'pt',
  'pt-br': 'pt',
  espanhol: 'es',
  espanhola: 'es',
  spanish: 'es',
  es: 'es',
  frances: 'fr',
  francesa: 'fr',
  french: 'fr',
  fr: 'fr',
  alemao: 'de',
  alema: 'de',
  german: 'de',
  de: 'de',
  italiano: 'it',
  italiana: 'it',
  italian: 'it',
  it: 'it',
  japones: 'ja',
  japonesa: 'ja',
  japanese: 'ja',
  ja: 'ja',
};

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function languageCode(text: string): string | null {
  return LANGUAGE_CODES[normalize(text)] ?? null;
}

/**
 * Resolve o par de idiomas de um baralho para os códigos que os serviços de
 * dicionário/tradução usam, ou `null` quando o par não é reconhecido.
 *
 * Um dos dois — origem ou destino, em qualquer ordem — precisa mapear para
 * inglês: Wiktionary e Datamuse, os serviços de definição/exemplo e
 * sinônimos, só cobrem palavras em inglês, e é sempre a palavra em inglês
 * que entra nessas buscas. Baralhos reais têm os dois pares, "Inglês →
 * Português" e "Português → Inglês", então os dois sentidos precisam ser
 * reconhecidos igualmente. O outro lado precisa mapear para algum código da
 * tabela, porque é o que a tradução usa.
 */
export function resolveLanguagePair(
  sourceLanguage: string,
  targetLanguage: string,
): LanguagePair | null {
  const source = languageCode(sourceLanguage);
  const target = languageCode(targetLanguage);

  if (source === 'en' && target !== null) {
    return { source, target };
  }

  if (target === 'en' && source !== null) {
    return { source: target, target: source };
  }

  return null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * Classe gramatical em português, a partir do valor em inglês que
 * Wiktionary e o Free Dictionary API expõem ("noun", "verb", "Adjective"...).
 * Um valor não mapeado passa direto — melhor mostrar o termo em inglês do
 * que descartar a informação.
 */
const PART_OF_SPEECH_PT: Record<string, string> = {
  noun: 'substantivo',
  verb: 'verbo',
  adjective: 'adjetivo',
  adverb: 'advérbio',
  pronoun: 'pronome',
  preposition: 'preposição',
  conjunction: 'conjunção',
  interjection: 'interjeição',
  determiner: 'artigo',
  article: 'artigo',
  numeral: 'numeral',
};

function normalizePartOfSpeech(partOfSpeech: string | undefined): string | undefined {
  if (!partOfSpeech) {
    return undefined;
  }

  return PART_OF_SPEECH_PT[normalize(partOfSpeech)] ?? partOfSpeech;
}

/** Uma chamada isolada: nunca lança — falha, tempo esgotado ou corpo que não é JSON viram `null`. */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface ExampleInfo {
  example: string;
  partOfSpeech?: string | undefined;
}

/**
 * Frase de exemplo em inglês, da Wiktionary — a primeira encontrada entre as
 * definições da palavra, com a classe gramatical daquela mesma entrada (para
 * que os dois sempre descrevam a mesma acepção).
 */
async function fetchWiktionaryExample(word: string): Promise<ExampleInfo | null> {
  const data = (await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
  )) as { en?: unknown } | null;

  const entries = data?.en;

  if (!Array.isArray(entries)) {
    return null;
  }

  for (const entry of entries as Array<{ partOfSpeech?: string; definitions?: unknown }>) {
    for (const definition of (entry.definitions ?? []) as Array<{
      parsedExamples?: unknown;
      examples?: unknown;
    }>) {
      const examples = (definition.parsedExamples ?? definition.examples) as
        | unknown[]
        | undefined;

      for (const example of examples ?? []) {
        const text =
          typeof example === 'string' ? example : ((example as { example?: string })?.example ?? null);

        if (text) {
          return { example: stripTags(text), partOfSpeech: normalizePartOfSpeech(entry.partOfSpeech) };
        }
      }
    }
  }

  return null;
}

interface FreeDictionaryEntry {
  meanings?: Array<{
    partOfSpeech?: string;
    synonyms?: string[];
    definitions?: Array<{ example?: string }>;
  }>;
}

/**
 * Busca única no Free Dictionary API, compartilhada por
 * `pickBestMeaningSynonyms` (sinônimos por classe gramatical) e
 * `pickFallbackExample` (frase de exemplo, quando a Wiktionary não tem
 * nenhuma) — as duas derivam da mesma resposta, sem repetir a chamada.
 *
 * Esta API terceira é instável (observado em sessão de desenvolvimento:
 * `522` recorrente para algumas palavras específicas, `200` normal para
 * outras) — por isso nunca é a única fonte de nada.
 */
async function fetchFreeDictionaryEntry(word: string): Promise<FreeDictionaryEntry | null> {
  const data = (await fetchJson(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  )) as FreeDictionaryEntry[] | null;

  return Array.isArray(data) ? (data[0] ?? null) : null;
}

/**
 * Sinônimos agrupados por classe gramatical — cada classe (substantivo,
 * verbo, adjetivo...) traz só os sinônimos das próprias acepções, então já
 * chega bem menos misturado entre sentidos diferentes da palavra do que uma
 * busca por similaridade pura (ver `fetchSynonymsByRelation`, abaixo). Usa a
 * classe gramatical com mais sinônimos listados — proxy para "a acepção mais
 * documentada da palavra", o que evita pegar a classe gramatical rara (ex.:
 * o substantivo "fast" — o trem expresso — quando a palavra é bem mais
 * comum como adjetivo).
 */
function pickBestMeaningSynonyms(entry: FreeDictionaryEntry | null): string[] | null {
  const meanings = entry?.meanings;

  if (!Array.isArray(meanings)) {
    return null;
  }

  let best: string[] = [];

  for (const meaning of meanings) {
    const synonyms = meaning.synonyms ?? [];

    if (synonyms.length > best.length) {
      best = synonyms;
    }
  }

  // Menos de dois sinônimos não é sinal forte o bastante de que esta classe
  // gramatical é mesmo a acepção documentada da palavra — melhor deixar a
  // busca por similaridade (mais ampla, ainda que menos precisa) decidir.
  return best.length >= 2 ? best.slice(0, 3) : null;
}

/** Frase de exemplo alternativa, para quando a Wiktionary não tem nenhuma. */
function pickFallbackExample(entry: FreeDictionaryEntry | null): ExampleInfo | null {
  const meanings = entry?.meanings;

  if (!Array.isArray(meanings)) {
    return null;
  }

  for (const meaning of meanings) {
    for (const definition of meaning.definitions ?? []) {
      if (definition.example) {
        return { example: definition.example, partOfSpeech: normalizePartOfSpeech(meaning.partOfSpeech) };
      }
    }
  }

  return null;
}

/** Sinônimos por similaridade de sentido, do Datamuse — não distingue classe
 * gramatical nem acepção, então mistura sentidos diferentes da mesma palavra
 * com alguma frequência (ver `pickBestMeaningSynonyms`, preferida quando
 * disponível). No máximo 3, os mais relevantes. */
async function fetchSynonymsByRelation(word: string): Promise<string[] | null> {
  const data = (await fetchJson(
    `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=3`,
  )) as Array<{ word?: string }> | null;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const synonyms = data.map((entry) => entry.word).filter((word): word is string => Boolean(word));

  return synonyms.length > 0 ? synonyms : null;
}

/**
 * Traduz um texto (palavra ou frase) do inglês, pelo endpoint não-oficial do
 * Google Tradutor.
 *
 * Trocado de lugar da MyMemory (change `improve-dictionary-suggestion-quality`):
 * a cota gratuita da MyMemory é por IP, e o IP de saída de um serviço
 * hospedado (compartilhado entre vários outros clientes do mesmo provedor)
 * esgota essa cota rápido demais para o recurso funcionar de verdade. Este
 * endpoint não é documentado nem suportado oficialmente pelo Google — pode
 * mudar ou bloquear sem aviso — mas `fetchJson` já trata qualquer resposta
 * que não seja `200` (inclusive um `429` de bloqueio) como "sem tradução",
 * então uma eventual instabilidade aqui degrada como qualquer outro serviço
 * desta lista, nunca como erro.
 */
async function translateText(text: string, target: string): Promise<string | null> {
  const data = await fetchJson(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`,
  );

  const segments = Array.isArray(data) ? (data[0] as unknown) : null;

  if (!Array.isArray(segments)) {
    return null;
  }

  const translation = segments
    .map((segment) => (Array.isArray(segment) ? (segment[0] as unknown) : null))
    .filter((value): value is string => typeof value === 'string')
    .join('')
    .trim();

  return translation || null;
}

/** Tradução da palavra — descartada quando a "tradução" devolvida é a própria palavra. */
async function fetchTranslation(word: string, target: string): Promise<string | null> {
  const translation = await translateText(word, target);

  if (!translation || translation.toLowerCase() === word.trim().toLowerCase()) {
    return null;
  }

  return translation;
}

export interface FetchSuggestionInput {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Busca sugestão de tradução, frase de exemplo (com sua tradução) e
 * sinônimos para `word`.
 *
 * Nunca lança: cada serviço que falhar, expirar ou não trazer nada
 * aproveitável simplesmente não contribui. A tradução da frase de exemplo
 * depende de já ter uma frase (da Wiktionary ou do Free Dictionary API), por
 * isso sai depois da primeira leva de chamadas — todo o resto sai em
 * paralelo. Devolve `null` quando o par de idiomas não é reconhecido, a
 * palavra está vazia, ou nada de nenhum serviço veio.
 */
export async function fetchSuggestion({
  word,
  sourceLanguage,
  targetLanguage,
}: FetchSuggestionInput): Promise<DictionarySuggestion | null> {
  const trimmedWord = word.trim();
  const pair = resolveLanguagePair(sourceLanguage, targetLanguage);

  if (trimmedWord === '' || pair === null) {
    return null;
  }

  const [wiktionaryResult, freeDictResult, synonymsByRelationResult, translationResult] =
    await Promise.allSettled([
      fetchWiktionaryExample(trimmedWord),
      fetchFreeDictionaryEntry(trimmedWord),
      fetchSynonymsByRelation(trimmedWord),
      fetchTranslation(trimmedWord, pair.target),
    ]);

  const wiktionaryExample = wiktionaryResult.status === 'fulfilled' ? wiktionaryResult.value : null;
  const freeDictEntry = freeDictResult.status === 'fulfilled' ? freeDictResult.value : null;
  const synonymsByRelation =
    synonymsByRelationResult.status === 'fulfilled' ? synonymsByRelationResult.value : null;
  const translation = translationResult.status === 'fulfilled' ? translationResult.value : null;

  const exampleInfo = wiktionaryExample ?? pickFallbackExample(freeDictEntry);
  const synonyms = pickBestMeaningSynonyms(freeDictEntry) ?? synonymsByRelation;

  const exampleTranslation = exampleInfo
    ? await translateText(exampleInfo.example, pair.target)
    : null;

  if (!exampleInfo && !synonyms && !translation) {
    return null;
  }

  return {
    ...(translation && { translation }),
    ...(exampleInfo?.example && { exampleSentence: exampleInfo.example }),
    ...(exampleTranslation && { exampleTranslation }),
    ...(exampleInfo?.partOfSpeech && { partOfSpeech: exampleInfo.partOfSpeech }),
    ...(synonyms && { synonyms }),
  };
}
