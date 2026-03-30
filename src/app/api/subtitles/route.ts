import { NextRequest, NextResponse } from 'next/server';

interface SubtitleSegment {
  start: number;
  duration: number;
  text: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const captionUrl = searchParams.get('captionUrl');
  const lang = searchParams.get('lang') || 'en';

  // Mode 1: Proxy a known caption URL (from client-side innertube call)
  if (captionUrl) {
    return await fetchAndParseSubtitles(captionUrl);
  }

  // Mode 2: Server-side caption discovery (fallback)
  if (!videoId) {
    return NextResponse.json({ error: 'videoId or captionUrl is required' }, { status: 400 });
  }

  try {
    // Try innertube API from server
    const url = await getCaptionUrlFromInnertube(videoId, lang);
    if (url) {
      return await fetchAndParseSubtitles(url);
    }

    return NextResponse.json(
      { error: 'No captions available for this video. Try refreshing the page.' },
      { status: 404 }
    );
  } catch (err) {
    console.error('Subtitle fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error while fetching subtitles' },
      { status: 500 }
    );
  }
}

async function getCaptionUrlFromInnertube(videoId: string, lang: string): Promise<string | null> {
  const clients = [
    { clientName: 'WEB', clientVersion: '2.20240313.05.00', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    { clientName: 'ANDROID', clientVersion: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
  ];

  for (const { clientName, clientVersion, ua } of clients) {
    try {
      const playerResp = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': ua },
        body: JSON.stringify({
          videoId,
          context: { client: { clientName, clientVersion, hl: lang } },
        }),
      });
      if (!playerResp.ok) continue;

      const playerData = await playerResp.json();
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks?.length > 0) {
        return pickCaptionTrackUrl(tracks, lang);
      }
    } catch { continue; }
  }
  return null;
}

function pickCaptionTrackUrl(
  captionTracks: { languageCode: string; baseUrl: string }[],
  lang: string
): string | null {
  let track = captionTracks.find((t) => t.languageCode === lang);
  if (!track && lang !== 'en') track = captionTracks.find((t) => t.languageCode === 'en');
  if (!track) track = captionTracks[0];
  if (!track) return null;

  const url = track.baseUrl;
  return url + (url.includes('?') ? '&' : '?') + 'fmt=srv3';
}

async function fetchAndParseSubtitles(captionUrl: string) {
  const captionResp = await fetch(captionUrl);
  if (!captionResp.ok) {
    return NextResponse.json({ error: 'Failed to fetch caption track' }, { status: 502 });
  }
  const captionXml = await captionResp.text();
  return NextResponse.json(parseSubtitleXml(captionXml));
}

function parseSubtitleXml(xml: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let match;

  // srv3 format: <p t="ms" d="ms">...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  while ((match = pRegex.exec(xml)) !== null) {
    const text = decodeEntities(
      match[3].replace(/<s[^>]*>/g, '').replace(/<\/s>/g, ' ')
    ).trim();
    if (text) {
      segments.push({ start: parseInt(match[1]) / 1000, duration: parseInt(match[2]) / 1000, text });
    }
  }

  // srv1 fallback: <text start="s" dur="s">text</text>
  if (segments.length === 0) {
    const textRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const text = decodeEntities(match[3].replace(/<[^>]+>/g, '')).trim();
      if (text) {
        segments.push({ start: parseFloat(match[1]), duration: parseFloat(match[2]), text });
      }
    }
  }

  return segments;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\n/g, ' ').replace(/\s+/g, ' ');
}
