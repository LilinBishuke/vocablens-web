'use client';

import { useState, useEffect } from 'react';
import { lookupWord, type DictionaryEntry } from '@/lib/dictionary-api';
import { translateText } from '@/lib/translation-api';
import { lookupSlang, type SlangEntry } from '@/lib/slang-detector';
import { lookupIdiom, type IdiomEntry } from '@/lib/idiom-detector';
import { useFlashcardStore, useSettingsStore } from '@/lib/store';

interface WordDetailPanelProps {
  word: string | null;
  context?: string;
  onClose: () => void;
}

export default function WordDetailPanel({ word, context, onClose }: WordDetailPanelProps) {
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [slangEntry, setSlangEntry] = useState<SlangEntry | null>(null);
  const [idiomEntry, setIdiomEntry] = useState<IdiomEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const { hasCard, addCard, removeCard } = useFlashcardStore();
  const { nativeLanguage } = useSettingsStore();
  const isInDeck = word ? hasCard(word) : false;

  useEffect(() => {
    if (!word) return;

    setLoading(true);
    setDictEntry(null);
    setTranslation(null);
    setSlangEntry(null);
    setIdiomEntry(null);

    Promise.all([
      lookupWord(word).then(setDictEntry),
      translateText(word, nativeLanguage).then(setTranslation),
      lookupSlang(word).then(setSlangEntry),
      lookupIdiom(word).then(setIdiomEntry),
    ]).finally(() => setLoading(false));
  }, [word, nativeLanguage]);

  if (!word) return null;

  const handlePlayAudio = (audioUrl: string) => {
    if (playingAudio) return;
    setPlayingAudio(true);
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudio(false);
    audio.onerror = () => setPlayingAudio(false);
    audio.play();
  };

  const handleToggleFlashcard = () => {
    if (isInDeck) {
      removeCard(word);
    } else {
      addCard(word, dictEntry, translation || undefined, context);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{word}</h2>
            {dictEntry?.phonetic && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{dictEntry.phonetic}</p>
            )}
            {translation && (
              <p className="text-blue-500 text-sm mt-1">{translation}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFlashcard}
              className={`p-2 rounded-lg transition-colors ${
                isInDeck
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-yellow-500'
              }`}
              title={isInDeck ? 'Remove from flashcards' : 'Add to flashcards'}
            >
              <svg className="w-5 h-5" fill={isInDeck ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Audio */}
        {dictEntry?.phonetics && dictEntry.phonetics.length > 0 && (
          <div className="flex gap-2 mb-4">
            {dictEntry.phonetics
              .filter(p => p.audio)
              .slice(0, 2)
              .map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePlayAudio(p.audio)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {p.text || 'Play'}
                </button>
              ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Slang Info */}
        {slangEntry && (
          <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Slang</span>
              {slangEntry.register && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300">
                  {slangEntry.register}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{slangEntry.meaning}</p>
            {slangEntry.example && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">&quot;{slangEntry.example}&quot;</p>
            )}
          </div>
        )}

        {/* Idiom Info */}
        {idiomEntry && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Idiom</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{idiomEntry.meaning}</p>
            {idiomEntry.example && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">&quot;{idiomEntry.example}&quot;</p>
            )}
            {idiomEntry.japanese && (
              <p className="text-xs text-blue-500 mt-1">{idiomEntry.japanese}</p>
            )}
          </div>
        )}

        {/* Dictionary Definitions */}
        {dictEntry?.meanings && dictEntry.meanings.length > 0 && (
          <div className="space-y-4">
            {dictEntry.meanings.map((meaning, i) => (
              <div key={i}>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mb-2">
                  {meaning.partOfSpeech}
                </span>
                <ol className="space-y-2">
                  {meaning.definitions.map((def, j) => (
                    <li key={j} className="text-sm">
                      <p className="text-gray-800 dark:text-gray-200">
                        <span className="text-gray-400 mr-1">{j + 1}.</span>
                        {def.definition}
                      </p>
                      {def.example && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 italic pl-4">
                          &quot;{def.example}&quot;
                        </p>
                      )}
                      {def.synonyms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 pl-4">
                          {def.synonyms.map((syn, k) => (
                            <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                              {syn}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {!loading && !dictEntry && !slangEntry && !idiomEntry && (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
            No dictionary entry found for &quot;{word}&quot;.
          </p>
        )}

        {/* Context */}
        {context && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Context</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic">&quot;{context}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
