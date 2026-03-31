import { NextRequest, NextResponse } from 'next/server';

interface SubtitleSegment {
  start: number;
  duration: number;
  text: string;
}

type CaptionResult =
  | { type: 'success'; url: string }
  | { type: 'not_found' }
  | { type: 'rate_limited'; status: number }
  | { type: 'error'; status: number; message: string };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const lang = searchParams.get('lang') || 'en';

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '';

  try {
    const result = await getCaptionUrl(videoId, lang, clientIp);

    if (result.type === 'not_found') {
      return NextResponse.json(
        { error: 'No captions available for this video' },
        { status: 404 }
      );
    }

    if (result.type === 'rate_limited') {
      return NextResponse.json(
        { error: 'YouTube API rate limited. Please try again in a few seconds.', retryable: true },
        { status: 429, headers: { 'Retry-After': '5' } }
      );
    }

    if (result.type === 'error') {
      return NextResponse.json(
        { error: `YouTube API error: ${result.message}`, retryable: true },
        { status: 503, headers: { 'Retry-After': '3' } }
      );
    }

    // Success — fetch the caption XML
    const captionResp = await fetch(result.url);
    if (!captionResp.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch caption track', retryable: true },
        { status: 502 }
      );
    }

    const xml = await captionResp.text();
    const subtitles = parseSubtitleXml(xml);

    return new NextResponse(JSON.stringify(subtitles), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('Subtitle fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error', retryable: true },
      { status: 500 }
    );
  }
}

async function getCaptionUrl(videoId: string, lang: string, clientIp: string): Promise<CaptionResult> {
  const clients = [
    {
      clientName: 'ANDROID',
      clientVersion: '20.10.38',
      ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    },
    {
      clientName: 'ANDROID_EMBEDDED_PLAYER',
      clientVersion: '20.10.38',
      ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    },
    {
      clientName: 'WEB',
      clientVersion: '2.20240313.05.00',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientVersion: '2.0',
      ua: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.5)',
    },
  ];

  let lastHttpStatus = 0;
  let hadResponse = false;    // At least one client got a valid response
  let hadRateLimit = false;   // At least one client got 429/403

  for (const { clientName, clientVersion, ua } of clients) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': ua,
      };
      if (clientIp) {
        headers['X-Forwarded-For'] = clientIp;
      }

      const resp = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          videoId,
          context: {
            client: { clientName, clientVersion, hl: lang },
          },
        }),
      });

      lastHttpStatus = resp.status;

      if (resp.status === 429) {
        hadRateLimit = true;
        console.log(`[subtitles] ${clientName}: 429 rate limited`);
        continue;
      }

      if (resp.status === 403) {
        hadRateLimit = true;
        console.log(`[subtitles] ${clientName}: 403 forbidden`);
        continue;
      }

      if (!resp.ok) {
        console.log(`[subtitles] ${clientName}: HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      hadResponse = true;

      if (tracks?.length > 0) {
        let track = tracks.find((t: { languageCode: string }) => t.languageCode === lang);
        if (!track && lang !== 'en') {
          track = tracks.find((t: { languageCode: string }) => t.languageCode === 'en');
        }
        if (!track) track = tracks[0];
        if (!track) continue;

        const url = track.baseUrl;
        console.log(`[subtitles] ${clientName}: found ${tracks.length} tracks for ${videoId}`);
        return { type: 'success', url: url + (url.includes('?') ? '&' : '?') + 'fmt=srv3' };
      } else {
        console.log(`[subtitles] ${clientName}: response OK but 0 caption tracks`);
      }
    } catch (err) {
      console.log(`[subtitles] ${clientName}: exception - ${err}`);
      continue;
    }
  }

  // All clients failed — determine why
  if (hadRateLimit) {
    return { type: 'rate_limited', status: lastHttpStatus };
  }

  if (!hadResponse) {
    return { type: 'error', status: lastHttpStatus, message: `All clients failed (last HTTP ${lastHttpStatus})` };
  }

  // Got valid responses but no caption tracks → video truly has no captions
  return { type: 'not_found' };
}

function parseSubtitleXml(xml: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let match;

  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  while ((match = pRegex.exec(xml)) !== null) {
    const text = decodeEntities(
      match[3].replace(/<s[^>]*>/g, '').replace(/<\/s>/g, ' ')
    ).trim();
    if (text) {
      segments.push({ start: parseInt(match[1]) / 1000, duration: parseInt(match[2]) / 1000, text });
    }
  }

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
