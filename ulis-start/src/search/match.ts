// Shared situation-search matcher (Cẩm nang, Danh bạ, Trợ lý local mode).
// Accent/diacritic-insensitive, synonym-expanded, weighted keyword overlap. Pure functions, no React.
import { content as bundledContent, type ContentBundle } from '../content';
import type { Contact, FaqItem, Guide, Resource, Synonyms, Task, Track } from '../types';
import { containsPhrase, normalize } from './normalize';

export { containsPhrase, normalize } from './normalize';

export type HitKind = 'guide' | 'task' | 'contact' | 'faq' | 'resource';

export interface SearchHit {
  kind: HitKind;
  id: string;
  title: string;
  score: number;
  /** Normalized query terms that matched this item. */
  matched: string[];
  /** Best-matching field text (e.g. the situation or contact handle), for display. */
  matchedText?: string;
}

export interface SearchOptions {
  /** Restrict to these kinds (default: all). */
  kinds?: HitKind[];
  /** Only tasks for this track (tracks includes 'all' or the track). */
  track?: Track;
  /** Max hits returned (default 20). */
  limit?: number;
  /** Drop hits below this score (default 2). */
  minScore?: number;
  /**
   * For multi-word queries, drop hits scoring below this fraction of the top hit (e.g. 0.5).
   * Off by default; UI lists use it to hide one-syllable noise ("công" → Công đoàn).
   */
  relativeCutoff?: number;
  /** Include superseded resources (default false). */
  includeSuperseded?: boolean;
  /** Content to search (default: bundled content). */
  content?: Pick<ContentBundle, 'guides' | 'tasks' | 'contacts' | 'faq' | 'resources' | 'synonyms'>;
}

/** Field weights: title×3, situations/keywords×2, body×1. */
export const WEIGHTS = { title: 3, tags: 2, body: 1 } as const;
/** Weight factor for terms that only come from synonym expansion. */
export const SYNONYM_FACTOR = 0.6;
/** Bonus factor for multi-word phrase matches. */
export const PHRASE_BONUS = 1.5;
/** Order used by `groupHits` / situation search: guides first, then tasks, then contacts. */
export const KIND_ORDER: HitKind[] = ['guide', 'task', 'contact', 'faq', 'resource'];

// Normalized Vietnamese function words that carry no topic meaning.
const STOPWORDS = new Set([
  'toi', 'minh', 'ban', 'em', 'anh', 'chi', 'can', 'muon', 'phai', 'la', 'gi', 'o', 'dau', 'nao', 'khong', 'cua',
  'va', 'voi', 'cho', 've', 'hoi', 'ai', 'gap', 'nhu', 'duoc', 'mot', 'cac', 'nhung', 'nay', 'do', 'de', 'khi',
  'thi', 'sao', 'nhieu', 'a', 'oi', 'nhe', 'lam', 'den', 'tai', 'trong', 'hay', 'hoac', 'da', 'se', 'dang', 'roi',
  'vay', 'ma', 'neu', 'thu', 'tuc', 'giup', 'xin', 'biet', 'co', 'bi', 'nguoi', 'viec', 'gio', 'hom', 'nay',
]);

// Question idioms removed before matching (their syllables collide with topic words, e.g. "bao" in "bảo hiểm").
const QUESTION_PHRASES = ['bao nhieu', 'bao gio', 'the nao', 'nhu the nao', 'lam sao', 'o dau', 'hom nay', 'tai sao'];

/** Weight of a lone syllable when the query has several (Vietnamese syllables are ambiguous). */
export const SINGLE_TOKEN_FACTOR = 0.5;

/** Normalized tokens without stopwords / 1-char noise. */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}


export interface QueryTerm {
  /** Normalized term (single token or multi-word phrase). */
  term: string;
  weight: number;
  phrase: boolean;
  fromSynonym: boolean;
}

/** Query tokens + phrases, expanded with every synonym group the query touches. */
export function expandQuery(query: string, synonyms: Synonyms): QueryTerm[] {
  return analyzeQuery(query, synonyms).terms;
}

/** Content tokens of the query + expanded terms. */
export function analyzeQuery(query: string, synonyms: Synonyms): { tokens: string[]; terms: QueryTerm[] } {
  let norm = normalize(query);
  for (const p of QUESTION_PHRASES) norm = ` ${norm} `.split(` ${p} `).join(' ').trim();
  if (!norm) return { tokens: [], terms: [] };
  const words = norm.split(' ');
  const isContent = (w: string) => w.length > 1 && !STOPWORDS.has(w);
  const tokens = words.filter(isContent);
  const tokenFactor = tokens.length > 1 ? SINGLE_TOKEN_FACTOR : 1;

  const terms = new Map<string, QueryTerm>();
  const add = (term: string, fromSynonym: boolean) => {
    if (!term) return;
    const phrase = term.includes(' ');
    if (!phrase && !isContent(term)) return;
    const weight = (fromSynonym ? SYNONYM_FACTOR : 1) * (phrase ? PHRASE_BONUS : tokenFactor);
    const prev = terms.get(term);
    if (!prev || prev.weight < weight) terms.set(term, { term, weight, phrase, fromSynonym });
  };

  for (const t of tokens) add(t, false);
  // Adjacent content-word bigrams ("nghi phep", "the can") carry most of the meaning.
  for (let i = 0; i + 1 < words.length; i++) {
    if (isContent(words[i]) && isContent(words[i + 1])) add(`${words[i]} ${words[i + 1]}`, false);
  }

  for (const [canonical, variants] of Object.entries(synonyms)) {
    const group = [canonical, ...variants].map(normalize).filter(Boolean);
    const hit = group.find((g) => containsPhrase(norm, g) && !(g.length < 2 || (!g.includes(' ') && STOPWORDS.has(g))));
    if (!hit) continue;
    for (const g of group) {
      // A phrase literally present in the query counts as a non-synonym phrase match.
      add(g, !containsPhrase(norm, g));
      // Single tokens of multi-word variants help partial matches (low weight via synonym factor).
      if (g.includes(' ')) for (const t of g.split(' ')) if (!containsPhrase(norm, t)) add(t, true);
    }
  }
  return { tokens: [...new Set(tokens)], terms: [...terms.values()] };
}

interface Doc {
  kind: HitKind;
  id: string;
  title: string;
  /** Normalized text per field group. */
  titleN: string;
  tags: string[]; // raw, for matchedText
  tagsN: string[];
  bodyN: string;
}

const docCache = new WeakMap<object, Doc[]>();

function buildDocs(c: NonNullable<SearchOptions['content']>): Doc[] {
  const cached = docCache.get(c);
  if (cached) return cached;
  const mk = (kind: HitKind, id: string, title: string, tags: string[], body: string[]): Doc => ({
    kind,
    id,
    title,
    titleN: normalize(title),
    tags,
    tagsN: tags.map(normalize),
    bodyN: normalize(body.join(' ')),
  });
  const docs: Doc[] = [
    ...c.guides.map((g: Guide) =>
      mk('guide', g.id, g.title, [...g.situations, ...g.keywords], [g.purpose, g.whoDoes, ...g.prepare, ...g.steps]),
    ),
    ...c.tasks.map((t: Task) => mk('task', t.id, t.title, t.keywords, [t.why, ...t.steps.map((s) => s.text)])),
    ...c.contacts.map((ct: Contact) => mk('contact', ct.id, ct.unit, ct.handles, [ct.role, ct.location ?? ''])),
    ...c.faq.map((f: FaqItem) => mk('faq', f.id, f.q, f.keywords, [f.a])),
    ...c.resources.map((r: Resource) => mk('resource', r.id, r.title, [r.field], [])),
  ];
  docCache.set(c, docs);
  return docs;
}

function fieldHas(fieldN: string, tokenSet: Set<string>, qt: QueryTerm): boolean {
  return qt.phrase ? containsPhrase(fieldN, qt.term) : tokenSet.has(qt.term);
}

function scoreDoc(doc: Doc, terms: QueryTerm[]): { score: number; matched: string[]; matchedText?: string } {
  let score = 0;
  const matched: string[] = [];
  const titleTokens = new Set(doc.titleN.split(' '));
  const bodyTokens = new Set(doc.bodyN.split(' '));
  const tagTokenSets = doc.tagsN.map((t) => new Set(t.split(' ')));
  const tagHits = new Array<number>(doc.tagsN.length).fill(0);

  for (const qt of terms) {
    let s = 0;
    if (fieldHas(doc.titleN, titleTokens, qt)) s += WEIGHTS.title;
    let inTags = false;
    doc.tagsN.forEach((tag, i) => {
      if (fieldHas(tag, tagTokenSets[i], qt)) {
        inTags = true;
        tagHits[i] += qt.weight * (qt.phrase ? qt.term.split(' ').length : 1);
      }
    });
    if (inTags) s += WEIGHTS.tags;
    if (fieldHas(doc.bodyN, bodyTokens, qt)) s += WEIGHTS.body;
    if (s > 0) {
      score += s * qt.weight;
      matched.push(qt.term);
    }
  }

  let matchedText: string | undefined;
  let best = 0;
  tagHits.forEach((h, i) => {
    if (h > best) {
      best = h;
      matchedText = doc.tags[i];
    }
  });
  return { score: Math.round(score * 100) / 100, matched, matchedText };
}

/** Rank content items against a free-text question. Highest score first. */
export function searchContent(query: string, options: SearchOptions = {}): SearchHit[] {
  const c = options.content ?? bundledContent;
  const { kinds, track, limit = 20, minScore = 2, includeSuperseded = false, relativeCutoff } = options;
  const { tokens, terms } = analyzeQuery(query, c.synonyms);
  if (terms.length === 0) return [];
  const synonymTermsByToken = new Map<string, string[]>();
  for (const t of tokens) {
    // Synonym phrases that "stand for" this query token (e.g. "cong tac phi" for token "cong").
    synonymTermsByToken.set(t, terms.filter((qt) => qt.phrase && containsPhrase(qt.term, t)).map((qt) => qt.term));
  }

  const allowedTasks = track
    ? new Set(c.tasks.filter((t) => t.tracks.includes('all') || t.tracks.includes(track)).map((t) => t.id))
    : null;
  const superseded = new Set(c.resources.filter((r) => r.status === 'superseded').map((r) => r.id));

  const hits: SearchHit[] = [];
  for (const doc of buildDocs(c)) {
    if (kinds && !kinds.includes(doc.kind)) continue;
    if (doc.kind === 'task' && allowedTasks && !allowedTasks.has(doc.id)) continue;
    if (doc.kind === 'resource' && !includeSuperseded && superseded.has(doc.id)) continue;
    const raw = scoreDoc(doc, terms);
    // Coverage: share of the query's content tokens explained by this item (directly or via a matched phrase).
    const matchedSet = new Set(raw.matched);
    const covered = tokens.filter(
      (t) => matchedSet.has(t) || (synonymTermsByToken.get(t) ?? []).some((p) => matchedSet.has(p)),
    ).length;
    const coverage = tokens.length > 0 ? covered / tokens.length : 1;
    const score = Math.round(raw.score * coverage * 100) / 100;
    const { matched, matchedText } = raw;
    if (score >= minScore) hits.push({ kind: doc.kind, id: doc.id, title: doc.title, score, matched, matchedText });
  }
  hits.sort((a, b) => b.score - a.score || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  if (relativeCutoff !== undefined && tokens.length > 1 && hits.length > 0) {
    const floor = hits[0].score * relativeCutoff;
    return hits.filter((h) => h.score >= floor).slice(0, limit);
  }
  return hits.slice(0, limit);
}

/** Group hits by kind, in KIND_ORDER (guides → tasks → contacts → faq → resources), each sorted by score. */
export function groupHits(hits: SearchHit[]): { kind: HitKind; hits: SearchHit[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, hits: hits.filter((h) => h.kind === kind) })).filter((g) => g.hits.length > 0);
}

/** Simple accent-insensitive "contains all tokens" filter for list screens. */
export function textMatches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize(fields.filter(Boolean).join(' '));
  return q.split(' ').every((t) => hay.includes(t));
}
