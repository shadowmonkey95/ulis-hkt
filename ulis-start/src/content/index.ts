// Typed access to the bundled content JSON + cross-reference validation.
// Relative imports (not the @content alias) so Metro, web and Jest all resolve them identically.
import type {
  About,
  Benefit,
  Contact,
  FaqItem,
  Guide,
  Meta,
  Phase,
  PhaseId,
  Resource,
  Synonyms,
  Task,
} from '../types';
import { isContentImageKey } from './imageKeys';

import phasesJson from '../../content/phases.json';
import tasksJson from '../../content/tasks.json';
import guidesJson from '../../content/guides.json';
import contactsJson from '../../content/contacts.json';
import resourcesJson from '../../content/resources.json';
import faqJson from '../../content/faq.json';
import aboutJson from '../../content/about.json';
import benefitsJson from '../../content/benefits.json';
import synonymsJson from '../../content/synonyms.json';

// JSON imports infer `string` for literal unions; enum values are checked at runtime by validateContent().
export const phases = phasesJson as unknown as Phase[];
export const tasks = tasksJson as unknown as Task[];
export const guides = guidesJson as unknown as Guide[];
export const contacts = contactsJson as unknown as Contact[];
export const resources = resourcesJson as unknown as Resource[];
export const faq = faqJson as unknown as FaqItem[];
export const about = aboutJson as unknown as About;
export const benefits = benefitsJson as unknown as Benefit[];
export const synonyms = synonymsJson as unknown as Synonyms;

export interface ContentBundle {
  phases: Phase[];
  tasks: Task[];
  guides: Guide[];
  contacts: Contact[];
  resources: Resource[];
  faq: FaqItem[];
  about: About;
  benefits: Benefit[];
  synonyms: Synonyms;
}

export const content: ContentBundle = {
  phases, tasks, guides, contacts, resources, faq, about, benefits, synonyms,
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

const phaseMap = indexById(phases);
const taskMap = indexById(tasks);
const guideMap = indexById(guides);
const contactMap = indexById(contacts);
const resourceMap = indexById(resources);
const faqMap = indexById(faq);
const benefitMap = indexById(benefits);

export const getPhase = (id: PhaseId | string): Phase | undefined => phaseMap.get(id);
export const getTask = (id: string): Task | undefined => taskMap.get(id);
export const getGuide = (id: string): Guide | undefined => guideMap.get(id);
export const getContact = (id: string): Contact | undefined => contactMap.get(id);
export const getResource = (id: string): Resource | undefined => resourceMap.get(id);
export const getFaq = (id: string): FaqItem | undefined => faqMap.get(id);
export const getBenefit = (id: string): Benefit | undefined => benefitMap.get(id);

/** Phases sorted by `order`. */
export const phasesInOrder: Phase[] = [...phases].sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PHASE_IDS = ['preboard', 'welcome', 'ready', 'integrate', 'grow'];
const OWNERS = ['me', 'unit', 'hr', 'it', 'buddy'];
const TRACK_TAGS = ['all', 'lecturer', 'specialist', 'staff'];
const GUIDE_CATEGORIES = ['hr', 'admin', 'finance', 'it', 'academic', 'emulation'];
const RESOURCE_TYPES = ['form', 'regulation', 'manual', 'video', 'training'];
const RESOURCE_STATUSES = ['active', 'superseded'];
const FAQ_LINK_KINDS = ['guide', 'contact', 'task', 'resource'];
const BENEFIT_CATEGORIES = ['insurance', 'leave', 'health', 'union', 'development', 'recognition', 'facility'];
const ABOUT_UNIT_KINDS = ['office', 'center', 'faculty', 'organization'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_TASK_TITLE_LENGTH = 60;

/**
 * Checks enum values, unique ids, meta fields and every cross-reference.
 * Returns a list of human-readable errors (empty = valid).
 */
export function validateContent(c: ContentBundle = content): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const checkUnique = (label: string, items: { id: string }[]) => {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (!id) err(`${label}: item with empty id`);
      if (seen.has(id)) err(`${label}: duplicate id "${id}"`);
      seen.add(id);
    }
    return seen;
  };
  const checkMeta = (label: string, m: Meta) => {
    if (!m.source || typeof m.source !== 'string') err(`${label}: missing source`);
    if (!DATE_RE.test(m.updatedAt ?? '')) err(`${label}: updatedAt must be YYYY-MM-DD`);
    if (typeof m.verified !== 'boolean') err(`${label}: verified must be boolean`);
  };
  const nonEmpty = (label: string, value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') err(`${label}: empty text`);
  };

  const phaseIds = checkUnique('phases', c.phases);
  const taskIds = checkUnique('tasks', c.tasks);
  const guideIds = checkUnique('guides', c.guides);
  const contactIds = checkUnique('contacts', c.contacts);
  const resourceIds = checkUnique('resources', c.resources);
  checkUnique('faq', c.faq);
  checkUnique('benefits', c.benefits);
  checkUnique('about.units', c.about.units);

  // Phases
  for (const id of PHASE_IDS) if (!phaseIds.has(id)) err(`phases: missing phase "${id}"`);
  const sorted = [...c.phases].sort((a, b) => a.order - b.order);
  sorted.forEach((p, i) => {
    if (!PHASE_IDS.includes(p.id)) err(`phase ${p.id}: unknown id`);
    if (p.startDay > p.endDay) err(`phase ${p.id}: startDay > endDay`);
    const prev = sorted[i - 1];
    if (prev && p.startDay !== prev.endDay + 1) err(`phase ${p.id}: not contiguous with ${prev.id}`);
    nonEmpty(`phase ${p.id}.title`, p.title);
    nonEmpty(`phase ${p.id}.goal`, p.goal);
  });

  const resourceRef = (label: string, id: string) => {
    const r = c.resources.find((x) => x.id === id);
    if (!r) err(`${label}: unknown resource "${id}"`);
    else if (r.status === 'superseded') err(`${label}: references superseded resource "${id}"`);
  };

  // Tasks
  for (const t of c.tasks) {
    const L = `task ${t.id}`;
    checkMeta(L, t);
    const phase = c.phases.find((p) => p.id === t.phaseId);
    if (!phase) err(`${L}: unknown phaseId "${t.phaseId}"`);
    else if (t.dueDay < phase.startDay || t.dueDay > phase.endDay) {
      err(`${L}: dueDay ${t.dueDay} outside phase ${phase.id} (${phase.startDay}..${phase.endDay})`);
    }
    if (!OWNERS.includes(t.owner)) err(`${L}: unknown owner "${t.owner}"`);
    if (!Array.isArray(t.tracks) || t.tracks.length === 0) err(`${L}: tracks empty`);
    for (const tr of t.tracks) if (!TRACK_TAGS.includes(tr)) err(`${L}: unknown track "${tr}"`);
    if (t.tracks.includes('all') && t.tracks.length > 1) err(`${L}: "all" must not be combined with other tracks`);
    nonEmpty(`${L}.title`, t.title);
    if (t.title.length > MAX_TASK_TITLE_LENGTH) err(`${L}: title longer than ${MAX_TASK_TITLE_LENGTH} chars`);
    nonEmpty(`${L}.why`, t.why);
    if (typeof t.required !== 'boolean') err(`${L}: required must be boolean`);
    if (!(t.estimatedMinutes > 0)) err(`${L}: estimatedMinutes must be > 0`);
    if (!t.steps?.length) err(`${L}: no steps`);
    t.steps.forEach((s, i) => nonEmpty(`${L}.steps[${i}]`, s.text));
    if (t.guideId !== undefined && !guideIds.has(t.guideId)) err(`${L}: unknown guideId "${t.guideId}"`);
    if (t.contactId !== undefined && !contactIds.has(t.contactId)) err(`${L}: unknown contactId "${t.contactId}"`);
    for (const f of t.formIds) resourceRef(`${L}.formIds`, f);
    if (!t.keywords?.length) err(`${L}: keywords empty`);
  }

  // Guides
  for (const g of c.guides) {
    const L = `guide ${g.id}`;
    checkMeta(L, g);
    if (!GUIDE_CATEGORIES.includes(g.category)) err(`${L}: unknown category "${g.category}"`);
    if (g.situations.length < 2 || g.situations.length > 4) err(`${L}: needs 2–4 situations`);
    nonEmpty(`${L}.title`, g.title);
    nonEmpty(`${L}.purpose`, g.purpose);
    nonEmpty(`${L}.whoDoes`, g.whoDoes);
    if (!g.prepare.length) err(`${L}: prepare empty`);
    if (!g.steps.length) err(`${L}: steps empty`);
    if (!contactIds.has(g.contactId)) err(`${L}: unknown contactId "${g.contactId}"`);
    for (const f of g.formIds) resourceRef(`${L}.formIds`, f);
    if (!g.keywords.length) err(`${L}: keywords empty`);
    (g.images ?? []).forEach((img, i) => {
      if (!isContentImageKey(img.asset)) err(`${L}.images[${i}]: unknown image asset "${img.asset}"`);
      nonEmpty(`${L}.images[${i}].caption`, img.caption);
      nonEmpty(`${L}.images[${i}].alt`, img.alt);
      nonEmpty(`${L}.images[${i}].source`, img.source);
      if (img.sourceUrl !== undefined) nonEmpty(`${L}.images[${i}].sourceUrl`, img.sourceUrl);
    });
  }
  for (const cat of GUIDE_CATEGORIES) {
    if (!c.guides.some((g) => g.category === cat)) err(`guides: no guide in category "${cat}"`);
  }

  // Contacts
  for (const ct of c.contacts) {
    const L = `contact ${ct.id}`;
    checkMeta(L, ct);
    nonEmpty(`${L}.unit`, ct.unit);
    nonEmpty(`${L}.role`, ct.role);
    if (!ct.handles.length) err(`${L}: handles empty`);
    if (!ct.phone && !ct.email) err(`${L}: needs phone or email`);
  }

  // Resources
  for (const r of c.resources) {
    const L = `resource ${r.id}`;
    checkMeta(L, r);
    if (!RESOURCE_TYPES.includes(r.type)) err(`${L}: unknown type "${r.type}"`);
    if (!RESOURCE_STATUSES.includes(r.status)) err(`${L}: unknown status "${r.status}"`);
    if (r.status === 'superseded') {
      if (!r.supersededBy) err(`${L}: superseded without supersededBy`);
      else if (!resourceIds.has(r.supersededBy)) err(`${L}: unknown supersededBy "${r.supersededBy}"`);
      else if (c.resources.find((x) => x.id === r.supersededBy)?.status !== 'active') {
        err(`${L}: supersededBy must point to an active resource`);
      }
    } else if (r.supersededBy) err(`${L}: active resource must not have supersededBy`);
    nonEmpty(`${L}.url`, r.url);
    nonEmpty(`${L}.field`, r.field);
  }

  // FAQ
  for (const f of c.faq) {
    const L = `faq ${f.id}`;
    checkMeta(L, f);
    nonEmpty(`${L}.q`, f.q);
    nonEmpty(`${L}.a`, f.a);
    if (!f.keywords.length) err(`${L}: keywords empty`);
    for (const link of f.links) {
      if (!FAQ_LINK_KINDS.includes(link.kind)) { err(`${L}: unknown link kind "${link.kind}"`); continue; }
      const pool = { guide: guideIds, contact: contactIds, task: taskIds, resource: resourceIds }[link.kind];
      if (!pool.has(link.id)) err(`${L}: unknown ${link.kind} "${link.id}"`);
    }
  }

  // About
  checkMeta('about', c.about);
  for (const u of c.about.units) {
    if (!ABOUT_UNIT_KINDS.includes(u.kind)) err(`about.unit ${u.id}: unknown kind "${u.kind}"`);
    if (u.contactId !== undefined && !contactIds.has(u.contactId)) err(`about.unit ${u.id}: unknown contactId "${u.contactId}"`);
  }

  if (c.about.staffUnits !== undefined) {
    if (!Array.isArray(c.about.staffUnits)) err('about.staffUnits: must be an array');
    else {
      c.about.staffUnits.forEach((u, i) => nonEmpty(`about.staffUnits[${i}]`, u));
      if (new Set(c.about.staffUnits).size !== c.about.staffUnits.length) err('about.staffUnits: duplicate entries');
    }
  }
  if (c.about.dayAtUlis !== undefined) {
    if (!Array.isArray(c.about.dayAtUlis)) err('about.dayAtUlis: must be an array');
    else c.about.dayAtUlis.forEach((d, i) => {
      nonEmpty(`about.dayAtUlis[${i}].time`, d.time);
      nonEmpty(`about.dayAtUlis[${i}].title`, d.title);
      if (d.description !== undefined) nonEmpty(`about.dayAtUlis[${i}].description`, d.description);
    });
  }

  // Benefits
  for (const b of c.benefits) {
    const L = `benefit ${b.id}`;
    checkMeta(L, b);
    if (!BENEFIT_CATEGORIES.includes(b.category)) err(`${L}: unknown category "${b.category}"`);
    if (b.contactId !== undefined && !contactIds.has(b.contactId)) err(`${L}: unknown contactId "${b.contactId}"`);
    if (b.guideId !== undefined && !guideIds.has(b.guideId)) err(`${L}: unknown guideId "${b.guideId}"`);
  }

  // Synonyms
  for (const [term, variants] of Object.entries(c.synonyms)) {
    if (!term.trim()) err('synonyms: empty key');
    if (!Array.isArray(variants) || variants.length === 0) err(`synonyms "${term}": no variants`);
    else if (variants.some((v) => typeof v !== 'string' || !v.trim())) err(`synonyms "${term}": empty variant`);
  }

  return errors;
}

/** Throws with every problem listed if the content is inconsistent. */
export function assertContentValid(c: ContentBundle = content): void {
  const errors = validateContent(c);
  if (errors.length > 0) {
    throw new Error(`Content validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  }
}

// Fail fast during development so broken references never reach a screen.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  assertContentValid();
}
