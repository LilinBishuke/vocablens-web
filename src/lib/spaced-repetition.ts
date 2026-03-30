/**
 * SM-2 Spaced Repetition Algorithm.
 *
 * Quality ratings:
 *   0 (Again)  - Complete blackout
 *   3 (Hard)   - Recalled with difficulty
 *   4 (Good)   - Recalled with some hesitation
 *   5 (Easy)   - Perfect, instant recall
 */

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export interface SM2State {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReview: number;
  lastReview: number | null;
}

export function createCardState(): SM2State {
  return {
    repetitions: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReview: Date.now(),
    lastReview: null,
  };
}

export function processReview(state: SM2State, quality: number): SM2State {
  const newState = { ...state };
  newState.lastReview = Date.now();

  if (quality < 3) {
    newState.repetitions = 0;
    newState.interval = 1;
  } else {
    if (newState.repetitions === 0) {
      newState.interval = 1;
    } else if (newState.repetitions === 1) {
      newState.interval = 6;
    } else {
      newState.interval = Math.round(newState.interval * newState.easeFactor);
    }
    newState.repetitions += 1;
  }

  newState.easeFactor = newState.easeFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newState.easeFactor = Math.max(MIN_EASE_FACTOR, newState.easeFactor);

  newState.nextReview = Date.now() + newState.interval * 24 * 60 * 60 * 1000;

  return newState;
}

export function isDue(state: SM2State): boolean {
  return Date.now() >= state.nextReview;
}

export function getNextReviewLabel(state: SM2State): string {
  const diff = state.nextReview - Date.now();
  if (diff <= 0) return 'Now';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  return `${days} days`;
}
