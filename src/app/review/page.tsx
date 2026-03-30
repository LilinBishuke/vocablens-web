'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useFlashcardStore, type Flashcard } from '@/lib/store';
import { getNextReviewLabel } from '@/lib/spaced-repetition';
import Link from 'next/link';

export default function ReviewPage() {
  const { getDueCards, reviewCard, getStats } = useFlashcardStore();
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const cards = getDueCards();
    setDueCards(cards);
    setCurrentIndex(0);
    setShowAnswer(false);
    setCompleted(cards.length === 0);
  }, [getDueCards]);

  const currentCard = dueCards[currentIndex];
  const stats = getStats();

  const handleRate = useCallback((quality: number) => {
    if (!currentCard) return;
    reviewCard(currentCard.word, quality);

    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex(i => i + 1);
      setShowAnswer(false);
    } else {
      setCompleted(true);
    }
  }, [currentCard, currentIndex, dueCards.length, reviewCard]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!currentCard) return;

      if (!showAnswer) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        switch (e.key) {
          case '1': handleRate(0); break;
          case '2': handleRate(3); break;
          case '3': handleRate(4); break;
          case '4': handleRate(5); break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, currentCard, handleRate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {stats.due} due / {stats.total} total
          </div>
        </div>

        {completed ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">&#127881;</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              All caught up!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {stats.total > 0
                ? 'No cards due for review right now. Come back later!'
                : 'Add some words to your flashcards first.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Watch a video
              </Link>
              <Link
                href="/cards"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Browse cards
              </Link>
            </div>
          </div>
        ) : currentCard ? (
          <div>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{currentIndex + 1} / {dueCards.length}</span>
                <span>Next review: {getNextReviewLabel(currentCard.sm2)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Card */}
            <div
              className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center cursor-pointer min-h-[300px] flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700"
              onClick={() => !showAnswer && setShowAnswer(true)}
            >
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {currentCard.word}
              </h2>

              {currentCard.translation && (
                <p className="text-lg text-blue-500 mb-2">{currentCard.translation}</p>
              )}

              {!showAnswer ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
                  Click or press Space to reveal answer
                </p>
              ) : (
                <div className="mt-4 text-left w-full max-w-md">
                  {currentCard.definition?.meanings?.map((meaning, i) => (
                    <div key={i} className="mb-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {meaning.partOfSpeech}
                      </span>
                      {meaning.definitions.slice(0, 2).map((def, j) => (
                        <p key={j} className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {j + 1}. {def.definition}
                          {def.example && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">
                              &quot;{def.example}&quot;
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  ))}

                  {currentCard.context && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Context:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        &quot;{currentCard.context}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating Buttons */}
            {showAnswer && (
              <div className="flex gap-3 mt-6">
                <RateButton
                  quality={0}
                  label="Again"
                  sublabel="1"
                  color="red"
                  onClick={() => handleRate(0)}
                />
                <RateButton
                  quality={3}
                  label="Hard"
                  sublabel="2"
                  color="orange"
                  onClick={() => handleRate(3)}
                />
                <RateButton
                  quality={4}
                  label="Good"
                  sublabel="3"
                  color="green"
                  onClick={() => handleRate(4)}
                />
                <RateButton
                  quality={5}
                  label="Easy"
                  sublabel="4"
                  color="blue"
                  onClick={() => handleRate(5)}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RateButton({
  label,
  sublabel,
  color,
  onClick,
}: {
  quality: number;
  label: string;
  sublabel: string;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500 hover:bg-red-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-500 hover:bg-green-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-lg text-white font-medium transition-colors ${colorMap[color]}`}
    >
      <span className="block text-sm">{label}</span>
      <span className="block text-xs opacity-70">({sublabel})</span>
    </button>
  );
}
