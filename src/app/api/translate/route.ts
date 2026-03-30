import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, from = 'en', to = 'ja' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const langPair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      return NextResponse.json({ error: 'Translation service error' }, { status: 502 });
    }

    const data = await resp.json();
    const translation = data?.responseData?.translatedText;

    if (!translation) {
      return NextResponse.json({ error: 'No translation available' }, { status: 404 });
    }

    return NextResponse.json({ translation });
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
