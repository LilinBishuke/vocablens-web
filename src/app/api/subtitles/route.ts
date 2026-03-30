import { NextRequest, NextResponse } from 'next/server';

interface SubtitleSegment {
  start: number;
  duration: number;
  text: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const lang = searchParams.get('lang') || 'en';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    // Strategy 1: Scrape YouTube watch page for caption URLs
    // More reliable from cloud IPs than innertube API
    const captionUrl = await getCaptionUrlFromPage(videoId, lang);

    if (!captionUrl) {
      // Strategy 2: Fallback to innertube API with multiple clients
      const captionUrlFallback = await getCaptionUrlFromInnertube(videoId, lang);
      if (!captionUrlFallback) {
        return NextResponse.json(
          { error: 'No captions available for this video' },
          { status: 404 }
        );
      }
      return await fetchAndParseSubtitles(captionUrlFallback);
    }

    return await fetchAndParseSubtitles(captionUrl);
  } catch (err) {
    console.error('Subtitle fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error while fetching subtitles' },
      { status: 500 }
    );
  }
}

async function getCaptionUrlFromPage(videoId: string, lang: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!resp.ok) return null;

    const html = await resp.text();

    // Extract ytInitialPlayerResponse JSON
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var|<\/script)/);
    if (!match) return null;

    const playerData = JSON.parse(match[1]);
    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) return null;

    return pickCaptionTrackUrl(captionTracks, lang);
  } catch {
    return null;
  }
}

async function getCaptionUrlFromInnertube(videoId: string, lang: string): Promise<string | null> {
  const clients = [
    { clientName: 'WEB', clientVersion: '2.20240313.05.00', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
    { clientName: 'ANDROID', clientVersion: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
    { clientName: 'IOS', clientVersion: '19.29.1', ua: 'com.google.ios.youtube/19.29.1' },
  ];

  for (const { clientName, clientVersion, ua } of clients) {
    try {
      const playerResp = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': ua,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: { clientName, clientVersion, hl: lang },
          },
        }),
      });

      if (!playerResp.ok) continue;

      const playerData = await playerResp.json();
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        const url = pickCaptionTrackUrl(tracks, lang);
        if (url) return url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function pickCaptionTrackUrl(
  captionTracks: { languageCode: string; baseUrl: string }[],
  lang: string
): string | null {
  let track = captionTracks.find((t) => t.languageCode === lang);
  if (!track && lang !== 'en') {
    track = captionTracks.find((t) => t.languageCode === 'en');
  }
  if (!track) {
    track = captionTracks[0];
  }
  if (!track) return null;

  // Request srv3 format for word-level timing
  const url = track.baseUrl;
  return url + (url.includes('?') ? '&' : '?') + 'fmt=srv3';
}

async function fetchAndParseSubtitles(captionUrl: string) {
  const captionResp = await fetch(captionUrl);
  if (!captionResp.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch caption track' },
      { status: 502 }
    );
  }

  const captionXml = await captionResp.text();
  const subtitles = parseSubtitleXml(captionXml);
  return NextResponse.json(subtitles);
}

function parseSubtitleXml(xml: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];

  // Try srv3 format: <p t="ms" d="ms"><s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;

  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1]);
    const durationMs = parseInt(match[2]);

    let text = match[3];
    text = text.replace(/<s[^>]*>/g, '').replace(/<\/s>/g, ' ');
    text = decodeEntities(text).trim();

    if (text) {
      segments.push({
        start: startMs / 1000,
        duration: durationMs / 1000,
        text,
      });
    }
  }

  // Fallback: try srv1 format <text start="s" dur="s">text</text>
  if (segments.length === 0) {
    const textRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = decodeEntities(match[3].replace(/<[^>]+>/g, '')).trim();

      if (text) {
        segments.push({ start, duration, text });
      }
    }
  }

  return segments;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');
}
