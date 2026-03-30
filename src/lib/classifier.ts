/**
 * Word level classification engine.
 * Supports: 5-level, CEFR, Frequency bands, 3-tier.
 */

export type ClassificationSystem = '5level' | 'cefr' | 'frequency' | 'tier';

export interface LevelDef {
  label: string;
  color: string;
  bgColor: string;
}

export interface WordEntry {
  word: string;
  count: number;
}

export interface ClassificationResult {
  groups: Record<string, WordEntry[]>;
  levelDefs: Record<string, LevelDef>;
}

let cefrData: Record<string, string[]> | null = null;
let frequencyData: Record<string, string[]> | null = null;
let tierMapping: {
  tiers: Record<string, LevelDef>;
  fromCEFR: Record<string, string>;
  fromFrequency: Record<string, string>;
} | null = null;

let cefrLookup: Map<string, string> | null = null;
let frequencyLookup: Map<string, string> | null = null;

const CEFR_TO_5LEVEL: Record<string, string> = {
  A1: '1', A2: '2', B1: '3', B2: '4', C1: '5', C2: '5',
};

const FREQ_TO_5LEVEL: Record<string, string> = {
  '1k': '1', '2k': '2', '3k': '3', 'academic': '4', 'advanced': '5',
};

const LEVEL_ORDER: Record<string, string[]> = {
  '5level': ['1', '2', '3', '4', '5'],
  'cefr': ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  'frequency': ['1k', '2k', '3k', 'academic', 'advanced'],
  'tier': ['beginner', 'intermediate', 'advanced'],
};

async function loadData(): Promise<void> {
  if (cefrData && frequencyData && tierMapping) return;

  const [cefrResp, freqResp, tierResp] = await Promise.all([
    fetch('/data/cefr-wordlist.json'),
    fetch('/data/frequency-wordlist.json'),
    fetch('/data/tier-mapping.json'),
  ]);

  cefrData = await cefrResp.json();
  frequencyData = await freqResp.json();
  tierMapping = await tierResp.json();

  cefrLookup = new Map();
  for (const [level, words] of Object.entries(cefrData!)) {
    for (const word of words) {
      cefrLookup.set(word, level);
    }
  }

  frequencyLookup = new Map();
  for (const [band, words] of Object.entries(frequencyData!)) {
    for (const word of words) {
      frequencyLookup.set(word, band);
    }
  }
}

export function getLevelOrder(system: ClassificationSystem): string[] {
  return LEVEL_ORDER[system] || [];
}

export async function classifyWords(
  wordCounts: Map<string, number>,
  system: ClassificationSystem = '5level',
  minLevel: number = 1
): Promise<ClassificationResult> {
  await loadData();

  const groups: Record<string, WordEntry[]> = {};
  const levelDefs = getLevelDefinitions(system);
  const levelKeys = LEVEL_ORDER[system] || Object.keys(levelDefs);
  const minIndex = Math.max(0, minLevel - 1);

  for (const key of levelKeys) {
    groups[key] = [];
  }
  groups['unknown'] = [];

  for (const [word, count] of wordCounts) {
    const level = classifyWord(word, system);
    if (!level) {
      groups['unknown'].push({ word, count });
      continue;
    }

    const levelIndex = levelKeys.indexOf(level);
    if (levelIndex < minIndex) continue;

    if (!groups[level]) groups[level] = [];
    groups[level].push({ word, count });
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  }

  return { groups, levelDefs };
}

export function classifyWord(word: string, system: ClassificationSystem): string | null {
  switch (system) {
    case '5level': {
      const cefrLevel = cefrLookup?.get(word);
      if (cefrLevel) return CEFR_TO_5LEVEL[cefrLevel];
      const freqBand = frequencyLookup?.get(word);
      if (freqBand) return FREQ_TO_5LEVEL[freqBand];
      return null;
    }
    case 'cefr':
      return cefrLookup?.get(word) || null;
    case 'frequency':
      return frequencyLookup?.get(word) || null;
    case 'tier': {
      const cefrLevel = cefrLookup?.get(word);
      if (cefrLevel && tierMapping) return tierMapping.fromCEFR[cefrLevel];
      const freqBand = frequencyLookup?.get(word);
      if (freqBand && tierMapping) return tierMapping.fromFrequency[freqBand];
      return null;
    }
    default:
      return null;
  }
}

export function getLevelDefinitions(system: ClassificationSystem): Record<string, LevelDef> {
  switch (system) {
    case '5level':
      return {
        '1': { label: 'Lv.1 Basic', color: '#22c55e', bgColor: '#22c55e20' },
        '2': { label: 'Lv.2 Elementary', color: '#eab308', bgColor: '#eab30820' },
        '3': { label: 'Lv.3 Intermediate', color: '#f97316', bgColor: '#f9731620' },
        '4': { label: 'Lv.4 Advanced', color: '#ef4444', bgColor: '#ef444420' },
        '5': { label: 'Lv.5 Expert', color: '#a855f7', bgColor: '#a855f720' },
      };
    case 'cefr':
      return {
        A1: { label: 'A1 - Beginner', color: '#22c55e', bgColor: '#22c55e20' },
        A2: { label: 'A2 - Elementary', color: '#84cc16', bgColor: '#84cc1620' },
        B1: { label: 'B1 - Intermediate', color: '#eab308', bgColor: '#eab30820' },
        B2: { label: 'B2 - Upper Int.', color: '#f97316', bgColor: '#f9731620' },
        C1: { label: 'C1 - Advanced', color: '#ef4444', bgColor: '#ef444420' },
        C2: { label: 'C2 - Proficiency', color: '#a855f7', bgColor: '#a855f720' },
      };
    case 'frequency':
      return {
        '1k': { label: 'Top 1000', color: '#22c55e', bgColor: '#22c55e20' },
        '2k': { label: '1001-2000', color: '#eab308', bgColor: '#eab30820' },
        '3k': { label: '2001-3000', color: '#f97316', bgColor: '#f9731620' },
        'academic': { label: 'Academic', color: '#ef4444', bgColor: '#ef444420' },
        'advanced': { label: 'Advanced', color: '#a855f7', bgColor: '#a855f720' },
      };
    case 'tier':
      return tierMapping?.tiers || {};
    default:
      return {};
  }
}

export async function ensureLoaded(): Promise<void> {
  await loadData();
}
