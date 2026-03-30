'use client';

import Link from 'next/link';
import { useSettingsStore, useFlashcardStore } from '@/lib/store';
import { useMemo, useState, useEffect } from 'react';

export default function Header() {
  const { darkMode, toggleDarkMode } = useSettingsStore();
  const cards = useFlashcardStore(s => s.cards);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const stats = useMemo(() => {
    if (!mounted) return { total: 0, due: 0 };
    const all = Object.values(cards);
    const now = Date.now();
    const due = all.filter(c => now >= c.sm2.nextReview).length;
    return { total: all.length, due };
  }, [cards, mounted]);

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-50 w-12 flex flex-col items-center py-3 gap-3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <Link href="/" className="text-blue-500 hover:text-blue-600 transition-colors" title="VocabLens Home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.5" fill="none"/>
          <path d="M15 15l5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </Link>

      <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />

      {/* Review */}
      <Link
        href="/review"
        className="relative p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500 transition-colors"
        title="Review"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {stats.due > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {stats.due > 9 ? '9+' : stats.due}
          </span>
        )}
      </Link>

      {/* Cards */}
      <Link
        href="/cards"
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-500 transition-colors"
        title={`Cards (${stats.total})`}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="2" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M7 6h6M7 9h6M7 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dark mode */}
      <button
        onClick={toggleDarkMode}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Toggle theme"
      >
        {darkMode ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-yellow-400">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-gray-600">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    </nav>
  );
}
