import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from = 'en', to = 'ja' } = body;

    // Support batch: { texts: string[] } or single: { text: string }
    const texts: string[] = body.texts || (body.text ? [body.text] : []);

    if (texts.length === 0) {
      return NextResponse.json({ error: 'text or texts is required' }, { status: 400 });
    }

    const langPair = `${from}|${to}`;

    // Translate in parallel (max 10 concurrent)
    const CONCURRENCY = 10;
    const results: (string | null)[] = new Array(texts.length).fill(null);

    for (let i = 0; i < texts.length; i += CONCURRENCY) {
      const chunk = texts.slice(i, i + CONCURRENCY);
      const promises = chunk.map(async (text, j) => {
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
          const resp = await fetch(url);
          if (!resp.ok) {
            console.error(`MyMemory HTTP ${resp.status} for: ${text.slice(0, 30)}`);
            return;
          }
          const data = await resp.json();
          const translated = data?.responseData?.translatedText;
          // MyMemory sometimes returns the same text or hyphenated version - skip those
          if (translated && translated !== text && translated !== text.replace(/ /g, '-')) {
            results[i + j] = translated;
          }
        } catch (err) {
          console.error(`Translation error for: ${text.slice(0, 30)}`, err);
        }
      });
      await Promise.all(promises);
    }

    // Return batch or single format
    if (body.texts) {
      return NextResponse.json({ translations: results });
    } else {
      return NextResponse.json({ translation: results[0] });
    }
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
