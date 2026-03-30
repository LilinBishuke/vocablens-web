/**
 * Slang and informal expression detector.
 */

export interface SlangEntry {
  meaning: string;
  example?: string;
  category?: string;
  register?: string;
}

export interface SlangMatch {
  match: string;
  key: string;
  start: number;
  end: number;
  entry: SlangEntry;
}

let slangData: Record<string, SlangEntry> | null = null;

async function loadData(): Promise<void> {
  if (slangData) return;
  const resp = await fetch('/data/slang-dictionary.json');
  slangData = await resp.json();
}

export async function detectSlang(text: string): Promise<SlangMatch[]> {
  await loadData();
  if (!slangData) return [];

  const lower = text.toLowerCase();
  const results: SlangMatch[] = [];
  const seen = new Set<string>();

  const keys = Object.keys(slangData).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let m;
    while ((m = regex.exec(lower)) !== null) {
      const posKey = `${m.index}-${m.index + m[0].length}`;
      let overlaps = false;
      for (const s of seen) {
        const [ss, se] = s.split('-').map(Number);
        if (m.index >= ss && m.index < se) { overlaps = true; break; }
        if (m.index + m[0].length > ss && m.index + m[0].length <= se) { overlaps = true; break; }
      }
      if (overlaps) continue;
      seen.add(posKey);

      results.push({
        match: text.slice(m.index, m.index + m[0].length),
        key,
        start: m.index,
        end: m.index + m[0].length,
        entry: slangData[key],
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

export async function lookupSlang(word: string): Promise<SlangEntry | null> {
  await loadData();
  return slangData?.[word.toLowerCase().trim()] || null;
}
