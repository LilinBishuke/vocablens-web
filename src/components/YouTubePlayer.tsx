'use client';

import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeAPI, type YTPlayer } from '@/lib/youtube-player';

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
  playerRef?: React.MutableRefObject<YTPlayer | null>;
}

export default function YouTubePlayer({ videoId, onTimeUpdate, onReady, playerRef }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalPlayerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTracking = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const player = internalPlayerRef.current;
      if (player && onTimeUpdate) {
        try {
          const time = player.getCurrentTime();
          onTimeUpdate(time);
        } catch {
          // Player may not be ready
        }
      }
    }, 500);
  }, [onTimeUpdate]);

  const stopTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let player: YTPlayer | null = null;

    async function init() {
      await loadYouTubeAPI();

      if (!containerRef.current) return;

      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-player-' + videoId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      player = new window.YT.Player(playerDiv.id, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          cc_load_policy: 0,
          controls: 1,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            internalPlayerRef.current = player;
            if (playerRef) playerRef.current = player;
            onReady?.();
            startTracking();
          },
          onStateChange: (event) => {
            if (event.data === 1) { // PLAYING
              startTracking();
            } else if (event.data === 2 || event.data === 0) { // PAUSED or ENDED
              stopTracking();
              if (onTimeUpdate && player) {
                try { onTimeUpdate(player.getCurrentTime()); } catch { /* */ }
              }
            }
          },
        },
      });
    }

    init();

    return () => {
      stopTracking();
      if (player) {
        try { player.destroy(); } catch { /* */ }
      }
      internalPlayerRef.current = null;
      if (playerRef) playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div ref={containerRef} className="w-full aspect-video bg-black rounded-lg overflow-hidden" />
  );
}
