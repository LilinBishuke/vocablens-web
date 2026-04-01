'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import YouTubePlayer from '@/components/YouTubePlayer';
import SubtitleTimeline from '@/components/SubtitleTimeline';
import ToggleBar from '@/components/ToggleBar';
import WordDetailPanel from '@/components/WordDetailPanel';
import Header from '@/components/Header';
import { fetchSubtitles, type SubtitleSegment } from '@/lib/subtitle-fetcher';
import { getVideoInfo, type VideoInfo } from '@/lib/youtube-utils';
import { ensureLoaded } from '@/lib/classifier';
import { useRecentVideosStore } from '@/lib/store';
import type { YTPlayer } from '@/lib/youtube-player';

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('horizontal');
  const [copiedAll, setCopiedAll] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const copyAllRef = useRef<(() => void) | null>(null);
  const addRecentVideo = useRecentVideosStore(s => s.addVideo);

  // Load video info on mount
  useEffect(() => {
    if (!videoId) return;
    getVideoInfo(videoId).then(info => {
      setVideoInfo(info);
      if (info) {
        addRecentVideo({
          videoId,
          title: info.title,
          thumbnailUrl: info.thumbnailUrl,
          authorName: info.authorName,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Manual subtitle loading
  const loadSubtitles = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    try {
      await ensureLoaded();
      const subs = await fetchSubtitles(videoId, 'en');
      setSubtitles(subs);
    } catch (err) {
      setError((err as Error).message || 'Failed to load subtitles');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const handleSeek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
  }, []);

  const handleWordClick = useCallback((word: string, context: string) => {
    setSelectedWord(word);
    setSelectedContext(context);
    setShowPanel(true);
  }, []);

  const hasSubtitles = subtitles.length > 0;
  const isHorizontal = layout === 'horizontal';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />

      <div className="mx-auto px-1.5">
        {/* Title + layout toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="min-w-0 flex-1">
            {videoInfo && (
              <>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{videoInfo.title}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{videoInfo.authorName}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {/* Layout toggle */}
            <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setLayout('horizontal')}
                className={`p-1.5 ${isHorizontal ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="横並び"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              </button>
              <button
                onClick={() => setLayout('vertical')}
                className={`p-1.5 ${!isHorizontal ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                title="縦並び"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="1" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="2" y="9" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`flex gap-3 h-[calc(100vh-60px)] ${isHorizontal ? 'flex-row' : 'flex-col'}`}>
          {/* Left/Top: Video Player */}
          <div className={`flex-shrink-0 ${isHorizontal ? 'w-2/3' : ''}`}>
            <div className={`bg-black ${!isHorizontal ? 'max-w-2xl mx-auto' : ''}`}>
              <YouTubePlayer
                videoId={videoId}
                onTimeUpdate={setCurrentTime}
                playerRef={playerRef}
              />
            </div>
          </div>

          {/* Right/Bottom: Subtitles */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Toggle bar + load button */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
              <ToggleBar />
              <div className="flex items-center gap-1 ml-auto pr-2 flex-shrink-0">
                {!hasSubtitles && (
                  <button
                    onClick={loadSubtitles}
                    disabled={loading}
                    className="px-3 py-1 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {loading ? '読込中...' : '字幕を分析'}
                  </button>
                )}
                {hasSubtitles && (
                  <button
                    onClick={() => { copyAllRef.current?.(); setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1500); }}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
                  >
                    {copiedAll ? (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                    全コピー
                  </button>
                )}
              </div>
            </div>

            {/* Subtitle timeline */}
            <div
              className="flex-1 overflow-hidden"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">字幕を取得中...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                  <p className="text-sm text-gray-500 text-center">{error}</p>
                  <button onClick={loadSubtitles} className="text-xs text-blue-500 hover:underline">再試行</button>
                </div>
              ) : !hasSubtitles ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-gray-400">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m10-4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <p className="text-sm">「字幕を分析」で字幕を読み込みます</p>
                </div>
              ) : (
                <SubtitleTimeline
                  subtitles={subtitles}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onWordClick={handleWordClick}
                  copyAllRef={copyAllRef}
                />
              )}
            </div>
          </div>
        </div>

        {/* Word Detail Panel (overlay on right) */}
        {showPanel && (
          <div className="fixed right-0 top-0 bottom-0 w-72 z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <WordDetailPanel
              word={selectedWord}
              context={selectedContext}
              onClose={() => setShowPanel(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
