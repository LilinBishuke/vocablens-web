/**
 * Translation API client using server-side proxy to MyMemory.
 * Supports both single and batch translation with localStorage caching.
 */

const CACHE_KEY_PREFIX = 'trans_cache_';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function translateText(
  text: string,
  targetLang: string = 'ja'
): Promise<string | null> {
  if (!text?.trim()) return null;
  text = text.trim();
  if (targetLang === 'en') return null;

  const cached = getFromCache(text, targetLang);
  if (cached) return cached;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: 'en', to: targetLang }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.translation) {
      saveToCache(text, targetLang, data.translation);
      return data.translation;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch translate multiple texts in one API call.
 * Checks cache first, only sends uncached texts to the API.
 */
export async function translateBatch(
  texts: string[],
  targetLang: string = 'ja'
): Promise<(string | null)[]> {
  if (targetLang === 'en') return texts.map(() => null);

  const results: (string | null)[] = new Array(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // Check cache first
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]?.trim();
    if (!text) continue;

    const cached = getFromCache(text, targetLang);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  }

  // Batch translate uncached texts
  if (uncachedTexts.length > 0) {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: uncachedTexts, from: 'en', to: targetLang }),
      });

      if (response.ok) {
        const data = await response.json();
        const translations: (string | null)[] = data.translations || [];
        for (let j = 0; j < uncachedIndices.length; j++) {
          const translation = translations[j];
          if (translation) {
            results[uncachedIndices[j]] = translation;
            saveToCache(uncachedTexts[j], targetLang, translation);
          }
        }
      }
    } catch {
      // silently fail
    }
  }

  return results;
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(Math.abs(hash));
}

function getFromCache(text: string, lang: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = CACHE_KEY_PREFIX + lang + '_' + hashCode(text);
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

function saveToCache(text: string, lang: string, translation: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = CACHE_KEY_PREFIX + lang + '_' + hashCode(text);
    localStorage.setItem(key, JSON.stringify({ data: translation, timestamp: Date.now() }));
  } catch {
    // ignore
  }
}
