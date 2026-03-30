/**
 * Translation API client using server-side proxy to MyMemory.
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
  } catch (err) {
    console.error('Translation failed:', err);
    return null;
  }
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
