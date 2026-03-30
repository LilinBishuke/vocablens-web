'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { extractVideoId } from '@/lib/youtube-utils';
import { useRecentVideosStore } from '@/lib/store';
import Image from 'next/image';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { videos, removeVideo, clearAll } = useRecentVideosStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }
    setError('');
    router.push(`/video/${videoId}`);
  };

  const handleRecentClick = (videoId: string) => {
    router.push(`/video/${videoId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Learn English from <span className="text-blue-500">YouTube</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Watch videos with vocabulary analysis, slang detection, and flashcards
          </p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              placeholder="Paste YouTube URL here..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium text-lg hover:bg-blue-600 transition-colors flex-shrink-0"
            >
              Analyze
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </form>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m10-4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            title="Vocabulary Levels"
            desc="Words colored by difficulty: CEFR, frequency, or 5-level"
          />
          <FeatureCard
            icon={<span className="text-2xl">&#128172;</span>}
            title="Slang & Idioms"
            desc="Detect informal expressions with explanations"
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="Flashcards"
            desc="SM-2 spaced repetition for effective memorization"
          />
        </div>

        {/* Recent Videos */}
        {videos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Videos
              </h2>
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2">
              {videos.map(video => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group"
                  onClick={() => handleRecentClick(video.videoId)}
                >
                  <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {video.authorName}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeVideo(video.videoId); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="text-blue-500 mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  );
}
