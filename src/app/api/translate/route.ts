import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from = 'en', to = 'ja' } = body;

    const texts: string[] = body.texts || (body.text ? [body.text] : []);

    if (texts.length === 0) {
      return NextResponse.json({ error: 'text or texts is required' }, { status: 400 });
    }

    const langPair = `${from}|${to}`;

    // Low concurrency + delay to avoid MyMemory rate limiting
    const CONCURRENCY = 3;
    const DELAY_BETWEEN_CHUNKS = 300; // ms
    const results: (string | null)[] = new Array(texts.length).fill(null);
    let quotaExceeded = false;

    for (let i = 0; i < texts.length; i += CONCURRENCY) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_CHUNKS));
      }

      const chunk = texts.slice(i, i + CONCURRENCY);
      const promises = chunk.map(async (text, j) => {
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
          const resp = await fetch(url);

          if (resp.status === 429 || resp.status === 403) {
            // Wait and retry once
            await new Promise(r => setTimeout(r, 2000));
            const retry = await fetch(url);
            if (retry.status === 403) {
              // Still 403 after retry = quota exhausted (not a transient block)
              quotaExceeded = true;
              return;
            }
            if (!retry.ok) return;
            const retryData = await retry.json();
            const retryText = retryData?.responseData?.translatedText;
            if (retryText && retryText !== text) {
              results[i + j] = retryText;
            }
            return;
          }

          if (!resp.ok) return;

          const data = await resp.json();
          const translated = data?.responseData?.translatedText;
          // Also detect quota warning in response body
          if (translated && translated !== text && translated !== text.replace(/ /g, '-')) {
            if (translated.includes('MYMEMORY WARNING') || translated.includes('YOU USED ALL')) {
              quotaExceeded = true;
              return;
            }
            results[i + j] = translated;
          }
        } catch {
          // skip
        }
      });
      await Promise.all(promises);

      // Stop processing if quota is exhausted
      if (quotaExceeded) break;
    }

    if (body.texts) {
      return NextResponse.json({ translations: results, quotaExceeded });
    } else {
      return NextResponse.json({ translation: results[0], quotaExceeded });
    }
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
