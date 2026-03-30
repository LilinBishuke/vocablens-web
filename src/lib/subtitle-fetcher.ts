/**
 * Fetch YouTube subtitles via server-side API route.
 */

export interface SubtitleSegment {
  start: number;  // seconds
  duration: number; // seconds
  text: string;
}

export async function fetchSubtitles(
  videoId: string,
  lang: string = 'en'
): Promise<SubtitleSegment[]> {
  const response = await fetch(
    `/api/subtitles?videoId=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch subtitles' }));
    throw new Error(error.error || 'Failed to fetch subtitles');
  }

  return response.json();
}
