// Document retrieval: Vietnamese-aware BM25 (always on) + optional Voyage embeddings, fused by rank.
import { synonyms } from '../../../src/content';
import { analyzeQuery, tokenize } from '../../../src/search/match';
import { config } from '../config';
import { allChunks, getDoc, type DocChunk } from './store';

export interface DocHit {
  chunk: DocChunk;
  /** BM25 score (0 when only the semantic search found it). */
  score: number;
  docTitle: string;
}

const K1 = 1.4;
const B = 0.75;
/** Below this BM25 score a keyword-only hit is noise. */
export const DOC_MIN_SCORE = 1.2;

interface Index {
  size: number;
  avgLen: number;
  df: Map<string, number>;
  docs: { chunk: DocChunk; tf: Map<string, number>; len: number; norm: string }[];
}

/** Vietnamese writes final -y and -i interchangeably (thạc sỹ/sĩ, kỹ/kĩ, quy/qui, lý/lí); index both as -i. */
const canon = (word: string) => word.replace(/^(qu|[bcdghklmnpstv]|ch|gh|kh|nh|ph|th|tr)y$/, '$1i');
const canonTerm = (term: string) => term.split(' ').map(canon).join(' ');

let cache: { chunks: readonly DocChunk[]; index: Index } | null = null;

/** Rebuilt lazily when the chunk list changes (upload/delete replaces the array). */
function getIndex(): Index {
  const chunks = allChunks();
  if (cache?.chunks === chunks) return cache.index;
  const df = new Map<string, number>();
  const docs = chunks.map((chunk) => {
    const tokens = tokenize(chunk.text).map(canon);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { chunk, tf, len: tokens.length, norm: ` ${tokens.join(' ')} ` };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  const index = { size: docs.length, avgLen, df, docs };
  cache = { chunks, index };
  return index;
}

function bm25(query: string): { chunk: DocChunk; score: number }[] {
  const index = getIndex();
  if (index.size === 0) return [];
  const { terms } = analyzeQuery(query, synonyms);
  const scored: { chunk: DocChunk; score: number }[] = [];
  for (const d of index.docs) {
    let score = 0;
    for (const { term: rawTerm, weight, phrase } of terms) {
      const term = canonTerm(rawTerm);
      // Multi-word terms ("nghỉ phép") score as a phrase; their rarity is approximated by their first word.
      const words = term.split(' ');
      const tf = phrase ? d.norm.split(` ${term} `).length - 1 : (d.tf.get(term) ?? 0);
      if (tf === 0) continue;
      const n = index.df.get(words[0] ?? term) ?? 1;
      const idf = Math.log(1 + (index.size - n + 0.5) / (n + 0.5));
      score += weight * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.len) / index.avgLen))) * (phrase ? 1.5 : 1);
    }
    if (score > 0) scored.push({ chunk: d.chunk, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

// --- Voyage (optional) -------------------------------------------------------------------------

/** Embeds texts with Voyage AI. Returns null when no key is configured or the call fails. */
export async function embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][] | null> {
  if (!config.voyageKey || texts.length === 0) return null;
  const out: number[][] = [];
  try {
    for (let i = 0; i < texts.length; i += 64) {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.voyageKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.voyageModel, input: texts.slice(i, i + 64), input_type: inputType }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Voyage ${res.status}`);
      const json = (await res.json()) as { data: { embedding: number[] }[] };
      out.push(...json.data.map((d) => d.embedding));
    }
    return out;
  } catch (err) {
    console.warn('[voyage] embedding failed, keyword search only:', err instanceof Error ? err.message : err);
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const SEMANTIC_MIN = 0.45;

/**
 * Top-k document chunks for a question. Keyword and semantic rankings are merged with reciprocal-rank
 * fusion, so either one alone can surface a chunk; weak keyword-only matches are dropped.
 */
export async function searchDocs(question: string, k = 6): Promise<DocHit[]> {
  const keyword = bm25(question).filter((h) => h.score >= DOC_MIN_SCORE).slice(0, 20);
  let semantic: { chunk: DocChunk; sim: number }[] = [];
  const withVec = allChunks().filter((c) => c.vec);
  if (withVec.length > 0) {
    const q = (await embed([question], 'query'))?.[0];
    if (q) {
      semantic = withVec
        .map((chunk) => ({ chunk, sim: cosine(q, chunk.vec ?? []) }))
        .filter((h) => h.sim >= SEMANTIC_MIN)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 20);
    }
  }
  const fused = new Map<string, { chunk: DocChunk; rrf: number; score: number }>();
  const add = (chunk: DocChunk, rank: number, score: number) => {
    const prev = fused.get(chunk.id);
    fused.set(chunk.id, { chunk, rrf: (prev?.rrf ?? 0) + 1 / (60 + rank), score: Math.max(prev?.score ?? 0, score) });
  };
  keyword.forEach((h, i) => add(h.chunk, i, h.score));
  semantic.forEach((h, i) => add(h.chunk, i, 0));
  return [...fused.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, k)
    .map(({ chunk, score }) => ({ chunk, score, docTitle: getDoc(chunk.docId)?.title ?? 'Tài liệu' }));
}
