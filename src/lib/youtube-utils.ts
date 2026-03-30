/**
 * YouTube utility functions.
 */

/**
 * Extract video ID from a YouTube URL.
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  input = input.trim();

  // Already a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);

    // youtube.com/watch?v=ID
    if (url.hostname.includes('youtube.com') && url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }

    // youtu.be/ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null;
    }

    // youtube.com/embed/ID
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/')[2] || null;
    }

    // youtube.com/shorts/ID
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2] || null;
    }
  } catch {
    // Not a URL
  }

  return null;
}

/**
 * Get video info via oEmbed (title, thumbnail).
 */
export interface VideoInfo {
  title: string;
  thumbnailUrl: string;
  authorName: string;
}

export async function getVideoInfo(videoId: string): Promise<VideoInfo | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    return {
      title: data.title || '',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      authorName: data.author_name || '',
    };
  } catch {
    return null;
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS.
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
