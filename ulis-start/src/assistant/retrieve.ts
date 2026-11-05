// Retrieval for both assistant modes: shared matcher + context boost + chunk text.
// Pure (no React / RN imports) – the Node proxy in server/ imports this file directly.
import { content, getContact, getFaq, getGuide, getResource, getTask, type ContentBundle } from '../content';
import { normalize, searchContent, type HitKind, type SearchHit } from '../search/match';
import type { Contact, FaqItem, Guide, Meta, Resource, Task, Track } from '../types';

export interface RetrieveOptions {
  taskId?: string;
  guideId?: string;
  track?: Track;
  limit?: number;
}

export interface RetrievalResult {
  hits: SearchHit[];
  /** Ids of the items the user is asking "about" (task/guide context + their guide/contact). */
  contextIds: string[];
}

/** Multiplier + bonus for hits that belong to the task/guide the user opened the assistant from. */
export const CONTEXT_BOOST = { factor: 1.3, bonus: 2 } as const;

/** Hits scoring below this are ignored when building answers (matcher's own default is 2). */
export const RETRIEVE_MIN_SCORE = 1;

export type ContentItem =
  | { kind: 'guide'; item: Guide }
  | { kind: 'task'; item: Task }
  | { kind: 'contact'; item: Contact }
  | { kind: 'faq'; item: FaqItem }
  | { kind: 'resource'; item: Resource };

export function getItem(kind: HitKind, id: string): ContentItem | undefined {
  switch (kind) {
    case 'guide': {
      const item = getGuide(id);
      return item && { kind, item };
    }
    case 'task': {
      const item = getTask(id);
      return item && { kind, item };
    }
    case 'contact': {
      const item = getContact(id);
      return item && { kind, item };
    }
    case 'faq': {
      const item = getFaq(id);
      return item && { kind, item };
    }
    case 'resource': {
      const item = getResource(id);
      return item && { kind, item };
    }
  }
}

const KINDS: HitKind[] = ['faq', 'guide', 'task', 'contact', 'resource'];

/** Resolve a bare id (as returned by the remote server) to its content item. */
export function findItemById(id: string): ContentItem | undefined {
  for (const kind of KINDS) {
    const found = getItem(kind, id);
    if (found) return found;
  }
  return undefined;
}

export function itemTitle(c: ContentItem): string {
  switch (c.kind) {
    case 'faq':
      return c.item.q;
    case 'contact':
      return c.item.unit;
    default:
      return c.item.title;
  }
}

export function itemMeta(c: ContentItem): Meta {
  return { source: c.item.source, updatedAt: c.item.updatedAt, verified: c.item.verified };
}

/** A token occurring in at most this share of content items counts as distinctive ("rare"). */
export const RARE_DF_SHARE = 0.1;

let docFreq: { df: Map<string, number>; rare: number } | null = null;

/** Document frequency of normalized tokens over all searchable content (built once, lazily). */
function getDocFreq() {
  if (docFreq) return docFreq;
  const texts = [
    ...content.guides.map((g) => [g.title, ...g.situations, ...g.keywords, g.purpose, g.whoDoes, ...g.prepare, ...g.steps]),
    ...content.tasks.map((t) => [t.title, ...t.keywords, t.why, ...t.steps.map((s) => s.text)]),
    ...content.contacts.map((c) => [c.unit, c.role, ...c.handles]),
    ...content.faq.map((f) => [f.q, ...f.keywords, f.a]),
    ...content.resources.map((r) => [r.title, r.field]),
  ];
  const df = new Map<string, number>();
  for (const parts of texts) for (const t of new Set(normalize(parts.join(' ')).split(' '))) df.set(t, (df.get(t) ?? 0) + 1);
  docFreq = { df, rare: Math.max(3, Math.round(texts.length * RARE_DF_SHARE)) };
  return docFreq;
}

/** True when a normalized token is distinctive (occurs in few content items). */
export function isRareToken(token: string): boolean {
  const { df, rare } = getDocFreq();
  return (df.get(token) ?? 0) <= rare;
}

type SearchBundle = Pick<ContentBundle, 'guides' | 'tasks' | 'contacts' | 'faq' | 'resources' | 'synonyms'>;
let tunedContent: SearchBundle | null = null;

/**
 * Content for assistant retrieval: the bundled content with one synonym rule applied – a single common word
 * that is merely a fragment of its multi-word group ("nghỉ" in "nghỉ phép", "email" in "email công vụ") does not
 * trigger the whole group. Otherwise "Tôi bị ốm phải nghỉ…" expands into all leave vocabulary and outranks the
 * sick-leave guide. The fragment still matches directly; content/synonyms.json is left untouched.
 */
export function assistantContent(): SearchBundle {
  if (tunedContent) return tunedContent;
  const synonyms: Record<string, string[]> = {};
  for (const [canonical, variants] of Object.entries(content.synonyms)) {
    const canonTokens = normalize(canonical).split(' ');
    synonyms[canonical] = variants.filter((v) => {
      const n = normalize(v);
      const fragment = canonTokens.length > 1 && !n.includes(' ') && canonTokens.includes(n);
      return !fragment || isRareToken(n);
    });
  }
  tunedContent = { ...content, synonyms };
  return tunedContent;
}

/** Ids of the context items: the task (+ its guide and contact) or the guide (+ its contact). */
export function contextIdsFor(opts: Pick<RetrieveOptions, 'taskId' | 'guideId'>): string[] {
  const ids: string[] = [];
  const task = opts.taskId ? getTask(opts.taskId) : undefined;
  if (task) {
    ids.push(task.id);
    if (task.guideId) ids.push(task.guideId);
    if (task.contactId) ids.push(task.contactId);
  }
  const guideId = opts.guideId ?? task?.guideId;
  const guide = guideId ? getGuide(guideId) : undefined;
  if (guide) ids.push(guide.id, guide.contactId);
  return [...new Set(ids)];
}

/** Rank content for a question; items from the task/guide context get boosted. */
export function retrieve(question: string, opts: RetrieveOptions = {}): RetrievalResult {
  const { track, limit = 12 } = opts;
  const contextIds = contextIdsFor(opts);
  const boost = new Set(contextIds);
  const hits = searchContent(question, { track, limit: 40, minScore: RETRIEVE_MIN_SCORE, content: assistantContent() })
    .map((h) => (boost.has(h.id) ? { ...h, score: Math.round((h.score * CONTEXT_BOOST.factor + CONTEXT_BOOST.bonus) * 100) / 100 } : h))
    .sort((a, b) => b.score - a.score);
  return { hits: hits.slice(0, limit), contextIds };
}

/** Plain-text rendering of one content item for the LLM prompt (remote mode). */
export function chunkText(c: ContentItem): string {
  const meta = `(cập nhật ${c.item.updatedAt}${c.item.verified ? '' : ', nội dung mẫu chưa xác nhận'})`;
  switch (c.kind) {
    case 'faq':
      return `Hỏi đáp: ${c.item.q}\nTrả lời: ${c.item.a} ${meta}`;
    case 'guide': {
      const g = c.item;
      const contact = getContact(g.contactId);
      return [
        `Hướng dẫn: ${g.title} ${meta}`,
        `Mục đích: ${g.purpose}`,
        `Ai làm: ${g.whoDoes}`,
        `Chuẩn bị: ${g.prepare.join('; ')}`,
        `Các bước: ${g.steps.map((s, i) => `${i + 1}. ${s}`).join(' ')}`,
        contact ? `Liên hệ: ${contact.unit}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'task': {
      const t = c.item;
      return [
        `Việc trong hành trình: ${t.title} (hạn ngày ${t.dueDay}) ${meta}`,
        `Vì sao: ${t.why}`,
        `Các bước: ${t.steps.map((s, i) => `${i + 1}. ${s.text}`).join(' ')}`,
      ].join('\n');
    }
    case 'contact': {
      const ct = c.item;
      return [
        `Liên hệ: ${ct.unit} – ${ct.role} ${meta}`,
        `Phụ trách: ${ct.handles.join(', ')}`,
        [ct.location && `Địa điểm: ${ct.location}`, ct.hours && `Giờ làm việc: ${ct.hours}`].filter(Boolean).join('. '),
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'resource':
      return `Tài liệu/biểu mẫu: ${c.item.title} – lĩnh vực ${c.item.field} ${meta}`;
  }
}

/** Top-k chunks for the remote prompt: context items first, then the best hits. */
export function retrieveChunks(question: string, opts: RetrieveOptions & { k?: number } = {}) {
  const { k = 6 } = opts;
  const { hits, contextIds } = retrieve(question, opts);
  const ordered: { kind: HitKind; id: string }[] = [];
  const seen = new Set<string>();
  const push = (kind: HitKind, id: string) => {
    if (seen.has(id) || ordered.length >= k) return;
    seen.add(id);
    ordered.push({ kind, id });
  };
  for (const h of hits.slice(0, k)) push(h.kind, h.id);
  for (const id of contextIds) {
    const found = findItemById(id);
    if (found) push(found.kind, id);
  }
  return ordered
    .map(({ kind, id }) => getItem(kind, id))
    .filter((c): c is ContentItem => c !== undefined)
    .map((c) => ({ id: c.item.id, kind: c.kind, title: itemTitle(c), text: chunkText(c) }));
}
