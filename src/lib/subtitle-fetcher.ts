/**
 * Fetch YouTube subtitles.
 * Strategy: Client calls innertube API directly (no CORS issue for POST),
 * gets caption track URL, then proxies the XML fetch through our API.
 * Fallback: server-side discovery via /api/subtitles?videoId=
 */

export interface SubtitleSegment {
  start: number;
  duration: number;
  text: string;
}

export async function fetchSubtitles(
  videoId: string,
  lang: string = 'en'
): Promise<SubtitleSegment[]> {
  // Strategy 1: Client-side innertube → get caption URL → proxy XML via API
  try {
    const captionUrl = await getClientSideCaptionUrl(videoId, lang);
    if (captionUrl) {
      const response = await fetch(
        `/api/subtitles?captionUrl=${encodeURIComponent(captionUrl)}`
      );
      if (response.ok) {
        return response.json();
      }
    }
  } catch {
    // Fall through to server-side
  }

  // Strategy 2: Full server-side discovery (may fail on cloud IPs)
  const response = await fetch(
    `/api/subtitles?videoId=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch subtitles' }));
    throw new Error(error.error || 'Failed to fetch subtitles');
  }

  return response.json();
}

async function getClientSideCaptionUrl(
  videoId: string,
  lang: string
): Promise<string | null> {
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240313.05.00',
            hl: lang,
          },
        },
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) return null;

    // Pick best track
    let track = tracks.find((t: { languageCode: string }) => t.languageCode === lang);
    if (!track && lang !== 'en') {
      track = tracks.find((t: { languageCode: string }) => t.languageCode === 'en');
    }
    if (!track) track = tracks[0];
    if (!track) return null;

    const url = track.baseUrl;
    return url + (url.includes('?') ? '&' : '?') + 'fmt=srv3';
  } catch {
    return null;
  }
}
