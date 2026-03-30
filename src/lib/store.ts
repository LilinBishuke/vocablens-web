/**
 * Zustand stores for flashcards and settings, persisted to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createCardState, processReview, isDue, type SM2State } from './spaced-repetition';
import type { DictionaryEntry } from './dictionary-api';

// ─── Flashcard Types ────────────────────────────────────

export interface Flashcard {
  word: string;
  definition: DictionaryEntry | null;
  translation?: string;
  context?: string;
  sm2: SM2State;
  learned: boolean;
  createdAt: number;
}

interface FlashcardStore {
  cards: Record<string, Flashcard>;
  addCard: (word: string, definition: DictionaryEntry | null, translation?: string, context?: string) => boolean;
  removeCard: (word: string) => void;
  hasCard: (word: string) => boolean;
  reviewCard: (word: string, quality: number) => void;
  getDueCards: () => Flashcard[];
  getStats: () => { total: number; due: number };
  setCardLearned: (word: string, learned: boolean) => void;
  searchCards: (query: string) => Flashcard[];
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      cards: {},

      addCard: (word, definition, translation, context) => {
        word = word.toLowerCase().trim();
        const { cards } = get();
        if (cards[word]) return false;

        set({
          cards: {
            ...cards,
            [word]: {
              word,
              definition,
              translation,
              context,
              sm2: createCardState(),
              learned: false,
              createdAt: Date.now(),
            },
          },
        });
        return true;
      },

      removeCard: (word) => {
        word = word.toLowerCase().trim();
        const { cards } = get();
        const newCards = { ...cards };
        delete newCards[word];
        set({ cards: newCards });
      },

      hasCard: (word) => {
        return !!get().cards[word.toLowerCase().trim()];
      },

      reviewCard: (word, quality) => {
        word = word.toLowerCase().trim();
        const { cards } = get();
        if (!cards[word]) return;

        set({
          cards: {
            ...cards,
            [word]: {
              ...cards[word],
              sm2: processReview(cards[word].sm2, quality),
            },
          },
        });
      },

      getDueCards: () => {
        const { cards } = get();
        return Object.values(cards)
          .filter(card => isDue(card.sm2))
          .sort((a, b) => a.sm2.nextReview - b.sm2.nextReview);
      },

      getStats: () => {
        const { cards } = get();
        const all = Object.values(cards);
        const due = all.filter(card => isDue(card.sm2));
        return { total: all.length, due: due.length };
      },

      setCardLearned: (word, learned) => {
        word = word.toLowerCase().trim();
        const { cards } = get();
        if (!cards[word]) return;
        set({
          cards: {
            ...cards,
            [word]: { ...cards[word], learned },
          },
        });
      },

      searchCards: (query) => {
        const { cards } = get();
        query = query.toLowerCase().trim();
        if (!query) return Object.values(cards);
        return Object.values(cards).filter(
          card => card.word.startsWith(query) || card.word.includes(query)
        );
      },
    }),
    {
      name: 'vocablens-flashcards',
    }
  )
);

// ─── Settings Store ─────────────────────────────────────

interface SettingsStore {
  darkMode: boolean;
  nativeLanguage: string;
  classificationSystem: '5level' | 'cefr' | 'frequency' | 'tier';
  minLevel: number;
  showTranslation: boolean;
  showVocab: boolean;
  showSlang: boolean;
  showIdiom: boolean;
  autoFollow: boolean;
  toggleDarkMode: () => void;
  setNativeLanguage: (lang: string) => void;
  setClassificationSystem: (system: '5level' | 'cefr' | 'frequency' | 'tier') => void;
  setMinLevel: (level: number) => void;
  setShowTranslation: (show: boolean) => void;
  setShowVocab: (show: boolean) => void;
  setShowSlang: (show: boolean) => void;
  setShowIdiom: (show: boolean) => void;
  setAutoFollow: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      darkMode: true,
      nativeLanguage: 'ja',
      classificationSystem: '5level',
      minLevel: 3,
      showTranslation: true,
      showVocab: true,
      showSlang: true,
      showIdiom: true,
      autoFollow: true,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
      setClassificationSystem: (system) => set({ classificationSystem: system }),
      setMinLevel: (level) => set({ minLevel: level }),
      setShowTranslation: (show) => set({ showTranslation: show }),
      setShowVocab: (show) => set({ showVocab: show }),
      setShowSlang: (show) => set({ showSlang: show }),
      setShowIdiom: (show) => set({ showIdiom: show }),
      setAutoFollow: (on) => set({ autoFollow: on }),
    }),
    {
      name: 'vocablens-settings',
    }
  )
);

// ─── Recent Videos Store ────────────────────────────────

export interface RecentVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  authorName: string;
  visitedAt: number;
}

interface RecentVideosStore {
  videos: RecentVideo[];
  addVideo: (video: Omit<RecentVideo, 'visitedAt'>) => void;
  removeVideo: (videoId: string) => void;
  clearAll: () => void;
}

export const useRecentVideosStore = create<RecentVideosStore>()(
  persist(
    (set, get) => ({
      videos: [],

      addVideo: (video) => {
        const { videos } = get();
        const filtered = videos.filter(v => v.videoId !== video.videoId);
        set({
          videos: [
            { ...video, visitedAt: Date.now() },
            ...filtered,
          ].slice(0, 20),
        });
      },

      removeVideo: (videoId) => {
        set({ videos: get().videos.filter(v => v.videoId !== videoId) });
      },

      clearAll: () => set({ videos: [] }),
    }),
    {
      name: 'vocablens-recent-videos',
    }
  )
);
