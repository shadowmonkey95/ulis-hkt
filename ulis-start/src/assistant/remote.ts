// Remote mode: POST {EXPO_PUBLIC_ASSISTANT_URL}/ask → server/ (holds the API key + uploaded documents) → Claude.
// The app never talks to the Claude API directly and never sees a key.
import { actionsForSources, askHrAction, toSource } from './local';
import { findItemById } from './retrieve';
import type { AskContext, AssistantReply, ReplySource } from './types';

/** Inlined by Expo at build time; empty → local mode only (no network calls at all). */
export const ASSISTANT_URL = (process.env.EXPO_PUBLIC_ASSISTANT_URL ?? '').trim().replace(/\/+$/, '');
/** Claude reads the retrieved passages before answering; give it time, then fall back to local. */
export const REMOTE_TIMEOUT_MS = 30_000;

export type RemoteVerdict = 'answer' | 'not_found' | 'out_of_scope' | 'guarded';

export interface RemoteDocSource {
  id: string;
  /** Uploaded document id; several passages of one document share it. */
  docId?: string;
  title: string;
  page?: number;
  uploadedAt?: string;
}

export interface RemoteAnswer {
  answer: string;
  sources: string[];
  /** Older servers don't send the fields below. */
  verdict?: RemoteVerdict;
  steps?: string[];
  docSources?: RemoteDocSource[];
}

const isStrings = (v: unknown) => Array.isArray(v) && v.every((s) => typeof s === 'string');

function isRemoteAnswer(x: unknown): x is RemoteAnswer {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  if (typeof r.answer !== 'string' || r.answer.trim() === '' || !isStrings(r.sources)) return false;
  if (r.steps !== undefined && !isStrings(r.steps)) return false;
  if (r.docSources !== undefined) {
    if (!Array.isArray(r.docSources)) return false;
    for (const d of r.docSources as unknown[]) {
      const o = d as Record<string, unknown> | null;
      if (!o || typeof o.id !== 'string' || typeof o.title !== 'string') return false;
    }
  }
  return true;
}

function docSource(d: RemoteDocSource, pages: number[] = d.page ? [d.page] : []): ReplySource {
  return {
    kind: 'document',
    id: d.docId ?? d.id,
    title: pages.length > 0 ? `${d.title} – trang ${pages.join(', ')}` : d.title,
    updatedAt: d.uploadedAt ?? new Date().toISOString(),
    // Uploaded by ULIS staff through the admin page, so not "sample content".
    verified: true,
    source: 'Tài liệu tải lên',
    page: pages[0],
  };
}

/** Map a server response to a full reply: app-content ids get titles/dates/links from bundled content. */
export function replyFromRemote(data: RemoteAnswer, question: string, ctx: AskContext): AssistantReply {
  const verdict = data.verdict ?? 'answer';
  const seen = new Set<string>();
  const sources: ReplySource[] = [];
  // One source line per document: passages of the same document are merged ("… – trang 3, 5").
  const byDoc = new Map<string, { first: RemoteDocSource; pages: number[] }>();
  for (const d of data.docSources ?? []) {
    const key = d.docId ?? d.title;
    const entry = byDoc.get(key);
    if (!entry) byDoc.set(key, { first: d, pages: d.page ? [d.page] : [] });
    else if (d.page && !entry.pages.includes(d.page)) entry.pages.push(d.page);
  }
  for (const [key, { first, pages }] of byDoc) {
    seen.add(key);
    sources.push(docSource(first, pages.sort((a, b) => a - b)));
  }
  for (const id of data.sources) {
    const found = findItemById(id);
    if (!found || seen.has(id)) continue;
    seen.add(id);
    sources.push(toSource(found));
  }
  const text = data.answer.trim();
  if (verdict === 'out_of_scope') {
    return { text, sources: [], actions: [], confidence: 'none', mode: 'remote' };
  }
  const actions = verdict === 'answer' ? actionsForSources(sources, ctx.taskId) : [];
  if (verdict !== 'answer' || sources.length === 0) actions.push(askHrAction(question, ctx.taskId ?? ctx.guideId));
  const steps = data.steps?.map((s) => s.trim()).filter(Boolean);
  return {
    text,
    steps: steps && steps.length > 0 ? steps.slice(0, 6) : undefined,
    sources: sources.slice(0, 4),
    actions: actions.slice(0, 4),
    confidence: verdict === 'answer' && sources.length > 0 ? 'high' : 'low',
    mode: 'remote',
  };
}

/** Throws on network error, timeout, non-2xx or malformed response – caller falls back to local. */
export async function askRemote(question: string, ctx: AskContext, baseUrl: string = ASSISTANT_URL): Promise<AssistantReply> {
  if (!baseUrl) throw new Error('Remote assistant URL not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, taskId: ctx.taskId, guideId: ctx.guideId, track: ctx.track }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Assistant server responded ${res.status}`);
    const data: unknown = await res.json();
    if (!isRemoteAnswer(data)) throw new Error('Malformed assistant response');
    return replyFromRemote(data, question, ctx);
  } finally {
    clearTimeout(timer);
  }
}
