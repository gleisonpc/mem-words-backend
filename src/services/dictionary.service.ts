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

/** Frase de exemplo em inglês, da Wiktionary — a primeira encontrada entre as definições da palavra. */
async function fetchExampleSentence(word: string): Promise<string | null> {
  const data = (await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
  )) as { en?: unknown } | null;

  const entries = data?.en;

  if (!Array.isArray(entries)) {
    return null;
  }

  for (const entry of entries as Array<{ definitions?: unknown }>) {
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
          return stripTags(text);
        }
      }
    }
  }

  return null;
}

/** Sinônimos por similaridade de sentido, do Datamuse — no máximo 3, os mais relevantes. */
async function fetchSynonyms(word: string): Promise<string[] | null> {
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
 * Tradução da palavra, do endpoint não-oficial do Google Tradutor.
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
async function fetchTranslation(word: string, target: string): Promise<string | null> {
  const data = await fetchJson(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(word)}`,
  );

  const segments = Array.isArray(data) ? (data[0] as unknown) : null;

  if (!Array.isArray(segments)) {
    return null;
  }

  const translation = segments
    .map((segment) => (Array.isArray(segment) ? (segment[0] as unknown) : null))
    .filter((text): text is string => typeof text === 'string')
    .join('')
    .trim();

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
 * Busca sugestão de tradução, frase de exemplo e sinônimos para `word`.
 *
 * Nunca lança: cada serviço que falhar, expirar ou não trazer nada
 * aproveitável simplesmente não contribui — as três chamadas saem em
 * paralelo e a falta de uma não impede as outras. Devolve `null` quando o
 * par de idiomas não é reconhecido, a palavra está vazia, ou nenhum dos
 * três serviços trouxe algo.
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

  const [exampleResult, synonymsResult, translationResult] = await Promise.allSettled([
    fetchExampleSentence(trimmedWord),
    fetchSynonyms(trimmedWord),
    fetchTranslation(trimmedWord, pair.target),
  ]);

  const exampleSentence = exampleResult.status === 'fulfilled' ? exampleResult.value : null;
  const synonyms = synonymsResult.status === 'fulfilled' ? synonymsResult.value : null;
  const translation = translationResult.status === 'fulfilled' ? translationResult.value : null;

  if (!exampleSentence && !synonyms && !translation) {
    return null;
  }

  return {
    ...(translation && { translation }),
    ...(exampleSentence && { exampleSentence }),
    ...(synonyms && { synonyms }),
  };
}
