// Local (offline) assistant: retrieval over bundled content → templated, cited answer.
// Pure function (no React / storage); the chat screen executes the returned actions.
import { getContact, getGuide, getTask } from '../content';
import { getCheckinDayForTask } from '../journey/engine';
import { searchContent, tokenize, type HitKind, type SearchHit } from '../search/match';
import type { Contact, Guide, Task } from '../types';
import { GUARD_TEXT, detectOutOfScope, type GuardHit } from './guard';
import { assistantContent, getItem, isRareToken, itemMeta, itemTitle, retrieve, type ContentItem } from './retrieve';
import type { AskContext, AssistantAction, AssistantReply, ReplySource } from './types';

/** Best adjusted score below this → confidence 'none' (honest fallback). Calibrated in eval.test.ts. */
export const NONE_THRESHOLD = 3;
/** Best adjusted score at/above this → confidence 'high'. */
export const HIGH_THRESHOLD = 6;
/** FAQ answers are preferred when they score at least this share of the best hit. */
export const FAQ_PREFERENCE = 0.6;
/** Answer-quality factor per kind: curated FAQ/guides answer better than tasks, contacts, documents. */
export const KIND_FACTOR: Record<HitKind, number> = { faq: 1.15, guide: 1.1, task: 0.85, contact: 0.9, resource: 0.7 };
/**
 * Multi-word questions whose hit matched only scattered common syllables (no phrase such as "nghi phep",
 * no distinctive word such as "wifi") are usually coincidences in Vietnamese ("công thức" ≠ "công văn").
 */
export const SCATTERED_FACTOR = 0.5;
/** True when a hit matched a phrase or at least one distinctive (rare) word. */
function isAnchored(matched: string[]): boolean {
  return matched.some((m) => m.includes(' ') || isRareToken(m));
}

/** The unit that receives "Gửi câu hỏi tới Phòng TCTT". */
export const HR_CONTACT_ID = 'ct-hr';
export const NO_INFO_TEXT = 'Mình chưa có thông tin chính thức về việc này.';
export const ASK_HR_LABEL = 'Gửi câu hỏi tới Phòng TCTT';
export const DISCLAIMER = 'Trợ lý chỉ hướng dẫn, vui lòng kiểm tra văn bản hiện hành.';

const MAX_STEPS = 6;
const MAX_SOURCES = 3;

export function toSource(c: ContentItem): ReplySource {
  return { kind: c.kind, id: c.item.id, title: itemTitle(c), ...itemMeta(c) };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const guideAction = (g: Guide): AssistantAction => ({
  kind: 'route',
  label: `Mở hướng dẫn: ${g.title}`,
  route: { pathname: '/guide/[id]', params: { id: g.id } },
  icon: 'book-open',
});

export const contactAction = (c: Contact): AssistantAction => ({
  kind: 'route',
  label: `Liên hệ ${c.unit}`,
  route: { pathname: '/contacts/[id]', params: { id: c.id } },
  icon: 'user',
});

export const taskAction = (t: Task): AssistantAction => ({
  kind: 'route',
  label: `Xem việc: ${t.title}`,
  route: { pathname: '/task/[id]', params: { id: t.id } },
  icon: 'check-square',
});

export const askHrAction = (question: string, relatedId?: string): AssistantAction => ({
  kind: 'ask-hr',
  label: ASK_HR_LABEL,
  question,
  relatedId,
  icon: 'send',
});

/** "Mark task done" chip – not for check-in tasks (they are completed by answering the check-in). */
export function completeAction(t: Task): AssistantAction | null {
  if (getCheckinDayForTask(t) !== null) return null;
  return {
    kind: 'complete-task',
    label: t.owner === 'me' ? 'Đánh dấu việc này đã xong' : 'Xác nhận đã nhận',
    taskId: t.id,
    icon: 'check-circle',
  };
}

const libraryAction: AssistantAction = { kind: 'route', label: 'Mở Tài liệu & biểu mẫu', route: '/library', icon: 'folder' };

function actionKey(a: AssistantAction): string {
  if (a.kind === 'route') return typeof a.route === 'string' ? a.route : JSON.stringify(a.route);
  return a.kind === 'ask-hr' ? 'ask-hr' : `complete:${a.taskId}`;
}

function dedupeActions(actions: (AssistantAction | null | undefined)[], max = 4): AssistantAction[] {
  const seen = new Set<string>();
  const out: AssistantAction[] = [];
  for (const a of actions) {
    if (!a || seen.has(actionKey(a))) continue;
    seen.add(actionKey(a));
    out.push(a);
  }
  return out.slice(0, max);
}

/** Navigation chips for a set of sources (used by remote mode, which only returns ids). */
export function actionsForSources(sources: ReplySource[], contextTaskId?: string): AssistantAction[] {
  const actions: (AssistantAction | null)[] = [];
  const ctxTask = contextTaskId ? getTask(contextTaskId) : undefined;
  if (ctxTask) actions.push(completeAction(ctxTask));
  for (const s of sources) {
    if (s.kind === 'document') continue; // uploaded documents have no in-app screen
    const found = getItem(s.kind, s.id);
    if (!found) continue;
    if (found.kind === 'guide') {
      actions.push(guideAction(found.item));
      const ct = getContact(found.item.contactId);
      if (ct) actions.push(contactAction(ct));
    } else if (found.kind === 'contact') actions.push(contactAction(found.item));
    else if (found.kind === 'task') actions.push(taskAction(found.item));
    else if (found.kind === 'resource') actions.push(libraryAction);
    else if (found.kind === 'faq') {
      for (const l of found.item.links) {
        if (l.kind === 'guide') { const g = getGuide(l.id); if (g) actions.push(guideAction(g)); }
        if (l.kind === 'contact') { const c = getContact(l.id); if (c) actions.push(contactAction(c)); }
        if (l.kind === 'task') { const t = getTask(l.id); if (t) actions.push(taskAction(t)); }
      }
    }
  }
  return dedupeActions(actions);
}

// ---------------------------------------------------------------------------
// Answer composition
// ---------------------------------------------------------------------------

interface Ranked extends SearchHit {
  adjusted: number;
}

function rank(hits: SearchHit[], question: string): Ranked[] {
  const multiWord = tokenize(question).length > 1;
  return hits
    .map((h) => {
      const scattered = multiWord && !isAnchored(h.matched);
      const factor = KIND_FACTOR[h.kind] * (scattered ? SCATTERED_FACTOR : 1);
      return { ...h, adjusted: Math.round(h.score * factor * 100) / 100 };
    })
    .sort((a, b) => b.adjusted - a.adjusted);
}

/** Related guide / contact / task for the primary item (via explicit links first, then hits). */
function related(primary: ContentItem, ranked: Ranked[]) {
  let guide: Guide | undefined;
  let contact: Contact | undefined;
  let task: Task | undefined;
  let resource = false;
  switch (primary.kind) {
    case 'guide':
      guide = primary.item;
      contact = getContact(primary.item.contactId);
      break;
    case 'task':
      task = primary.item;
      guide = primary.item.guideId ? getGuide(primary.item.guideId) : undefined;
      contact = primary.item.contactId ? getContact(primary.item.contactId) : undefined;
      break;
    case 'contact':
      contact = primary.item;
      break;
    case 'faq':
      for (const l of primary.item.links) {
        if (l.kind === 'guide') guide ??= getGuide(l.id);
        if (l.kind === 'contact') contact ??= getContact(l.id);
        if (l.kind === 'task') task ??= getTask(l.id);
        if (l.kind === 'resource') resource = true;
      }
      break;
    case 'resource':
      resource = true;
      break;
  }
  // Fill gaps from strong hits (same topic) – e.g. a FAQ without a guide link.
  const top = ranked[0]?.adjusted ?? 0;
  const strong = (kind: HitKind) => ranked.find((h) => h.kind === kind && h.adjusted >= top * 0.5);
  if (!guide) { const h = strong('guide'); guide = h ? getGuide(h.id) : undefined; }
  if (!contact) contact = getContact(guide?.contactId ?? task?.contactId ?? strong('contact')?.id ?? '');
  return { guide, contact, task, resource };
}

function guardedReply(question: string, guard: GuardHit, ctx: AskContext): AssistantReply {
  // Point to the guide for the triggering topic (data-driven lookup, e.g. "luong" → Lương guide).
  const topicHit = searchContent(guard.topic, { kinds: ['guide'], limit: 1, minScore: 1, content: assistantContent() })[0];
  const questionHit = rank(retrieve(question, ctx).hits, question).find((h) => h.kind === 'guide' && h.adjusted >= NONE_THRESHOLD);
  const ctxGuide = ctx.guideId ? getGuide(ctx.guideId) : ctx.taskId ? getGuide(getTask(ctx.taskId)?.guideId ?? '') : undefined;
  // Prefer the guide matching the whole question ("nghỉ ốm … bao nhiêu % lương" → sick-leave guide),
  // then the triggering topic ("lương" → salary guide). Legal questions never fall back to the topic.
  const questionGuide = questionHit ? getGuide(questionHit.id) : undefined;
  const guide =
    guard.reason === 'legal' ? ctxGuide ?? questionGuide : questionGuide ?? getGuide(topicHit?.id ?? '') ?? ctxGuide;
  const contact = getContact(guard.reason === 'legal' ? HR_CONTACT_ID : guide?.contactId ?? HR_CONTACT_ID);

  const pointers: string[] = [];
  if (guide) pointers.push(`xem hướng dẫn “${guide.title}”`);
  if (contact) pointers.push(`hỏi trực tiếp ${contact.unit}`);
  const text = `${GUARD_TEXT[guard.reason]}${pointers.length ? ` Bạn vui lòng ${pointers.join(' và ')}.` : ''}`;

  return {
    text,
    sources: [guide && toSource({ kind: 'guide', item: guide }), contact && toSource({ kind: 'contact', item: contact })].filter(
      (s): s is ReplySource => s !== undefined,
    ),
    actions: dedupeActions([guide && guideAction(guide), contact && contactAction(contact), askHrAction(question, ctx.taskId ?? ctx.guideId)]),
    confidence: 'low',
    guarded: guard.reason,
    mode: 'local',
  };
}

/** Weak guide matches below NONE_THRESHOLD are offered as "might be related" (never as an answer). */
export const SUGGEST_MIN_SCORE = 2;

function noInfoReply(question: string, ranked: Ranked[], ctx: AskContext): AssistantReply {
  // Only suggest a guide/unit when the match is meaningful; otherwise Phòng TCTT.
  const suggestedGuide = getGuide(ranked.find((h) => h.kind === 'guide' && h.adjusted >= SUGGEST_MIN_SCORE)?.id ?? '');
  const contactHit = ranked.find((h) => h.kind === 'contact' && h.adjusted >= SUGGEST_MIN_SCORE);
  const contact = getContact(contactHit?.id ?? suggestedGuide?.contactId ?? '') ?? getContact(HR_CONTACT_ID);
  let text = NO_INFO_TEXT;
  if (suggestedGuide) text += ` Có thể hướng dẫn “${suggestedGuide.title}” liên quan đến câu hỏi của bạn.`;
  text += contact
    ? ` Bạn có thể hỏi ${contact.unit}, hoặc gửi câu hỏi để Phòng TCTT bổ sung vào cẩm nang.`
    : ' Bạn có thể gửi câu hỏi để Phòng TCTT bổ sung vào cẩm nang.';
  return {
    text,
    sources: [],
    actions: dedupeActions([
      suggestedGuide && guideAction(suggestedGuide),
      contact && contactAction(contact),
      askHrAction(question, ctx.taskId ?? ctx.guideId),
    ]),
    confidence: 'none',
    mode: 'local',
  };
}

function contactSentence(c: Contact): string {
  const extra = [c.location, c.hours].filter(Boolean).join(', ');
  return `Việc này do ${c.unit} phụ trách (${c.role}).${extra ? ` ${extra}.` : ''}`;
}

/** Answer a question from bundled content only. Never calls the network. */
export function answerLocal(question: string, ctx: AskContext = {}): AssistantReply {
  const q = question.trim();
  if (!q) return noInfoReply(q, [], ctx);

  const guard = detectOutOfScope(q);
  if (guard) return guardedReply(q, guard, ctx);

  const ranked = rank(retrieve(q, ctx).hits, q);
  const best = ranked[0];
  if (!best || best.adjusted < NONE_THRESHOLD) return noInfoReply(q, ranked, ctx);

  // Prefer a curated FAQ answer when it is close to the best hit.
  const faqHit = ranked.find((h) => h.kind === 'faq' && h.adjusted >= best.adjusted * FAQ_PREFERENCE);
  const primaryHit = faqHit ?? best;
  const primary = getItem(primaryHit.kind, primaryHit.id);
  if (!primary) return noInfoReply(q, ranked, ctx);

  const ctxTask = ctx.taskId ? getTask(ctx.taskId) : undefined;
  const rel = related(primary, ranked);
  const { guide, contact, resource } = rel;
  // The task the user asked about is always cited.
  const task = rel.task ?? ctxTask;
  const confidence = best.adjusted >= HIGH_THRESHOLD ? 'high' : 'low';

  let text: string;
  let steps: string[] | undefined;
  switch (primary.kind) {
    case 'faq':
      text = primary.item.a;
      steps = guide?.steps;
      break;
    case 'guide':
      text = `${primary.item.purpose} Người thực hiện: ${primary.item.whoDoes}`;
      steps = primary.item.steps;
      break;
    case 'task':
      text = `“${primary.item.title}”: ${primary.item.why}`;
      steps = primary.item.steps.map((s) => s.text);
      break;
    case 'contact':
      text = contactSentence(primary.item);
      break;
    case 'resource':
      text = `Tài liệu liên quan: “${primary.item.title}”. Bạn mở mục Tài liệu & biểu mẫu để xem bản hiện hành.`;
      break;
  }
  if (contact && primary.kind !== 'contact' && !text.includes(contact.unit)) text += ` Nếu cần hỗ trợ, liên hệ ${contact.unit}.`;
  if (confidence === 'low') text = `Có thể bạn đang hỏi về “${itemTitle(primary)}”. ${text}`;

  const sourceItems: (ContentItem | undefined)[] = [
    primary,
    guide && { kind: 'guide', item: guide },
    task && primary.kind !== 'task' ? { kind: 'task', item: task } : undefined,
  ];
  const seen = new Set<string>();
  const sources = sourceItems
    .filter((c): c is ContentItem => c !== undefined)
    .filter((c) => {
      if (seen.has(c.item.id)) return false;
      seen.add(c.item.id);
      return true;
    })
    .slice(0, MAX_SOURCES)
    .map(toSource);

  const actionTask = ctxTask ?? (primary.kind === 'task' ? primary.item : undefined);
  const actions = dedupeActions([
    actionTask && completeAction(actionTask),
    guide && guideAction(guide),
    contact && contactAction(contact),
    confidence === 'low' ? askHrAction(q, ctx.taskId ?? ctx.guideId) : undefined,
    task && task.id !== actionTask?.id ? taskAction(task) : undefined,
    resource ? libraryAction : undefined,
  ]);

  return { text, steps: steps?.slice(0, MAX_STEPS), sources, actions, confidence, mode: 'local' };
}
