/**
 * Free Dictionary API client with localStorage caching.
 * API: https://dictionaryapi.dev/
 */

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const CACHE_KEY_PREFIX = 'dict_cache_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DictionaryEntry {
  word: string;
  phonetic: string;
  phonetics: { text: string; audio: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example: string;
      synonyms: string[];
    }[];
  }[];
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  word = word.toLowerCase().trim();

  const cached = getFromCache(word);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
    if (!response.ok) return null;

    const data = await response.json();
    const entry = parseDictionaryResponse(data);
    if (entry) {
      saveToCache(word, entry);
    }
    return entry;
  } catch (err) {
    console.error('Dictionary lookup failed:', err);
    return null;
  }
}

function parseDictionaryResponse(data: unknown): DictionaryEntry | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data[0];
  const result: DictionaryEntry = {
    word: entry.word,
    phonetic: entry.phonetic || '',
    phonetics: (entry.phonetics || [])
      .filter((p: { text?: string; audio?: string }) => p.text || p.audio)
      .map((p: { text?: string; audio?: string }) => ({ text: p.text || '', audio: p.audio || '' })),
    meanings: [],
  };

  for (const meaning of (entry.meanings || [])) {
    const m = {
      partOfSpeech: meaning.partOfSpeech || '',
      definitions: [] as { definition: string; example: string; synonyms: string[] }[],
    };

    for (const def of (meaning.definitions || []).slice(0, 3)) {
      m.definitions.push({
        definition: def.definition || '',
        example: def.example || '',
        synonyms: (def.synonyms || []).slice(0, 5),
      });
    }

    if (m.definitions.length > 0) {
      result.meanings.push(m);
    }
  }

  return result;
}

function getFromCache(word: string): DictionaryEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = CACHE_KEY_PREFIX + word;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function saveToCache(word: string, data: DictionaryEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const key = CACHE_KEY_PREFIX + word;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full - ignore
  }
}
