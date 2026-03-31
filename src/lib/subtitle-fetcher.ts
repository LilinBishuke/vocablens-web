/**
 * Fetch YouTube subtitles via server-side API route.
 * Includes localStorage caching and automatic retry for rate-limited requests.
 */

export interface SubtitleSegment {
  start: number;
  duration: number;
  text: string;
}

const CACHE_PREFIX = 'sub_cache_';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchSubtitles(
  videoId: string,
  lang: string = 'en'
): Promise<SubtitleSegment[]> {
  // Check localStorage cache first
  const cached = getFromCache(videoId, lang);
  if (cached) return cached;

  // Try with automatic retry
  const maxRetries = 2;
  let lastError = 'Failed to fetch subtitles';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, attempt * 2000));
    }

    const response = await fetch(
      `/api/subtitles?videoId=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`
    );

    if (response.ok) {
      const subtitles: SubtitleSegment[] = await response.json();
      // Cache successful response
      saveToCache(videoId, lang, subtitles);
      return subtitles;
    }

    const data = await response.json().catch(() => ({ error: 'Unknown error', retryable: false }));
    lastError = data.error || `HTTP ${response.status}`;

    // Don't retry 404 (video truly has no captions)
    if (response.status === 404) {
      throw new Error(lastError);
    }

    // Retry on 429, 503, 502, 500
    if (data.retryable && attempt < maxRetries) {
      continue;
    }

    // Non-retryable error
    break;
  }

  throw new Error(lastError);
}

function getFromCache(videoId: string, lang: string): SubtitleSegment[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = CACHE_PREFIX + videoId + '_' + lang;
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

function saveToCache(videoId: string, lang: string, subtitles: SubtitleSegment[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = CACHE_PREFIX + videoId + '_' + lang;
    localStorage.setItem(key, JSON.stringify({ data: subtitles, timestamp: Date.now() }));
  } catch {
    // Storage full — ignore
  }
}
