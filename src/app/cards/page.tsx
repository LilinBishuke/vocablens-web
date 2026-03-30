'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { useFlashcardStore, type Flashcard } from '@/lib/store';
import { getNextReviewLabel } from '@/lib/spaced-repetition';
import Link from 'next/link';

export default function CardsPage() {
  const { cards, removeCard, searchCards, setCardLearned } = useFlashcardStore();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'alpha' | 'due'>('newest');
  const [filter, setFilter] = useState<'all' | 'due' | 'learned'>('all');

  const allCards = useMemo(() => Object.values(cards), [cards]);

  const filteredCards = useMemo(() => {
    let result = query ? searchCards(query) : allCards;

    if (filter === 'due') {
      result = result.filter(c => Date.now() >= c.sm2.nextReview);
    } else if (filter === 'learned') {
      result = result.filter(c => c.learned);
    }

    switch (sortBy) {
      case 'newest':
        return [...result].sort((a, b) => b.createdAt - a.createdAt);
      case 'alpha':
        return [...result].sort((a, b) => a.word.localeCompare(b.word));
      case 'due':
        return [...result].sort((a, b) => a.sm2.nextReview - b.sm2.nextReview);
    }
  }, [allCards, query, sortBy, filter, searchCards]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Flashcards
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({allCards.length} total)
            </span>
          </h1>
          <Link
            href="/review"
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Start Review
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cards..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filter}
            onChange={e => setFilter(e.target.value as 'all' | 'due' | 'learned')}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All</option>
            <option value="due">Due</option>
            <option value="learned">Learned</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'newest' | 'alpha' | 'due')}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="alpha">A-Z</option>
            <option value="due">Due soonest</option>
          </select>
        </div>

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">
              {allCards.length === 0
                ? 'No flashcards yet. Watch a video and click words to add them!'
                : 'No cards match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map(card => (
              <CardRow
                key={card.word}
                card={card}
                onRemove={() => removeCard(card.word)}
                onToggleLearned={() => setCardLearned(card.word, !card.learned)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardRow({
  card,
  onRemove,
  onToggleLearned,
}: {
  card: Flashcard;
  onRemove: () => void;
  onToggleLearned: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDue = Date.now() >= card.sm2.nextReview;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{card.word}</span>
            {card.translation && (
              <span className="text-sm text-blue-500">{card.translation}</span>
            )}
            {card.learned && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                Learned
              </span>
            )}
          </div>
          {card.definition?.meanings?.[0]?.definitions?.[0] && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {card.definition.meanings[0].definitions[0].definition}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${
            isDue
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {getNextReviewLabel(card.sm2)}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700/50 pt-3">
          {card.definition?.meanings?.map((meaning, i) => (
            <div key={i} className="mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase">
                {meaning.partOfSpeech}
              </span>
              {meaning.definitions.map((def, j) => (
                <p key={j} className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                  {j + 1}. {def.definition}
                </p>
              ))}
            </div>
          ))}

          {card.context && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
              Context: &quot;{card.context}&quot;
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLearned(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {card.learned ? 'Mark as unlearned' : 'Mark as learned'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
