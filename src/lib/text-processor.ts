/**
 * Text extraction, tokenization, normalization, and rule-based lemmatization.
 */

const MAX_TEXT_LENGTH = 100000;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'it', 'its', 'he', 'she', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'my', 'his', 'our', 'your', 'their', 'mine',
  'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those',
  'i', 'you', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'if', 'then', 'else',
  'about', 'up', 'out', 'off', 'over', 'under', 'again', 'further',
  'once', 'here', 'there', 'any', 'also', 'after', 'before', 'above',
  'below', 'between', 'through', 'during', 'into', 'itself', 'myself',
  'yourself', 'himself', 'herself', 'ourselves', 'themselves',
]);

const IRREGULAR_VERBS: Record<string, string> = {
  'went': 'go', 'gone': 'go', 'going': 'go',
  'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be', 'am': 'be',
  'had': 'have', 'having': 'have',
  'did': 'do', 'done': 'do', 'doing': 'do',
  'said': 'say', 'saying': 'say',
  'made': 'make', 'making': 'make',
  'knew': 'know', 'known': 'know',
  'took': 'take', 'taken': 'take', 'taking': 'take',
  'came': 'come', 'coming': 'come',
  'saw': 'see', 'seen': 'see', 'seeing': 'see',
  'got': 'get', 'gotten': 'get', 'getting': 'get',
  'gave': 'give', 'given': 'give', 'giving': 'give',
  'told': 'tell', 'telling': 'tell',
  'found': 'find', 'finding': 'find',
  'thought': 'think', 'thinking': 'think',
  'left': 'leave', 'leaving': 'leave',
  'felt': 'feel', 'feeling': 'feel',
  'put': 'put', 'putting': 'put',
  'brought': 'bring', 'bringing': 'bring',
  'began': 'begin', 'begun': 'begin', 'beginning': 'begin',
  'kept': 'keep', 'keeping': 'keep',
  'held': 'hold', 'holding': 'hold',
  'wrote': 'write', 'written': 'write', 'writing': 'write',
  'stood': 'stand', 'standing': 'stand',
  'heard': 'hear', 'hearing': 'hear',
  'let': 'let', 'letting': 'let',
  'meant': 'mean', 'meaning': 'mean',
  'set': 'set', 'setting': 'set',
  'met': 'meet', 'meeting': 'meet',
  'ran': 'run', 'running': 'run',
  'paid': 'pay', 'paying': 'pay',
  'sat': 'sit', 'sitting': 'sit',
  'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak',
  'lay': 'lie', 'lain': 'lie', 'lying': 'lie',
  'led': 'lead', 'leading': 'lead',
  'read': 'read', 'reading': 'read',
  'grew': 'grow', 'grown': 'grow', 'growing': 'grow',
  'lost': 'lose', 'losing': 'lose',
  'fell': 'fall', 'fallen': 'fall', 'falling': 'fall',
  'sent': 'send', 'sending': 'send',
  'built': 'build', 'building': 'build',
  'understood': 'understand', 'understanding': 'understand',
  'won': 'win', 'winning': 'win',
  'broke': 'break', 'broken': 'break', 'breaking': 'break',
  'spent': 'spend', 'spending': 'spend',
  'cut': 'cut', 'cutting': 'cut',
  'caught': 'catch', 'catching': 'catch',
  'drove': 'drive', 'driven': 'drive', 'driving': 'drive',
  'bought': 'buy', 'buying': 'buy',
  'wore': 'wear', 'worn': 'wear', 'wearing': 'wear',
  'chose': 'choose', 'chosen': 'choose', 'choosing': 'choose',
  'threw': 'throw', 'thrown': 'throw', 'throwing': 'throw',
  'drew': 'draw', 'drawn': 'draw', 'drawing': 'draw',
  'sang': 'sing', 'sung': 'sing', 'singing': 'sing',
  'ate': 'eat', 'eaten': 'eat', 'eating': 'eat',
  'drank': 'drink', 'drunk': 'drink', 'drinking': 'drink',
  'swam': 'swim', 'swum': 'swim', 'swimming': 'swim',
  'flew': 'fly', 'flown': 'fly', 'flying': 'fly',
  'taught': 'teach', 'teaching': 'teach',
  'fought': 'fight', 'fighting': 'fight',
  'slept': 'sleep', 'sleeping': 'sleep',
  'woke': 'wake', 'woken': 'wake', 'waking': 'wake',
  'sold': 'sell', 'selling': 'sell',
  'rose': 'rise', 'risen': 'rise', 'rising': 'rise',
  'hung': 'hang', 'hanging': 'hang',
  'rode': 'ride', 'ridden': 'ride', 'riding': 'ride',
  'hid': 'hide', 'hidden': 'hide', 'hiding': 'hide',
  'shook': 'shake', 'shaken': 'shake', 'shaking': 'shake',
  'bit': 'bite', 'bitten': 'bite', 'biting': 'bite',
  'blew': 'blow', 'blown': 'blow', 'blowing': 'blow',
  'froze': 'freeze', 'frozen': 'freeze', 'freezing': 'freeze',
  'shut': 'shut', 'shutting': 'shut',
  'lied': 'lie',
  'died': 'die', 'dying': 'die',
  'tied': 'tie', 'tying': 'tie',
  'wept': 'weep', 'swept': 'sweep', 'crept': 'creep',
  'dealt': 'deal', 'knelt': 'kneel', 'leapt': 'leap',
  'bent': 'bend', 'lent': 'lend', 'sought': 'seek',
  'bound': 'bind', 'wound': 'wind', 'stung': 'sting',
  'clung': 'cling', 'dug': 'dig', 'swung': 'swing',
  'spun': 'spin', 'sank': 'sink', 'sunk': 'sink',
  'shone': 'shine', 'wove': 'weave', 'woven': 'weave',
  'bore': 'bear', 'borne': 'bear', 'tore': 'tear', 'torn': 'tear',
  'swore': 'swear', 'sworn': 'swear', 'stole': 'steal', 'stolen': 'steal',
  'forgave': 'forgive', 'forgiven': 'forgive',
  'forgot': 'forget', 'forgotten': 'forget',
};

const IRREGULAR_NOUNS: Record<string, string> = {
  'men': 'man', 'women': 'woman', 'children': 'child', 'feet': 'foot',
  'teeth': 'tooth', 'mice': 'mouse', 'geese': 'goose', 'oxen': 'ox',
  'people': 'person', 'dice': 'die', 'lives': 'life', 'wives': 'wife',
  'knives': 'knife', 'halves': 'half', 'selves': 'self', 'leaves': 'leaf',
  'wolves': 'wolf', 'shelves': 'shelf', 'loaves': 'loaf', 'thieves': 'thief',
  'calves': 'calf', 'elves': 'elf',
};

export function tokenize(text: string): string[] {
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }
  const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  return tokens.filter(t => t.length >= 2 && t.length <= 45);
}

export function lemmatize(word: string): string {
  if (IRREGULAR_VERBS[word]) return IRREGULAR_VERBS[word];
  if (IRREGULAR_NOUNS[word]) return IRREGULAR_NOUNS[word];

  const len = word.length;

  if (len > 4 && word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    if (stem.endsWith('y') && stem.length >= 3) return stem;
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2] &&
        !'aeiou'.includes(stem[stem.length - 1])) {
      return stem.slice(0, -1);
    }
    if (stem.length >= 2) return stem + 'e';
  }

  if (len > 3 && word.endsWith('ed')) {
    if (word.endsWith('ied') && len > 4) return word.slice(0, -3) + 'y';
    const stem = word.slice(0, -2);
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2] &&
        !'aeiou'.includes(stem[stem.length - 1])) {
      return stem.slice(0, -1);
    }
    if (stem.length >= 2 && !'aeiou'.includes(stem[stem.length - 1])) return stem + 'e';
    if (stem.length >= 2) return stem;
  }

  if (len > 2 && word.endsWith('s') && !word.endsWith('ss')) {
    if (word.endsWith('ies') && len > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('ches')) return word.slice(0, -2);
    if (word.endsWith('shes')) return word.slice(0, -2);
    if (word.endsWith('xes')) return word.slice(0, -2);
    if (word.endsWith('zes')) return word.slice(0, -2);
    if (word.endsWith('ses') && len > 4) return word.slice(0, -1);
    return word.slice(0, -1);
  }

  if (len > 4 && word.endsWith('ier')) return word.slice(0, -3) + 'y';
  if (len > 5 && word.endsWith('iest')) return word.slice(0, -4) + 'y';
  if (len > 4 && word.endsWith('er') && !word.endsWith('eer') && !word.endsWith('ier')) {
    const stem = word.slice(0, -2);
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) return stem.slice(0, -1);
    return stem;
  }

  if (len > 4 && word.endsWith('ily')) return word.slice(0, -3) + 'y';
  if (len > 4 && word.endsWith('ly')) return word.slice(0, -2);

  if (len > 5 && word.endsWith('iness')) return word.slice(0, -5) + 'y';
  if (len > 4 && word.endsWith('ness')) return word.slice(0, -4);

  return word;
}

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word);
}

export function processText(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const wordCounts = new Map<string, number>();

  for (const token of tokens) {
    if (isStopWord(token)) continue;
    if (/^(.)\1+$/.test(token)) continue;

    const lemma = lemmatize(token);
    if (isStopWord(lemma)) continue;
    if (lemma.length < 2) continue;

    wordCounts.set(lemma, (wordCounts.get(lemma) || 0) + 1);
  }

  return wordCounts;
}
