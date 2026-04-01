'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SubtitleSegment } from '@/lib/subtitle-fetcher';
import { processText } from '@/lib/text-processor';
import { classifyWord, type ClassificationSystem } from '@/lib/classifier';
import { detectSlang, type SlangMatch } from '@/lib/slang-detector';
import { detectIdioms, type IdiomMatch } from '@/lib/idiom-detector';
import { translateBatch } from '@/lib/translation-api';
import { formatTime } from '@/lib/youtube-utils';
import { useSettingsStore } from '@/lib/store';

interface SubtitleTimelineProps {
  subtitles: SubtitleSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  onWordClick: (word: string, context: string) => void;
  copyAllRef?: React.MutableRefObject<(() => void) | null>;
}

interface AnnotatedSegment extends SubtitleSegment {
  translation?: string;
  slangMatches?: SlangMatch[];
  idiomMatches?: IdiomMatch[];
  wordLevels?: Map<string, string | null>;
}

const LEVEL_COLORS: Record<string, string> = {
  '1': '#22c55e',
  '2': '#eab308',
  '3': '#f97316',
  '4': '#ef4444',
  '5': '#a855f7',
};

export default function SubtitleTimeline({
  subtitles,
  currentTime,
  onSeek,
  onWordClick,
  copyAllRef,
}: SubtitleTimelineProps) {
  const TRANSLATE_BATCH = 50;
  const TRANSLATE_AHEAD = 30; // start next batch when within this many segments of the end

  const [annotated, setAnnotated] = useState<AnnotatedSegment[]>([]);
  const [translations, setTranslations] = useState<(string | null)[]>([]);
  const [translating, setTranslating] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [translatingRange, setTranslatingRange] = useState<[number, number] | null>(null);
  const translatedUpToRef = useRef(0);
  const isFetchingRef = useRef(false);
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    showTranslation,
    showVocab,
    showSlang,
    showIdiom,
    classificationSystem,
    minLevel,
    nativeLanguage,
  } = useSettingsStore();

  // Fetch a batch of translations starting at fromIndex
  const fetchTranslationBatch = useCallback(async (fromIndex: number, cancelled: { value: boolean }) => {
    if (isFetchingRef.current) return;
    if (fromIndex >= subtitles.length) return;

    isFetchingRef.current = true;
    const toIndex = Math.min(fromIndex + TRANSLATE_BATCH, subtitles.length);
    setTranslating(true);
    setTranslatingRange([fromIndex, toIndex]);

    const batch = subtitles.slice(fromIndex, toIndex).map(s => s.text);

    const { translations: batchResults, quotaExceeded } = await translateBatch(batch, nativeLanguage);

    if (!cancelled.value) {
      setTranslations(prev => {
        const next = [...prev];
        for (let i = 0; i < batchResults.length; i++) {
          next[fromIndex + i] = batchResults[i];
        }
        return next;
      });
      translatedUpToRef.current = toIndex;

      if (quotaExceeded) {
        setQuotaExhausted(true);
      }
    }

    isFetchingRef.current = false;
    if (!cancelled.value) {
      setTranslating(false);
      setTranslatingRange(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitles, nativeLanguage]);

  // Reset and load first batch when subtitles change
  useEffect(() => {
    const cancelled = { value: false };
    if (subtitles.length === 0) return;

    translatedUpToRef.current = 0;
    isFetchingRef.current = false;
    setTranslations(new Array(subtitles.length).fill(null));
    setQuotaExhausted(false);
    fetchTranslationBatch(0, cancelled);

    return () => { cancelled.value = true; };
  }, [subtitles, nativeLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more translations as playback advances
  useEffect(() => {
    if (quotaExhausted) return;
    if (isFetchingRef.current) return;

    const currentIndex = subtitles.findIndex(
      seg => currentTime >= seg.start && currentTime < seg.start + seg.duration
    );
    if (currentIndex < 0) return;

    const needsMore = currentIndex + TRANSLATE_AHEAD >= translatedUpToRef.current;
    if (needsMore && translatedUpToRef.current < subtitles.length) {
      const cancelled = { value: false };
      fetchTranslationBatch(translatedUpToRef.current, cancelled);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  // Annotate subtitles (vocab/slang/idiom — no translation here)
  useEffect(() => {
    let cancelled = false;

    async function annotate() {
      const results: AnnotatedSegment[] = await Promise.all(
        subtitles.map(async (seg) => {
          const entry: AnnotatedSegment = { ...seg };
          const promises: Promise<void>[] = [];

          if (showSlang) {
            promises.push(
              detectSlang(seg.text).then(matches => { entry.slangMatches = matches; })
            );
          }

          if (showIdiom) {
            promises.push(
              detectIdioms(seg.text).then(matches => { entry.idiomMatches = matches; })
            );
          }

          if (showVocab) {
            const wordCounts = processText(seg.text);
            const levels = new Map<string, string | null>();
            for (const [word] of wordCounts) {
              levels.set(word, classifyWord(word, classificationSystem as ClassificationSystem));
            }
            entry.wordLevels = levels;
          }

          await Promise.all(promises);
          return entry;
        })
      );

      if (!cancelled) {
        setAnnotated(results);
      }
    }

    annotate();
    return () => { cancelled = true; };
  }, [subtitles, showVocab, showSlang, showIdiom, classificationSystem, minLevel]);

  const { autoFollow } = useSettingsStore();

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (!autoFollow) return;
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, autoFollow]);

  const renderAnnotatedText = useCallback((seg: AnnotatedSegment) => {
    const text = seg.text;
    const words = text.split(/(\s+)/);

    return words.map((word, i) => {
      if (/^\s+$/.test(word)) return <span key={i}> </span>;

      const cleanWord = word.toLowerCase().replace(/[^a-z']/g, '');

      // Check slang
      const slangMatch = seg.slangMatches?.find(m =>
        m.key === cleanWord || text.toLowerCase().indexOf(m.key) !== -1
      );

      // Check idiom (simplified - check if word is part of an idiom match)
      const idiomMatch = seg.idiomMatches?.find(m =>
        m.match.toLowerCase().includes(cleanWord)
      );

      // Check vocab level
      const level = seg.wordLevels?.get(cleanWord);
      const levelNum = level ? parseInt(level) : 0;
      const shouldHighlight = showVocab && level && levelNum >= minLevel;

      let className = 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded px-0.5 transition-colors';
      let style: React.CSSProperties = {};

      if (showSlang && slangMatch) {
        className += ' border-b-2 border-dotted border-purple-500';
      }

      if (showIdiom && idiomMatch) {
        className += ' border-b-2 border-blue-500';
        style.textDecorationStyle = 'wavy';
      }

      if (shouldHighlight && level) {
        style.color = LEVEL_COLORS[level] || undefined;
        style.fontWeight = 600;
      }

      return (
        <span
          key={i}
          className={className}
          style={style}
          onClick={() => onWordClick(cleanWord, seg.text)}
          title={
            slangMatch ? `Slang: ${slangMatch.entry.meaning}` :
            idiomMatch ? `Idiom: ${idiomMatch.entry.meaning}` :
            level ? `Level ${level}` : undefined
          }
        >
          {word}
        </span>
      );
    });
  }, [showVocab, showSlang, showIdiom, minLevel, onWordClick]);

  const activeIndex = annotated.findIndex(
    seg => currentTime >= seg.start && currentTime < seg.start + seg.duration
  );

  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyLine = useCallback((text: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedLine(index);
    setTimeout(() => setCopiedLine(null), 1500);
  }, []);

  const copyAll = useCallback(() => {
    const fullText = annotated.map(s => `${formatTime(s.start)}  ${s.text}`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [annotated]);

  // Expose copyAll to parent
  useEffect(() => {
    if (copyAllRef) copyAllRef.current = copyAll;
  }, [copyAll, copyAllRef]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="space-y-1 p-4">
        {annotated.map((seg, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              className={`group flex gap-3 p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : ''
              }`}
            >
              <span
                className="text-xs text-blue-500 hover:text-blue-600 font-mono whitespace-nowrap pt-0.5 w-12 flex-shrink-0 cursor-pointer hover:underline"
                onClick={() => onSeek(seg.start)}
              >
                {formatTime(seg.start)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {showVocab || showSlang || showIdiom ? renderAnnotatedText(seg) : seg.text}
                </p>
                {showTranslation && translations[i] && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {translations[i]}
                  </p>
                )}
                {showTranslation && !translations[i] && translating && translatingRange && i < translatingRange[1] && (
                  <div
                    className="mt-1.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                    style={{ width: `${35 + (i % 7) * 7}%` }}
                  />
                )}
              </div>
              {/* Line copy button */}
              <button
                onClick={(e) => copyLine(seg.text, i, e)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-blue-500"
                title="コピー"
              >
                {copiedLine === i ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                )}
              </button>
            </div>
          );
        })}

        {annotated.length === 0 && subtitles.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Analyzing subtitles...</span>
          </div>
        )}
        {showTranslation && translating && annotated.length > 0 && (
          <div className="flex items-center justify-center py-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-xs text-gray-500">翻訳を読み込み中...</span>
          </div>
        )}
        {showTranslation && quotaExhausted && (
          <div className="flex items-center justify-center py-3 gap-1.5 text-amber-500">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>
            <span className="text-xs">翻訳の無料枠を使い切りました。明日また利用できます。</span>
          </div>
        )}
      </div>
    </div>
  );
}
