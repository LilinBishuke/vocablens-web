/**
 * Idiom and phrasal expression detector.
 */

export interface IdiomEntry {
  meaning: string;
  example?: string;
  literal?: string;
  japanese?: string;
}

export interface IdiomMatch {
  match: string;
  key: string;
  start: number;
  end: number;
  entry: IdiomEntry;
}

let idiomData: Record<string, IdiomEntry> | null = null;
let idiomKeys: string[] = [];

async function loadData(): Promise<void> {
  if (idiomData) return;
  const resp = await fetch('/data/idiom-dictionary.json');
  idiomData = await resp.json();
  idiomKeys = Object.keys(idiomData!).sort((a, b) => b.length - a.length);
}

export async function detectIdioms(text: string): Promise<IdiomMatch[]> {
  await loadData();
  if (!idiomData) return [];

  const lower = text.toLowerCase();
  const results: IdiomMatch[] = [];
  const covered: [number, number][] = [];

  for (const key of idiomKeys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    let m;
    while ((m = regex.exec(lower)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;

      let overlaps = false;
      for (const [cs, ce] of covered) {
        if (start < ce && end > cs) { overlaps = true; break; }
      }
      if (overlaps) continue;

      covered.push([start, end]);
      results.push({
        match: text.slice(start, end),
        key,
        start,
        end,
        entry: idiomData[key],
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

export async function lookupIdiom(phrase: string): Promise<IdiomEntry | null> {
  await loadData();
  return idiomData?.[phrase.toLowerCase().trim()] || null;
}
