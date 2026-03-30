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
    // Step 1: Get caption track URLs via innertube API
    // Try multiple client types — cloud IPs may be blocked by some
    const clients = [
      { clientName: 'WEB', clientVersion: '2.20240313.05.00' },
      { clientName: 'ANDROID', clientVersion: '20.10.38' },
      { clientName: 'IOS', clientVersion: '19.29.1' },
    ];

    let captionTracks = null;

    for (const client of clients) {
      try {
        const playerResp = await fetch('https://www.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.clientName === 'WEB'
              ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              : `com.google.android.youtube/${client.clientVersion} (Linux; U; Android 14)`,
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                ...client,
                hl: lang,
              },
            },
          }),
        });

        if (!playerResp.ok) continue;

        const playerData = await playerResp.json();
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (tracks && tracks.length > 0) {
          captionTracks = tracks;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      return NextResponse.json(
        { error: 'No captions available for this video' },
        { status: 404 }
      );
    }

    // Step 2: Find the requested language track
    let track = captionTracks.find(
      (t: { languageCode: string }) => t.languageCode === lang
    );

    // Fallback: try English if requested lang not found
    if (!track && lang !== 'en') {
      track = captionTracks.find(
        (t: { languageCode: string }) => t.languageCode === 'en'
      );
    }

    // Fallback: use the first available track
    if (!track) {
      track = captionTracks[0];
    }

    // Step 3: Fetch the caption XML (format 3 gives word-level timing)
    let captionUrl = track.baseUrl;
    // Request format 3 (word-level) first, fall back to default
    const fmt3Url = captionUrl + (captionUrl.includes('?') ? '&' : '?') + 'fmt=srv3';

    const captionResp = await fetch(fmt3Url);
    if (!captionResp.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch caption track' },
        { status: 502 }
      );
    }

    const captionXml = await captionResp.text();

    // Step 4: Parse the XML
    const subtitles = parseSubtitleXml(captionXml);

    return NextResponse.json(subtitles);
  } catch (err) {
    console.error('Subtitle fetch error:', err);
    return NextResponse.json(
      { error: 'Internal server error while fetching subtitles' },
      { status: 500 }
    );
  }
}

function parseSubtitleXml(xml: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];

  // Try srv3 format: <p t="ms" d="ms"><s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match;

  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1]);
    const durationMs = parseInt(match[2]);

    // Extract text from <s> tags or raw text
    let text = match[3];
    // Remove <s> tags but keep content
    text = text.replace(/<s[^>]*>/g, '').replace(/<\/s>/g, ' ');
    // Clean up HTML entities
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
