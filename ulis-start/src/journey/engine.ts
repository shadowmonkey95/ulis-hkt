// Journey engine – pure functions only (no React, no storage).
// Contract: docs/JOURNEY_SPEC.md "Engine API".
import type {
  BadgeId,
  CheckinDay,
  Health,
  JourneyState,
  Phase,
  PhaseId,
  Profile,
  Task,
  TaskStatus,
  Track,
} from '../types';

/** taskId -> ISO completedAt (the `completed` slice of JourneyState). */
export type CompletedMap = JourneyState['completed'];

export interface ProgressStat {
  done: number;
  total: number;
  /** 0..100, rounded. 0 when total is 0. */
  pct: number;
}

export const JOURNEY_LENGTH = 30;
export const DEMO_MIN_DAY = -7;
export const DEMO_MAX_DAY = 31;
export const CHECKIN_DAYS: readonly CheckinDay[] = [3, 7, 15, 30];
export const BADGE_ORDER: readonly BadgeId[] = ['kickoff', 'paperwork', 'ready', 'connected', 'journey30'];
/** Optional tasks older than this many days collapse to `skipped`. */
export const SKIP_AFTER_DAYS = 3;
/** dueSoon window: currentDay ≤ dueDay ≤ currentDay + DUE_SOON_DAYS. */
export const DUE_SOON_DAYS = 2;
export const CONTACTS_FOR_CONNECTED = 3;

export const emptyJourneyState = (): JourneyState => ({
  completed: {},
  checkins: {},
  badges: {},
  contactsViewed: [],
  demoDayOverride: null,
});

// ---------------------------------------------------------------------------
// Dates (local time, normalised to midnight)
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses "YYYY-MM-DD" (or an ISO string) as a LOCAL calendar date at midnight. */
export function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return startOfDay(Number.isNaN(d.getTime()) ? new Date() : d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Formats a Date as local "YYYY-MM-DD". */
export function toDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Whole calendar days from `a` to `b` (DST-safe). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

/**
 * Day 1 = startDate. Pre-boarding = Day ≤ 0. Calendar days (single place to change to business days).
 * A non-null demo override wins.
 */
export function getCurrentDay(
  profile: Pick<Profile, 'startDate'> | null,
  now: Date,
  demoOverride?: number | null,
): number {
  if (demoOverride !== undefined && demoOverride !== null) return demoOverride;
  if (!profile) return DEMO_MIN_DAY;
  return daysBetween(parseLocalDate(profile.startDate), now) + 1;
}

/** The calendar date of a journey day (inverse of getCurrentDay). */
export function dateOfDay(startDate: string, day: number): Date {
  return addDays(parseLocalDate(startDate), day - 1);
}

export function clampDemoDay(day: number): number {
  return Math.min(DEMO_MAX_DAY, Math.max(DEMO_MIN_DAY, Math.round(day)));
}

// ---------------------------------------------------------------------------
// Phases & tracks
// ---------------------------------------------------------------------------

export function getTasksForTrack(allTasks: Task[], track: Track): Task[] {
  return allTasks
    .filter((t) => t.tracks.includes('all') || t.tracks.includes(track))
    .sort((a, b) => a.dueDay - b.dueDay || Number(b.required) - Number(a.required));
}

/** Phase containing `day`; days before the first phase map to the first, after the last to the last. */
export function getPhaseForDay(phases: Phase[], day: number): Phase {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const hit = sorted.find((p) => day >= p.startDay && day <= p.endDay);
  if (hit) return hit;
  return day < sorted[0].startDay ? sorted[0] : sorted[sorted.length - 1];
}

export function isPhaseUnlocked(phase: Phase, currentDay: number): boolean {
  return phase.startDay <= currentDay;
}

// ---------------------------------------------------------------------------
// Task status
// ---------------------------------------------------------------------------

/**
 * Derived status (JOURNEY_SPEC "Task states"). Precedence: done → locked → overdue/skipped → dueSoon → upcoming.
 * `phases` is used for the locked rule; when omitted, the task's own dueDay range is not locked.
 *
 * Resolved ambiguities:
 * - Pre-boarding grace: while currentDay ≤ 0, preboard tasks whose dueDay already passed are `dueSoon`,
 *   not `overdue` (people often install the app only a few days before Day 1). From Day 1 they are overdue.
 * - Optional task 1..3 days past due → `dueSoon` (still worth doing, never red); > 3 days → `skipped`.
 */
export function getTaskStatus(
  task: Task,
  progress: CompletedMap,
  currentDay: number,
  phases?: Phase[],
): TaskStatus {
  if (progress[task.id]) return 'done';
  const phase = phases?.find((p) => p.id === task.phaseId);
  if (phase && phase.startDay > currentDay) return 'locked';
  if (task.dueDay < currentDay) {
    if (currentDay <= 0) return 'dueSoon';
    if (task.required) return 'overdue';
    return task.dueDay < currentDay - SKIP_AFTER_DAYS ? 'skipped' : 'dueSoon';
  }
  if (task.dueDay <= currentDay + DUE_SOON_DAYS) return 'dueSoon';
  return 'upcoming';
}

/** Days a task is overdue (0 when not overdue). */
export function overdueDays(task: Task, progress: CompletedMap, currentDay: number, phases?: Phase[]): number {
  return getTaskStatus(task, progress, currentDay, phases) === 'overdue' ? currentDay - task.dueDay : 0;
}

// ---------------------------------------------------------------------------
// Progress, today, health
// ---------------------------------------------------------------------------

/** Required tasks only – optional tasks never dilute the percentage. */
export function getProgress(tasks: Task[], progress: CompletedMap, phaseId?: PhaseId): ProgressStat {
  const pool = tasks.filter((t) => t.required && (phaseId === undefined || t.phaseId === phaseId));
  const done = pool.filter((t) => Boolean(progress[t.id])).length;
  const total = pool.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function getPhaseProgress(
  tasks: Task[],
  progress: CompletedMap,
  phases: Phase[],
): Record<PhaseId, ProgressStat> {
  const out = {} as Record<PhaseId, ProgressStat>;
  for (const p of phases) out[p.id] = getProgress(tasks, progress, p.id);
  return out;
}

/** Overdue + dueSoon tasks, sorted overdue → required → dueDay, capped at `limit`. */
export function getTodayTasks(
  tasks: Task[],
  progress: CompletedMap,
  currentDay: number,
  limit = 3,
  phases?: Phase[],
): Task[] {
  const rank = (s: TaskStatus) => (s === 'overdue' ? 0 : 1);
  return tasks
    .map((t) => ({ t, s: getTaskStatus(t, progress, currentDay, phases) }))
    .filter(({ s }) => s === 'overdue' || s === 'dueSoon')
    .sort(
      (a, b) =>
        rank(a.s) - rank(b.s) ||
        Number(b.t.required) - Number(a.t.required) ||
        a.t.dueDay - b.t.dueDay,
    )
    .slice(0, limit)
    .map(({ t }) => t);
}

export function getOverdueTasks(tasks: Task[], progress: CompletedMap, currentDay: number, phases?: Phase[]): Task[] {
  return tasks
    .filter((t) => getTaskStatus(t, progress, currentDay, phases) === 'overdue')
    .sort((a, b) => a.dueDay - b.dueDay);
}

/** onTrack: 0 overdue required · behind: 1–2 · needsHelp: ≥3. */
export function getHealth(tasks: Task[], progress: CompletedMap, currentDay: number, phases?: Phase[]): Health {
  const n = getOverdueTasks(tasks, progress, currentDay, phases).length;
  if (n === 0) return 'onTrack';
  return n <= 2 ? 'behind' : 'needsHelp';
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface BadgeInput {
  /** Track-filtered tasks. */
  tasks: Task[];
  journey: JourneyState;
}

const allRequiredDone = (tasks: Task[], completed: CompletedMap) =>
  tasks.length > 0 && tasks.every((t) => !t.required || Boolean(completed[t.id])) && tasks.some((t) => t.required);

/** Remaining units of work before a badge unlocks (0 = unlocked). */
export function getBadgeRemaining(badge: BadgeId, { tasks, journey }: BadgeInput): number {
  const done = (t: Task) => Boolean(journey.completed[t.id]);
  const missing = (pool: Task[]) => pool.filter((t) => t.required && !done(t)).length;
  switch (badge) {
    case 'kickoff':
      return tasks.some(done) ? 0 : 1;
    case 'paperwork': {
      const pool = tasks.filter((t) => t.phaseId === 'preboard' || t.phaseId === 'welcome');
      return allRequiredDone(pool, journey.completed) ? 0 : Math.max(1, missing(pool));
    }
    case 'ready': {
      const pool = tasks.filter((t) => t.phaseId === 'ready');
      return allRequiredDone(pool, journey.completed) ? 0 : Math.max(1, missing(pool));
    }
    case 'connected': {
      const buddy = tasks.filter((t) => t.owner === 'buddy');
      const buddyMissing = buddy.length === 0 ? 1 : buddy.filter((t) => !done(t)).length;
      const contactsMissing = Math.max(0, CONTACTS_FOR_CONNECTED - new Set(journey.contactsViewed).size);
      return buddyMissing + contactsMissing;
    }
    case 'journey30': {
      const overall = getProgress(tasks, journey.completed);
      const tasksMissing = overall.total === 0 ? 1 : overall.total - overall.done;
      return tasksMissing + (journey.checkins[30] ? 0 : 1);
    }
  }
}

/** All badges whose condition currently holds, plus badges already stored (badges never re-lock). */
export function getUnlockedBadges(state: BadgeInput): BadgeId[] {
  return BADGE_ORDER.filter((b) => Boolean(state.journey.badges[b]) || getBadgeRemaining(b, state) === 0);
}

/** Badges that hold now but are not yet stored in `journey.badges`. */
export function getNewlyUnlockedBadges(state: BadgeInput): BadgeId[] {
  return getUnlockedBadges(state).filter((b) => !state.journey.badges[b]);
}

/** Next not-yet-unlocked milestone for the "Còn N việc để đạt huy hiệu …" teaser (kickoff excluded once any task is done). */
export function getNextMilestone(state: BadgeInput): { badge: BadgeId; remaining: number } | null {
  for (const b of BADGE_ORDER) {
    if (state.journey.badges[b]) continue;
    const remaining = getBadgeRemaining(b, state);
    if (remaining > 0) return { badge: b, remaining };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

/** Most recent check-in day that has passed (≤ currentDay) and is not answered yet. */
export function getPendingCheckin(state: Pick<JourneyState, 'checkins'>, currentDay: number): CheckinDay | null {
  for (let i = CHECKIN_DAYS.length - 1; i >= 0; i--) {
    const d = CHECKIN_DAYS[i];
    if (d <= currentDay) return state.checkins[d] ? null : d;
  }
  return null;
}

export function isCheckinDay(n: number): n is CheckinDay {
  return (CHECKIN_DAYS as readonly number[]).includes(n);
}

/** Tasks representing a pulse check-in follow the id convention `…-checkin-d<day>`. */
export function getCheckinDayForTask(task: Pick<Task, 'id'>): CheckinDay | null {
  const m = /-checkin-d(\d+)$/.exec(task.id);
  if (!m) return null;
  const n = Number(m[1]);
  return isCheckinDay(n) ? n : null;
}

export function getCheckinTaskIds(allTasks: Task[], day: CheckinDay): string[] {
  return allTasks.filter((t) => getCheckinDayForTask(t) === day).map((t) => t.id);
}

// ---------------------------------------------------------------------------
// Demo helpers
// ---------------------------------------------------------------------------

/** Picks ~half of the not-yet-done (non check-in) tasks. `random` is injectable for tests. */
export function pickRandomHalf(tasks: Task[], progress: CompletedMap, random: () => number = Math.random): string[] {
  const pool = tasks.filter((t) => !progress[t.id] && getCheckinDayForTask(t) === null);
  const shuffled = pool
    .map((t) => ({ id: t.id, k: random() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id);
  return shuffled.slice(0, Math.ceil(pool.length / 2));
}

// ---------------------------------------------------------------------------
// List filters (Hành trình chips: Tất cả · Của tôi · Chưa xong · Bắt buộc)
// ---------------------------------------------------------------------------

export type TaskFilter = 'all' | 'mine' | 'open' | 'required';

export function filterTasks(tasks: Task[], filter: TaskFilter, statusOf: (id: string) => TaskStatus): Task[] {
  switch (filter) {
    case 'mine':
      return tasks.filter((t) => t.owner === 'me');
    case 'open':
      return tasks.filter((t) => statusOf(t.id) !== 'done');
    case 'required':
      return tasks.filter((t) => t.required);
    default:
      return tasks;
  }
}

/**
 * Timeline state of a phase: `done` only when every required task is done (filled dot);
 * the phase containing the current day is `current`; everything else (future, or past but unfinished) is `upcoming`.
 */
export function getPhaseState(
  phase: Phase,
  currentPhase: Phase,
  stat: ProgressStat,
): 'done' | 'current' | 'upcoming' {
  if (phase.id === currentPhase.id) return 'current';
  return stat.total > 0 && stat.done === stat.total && phase.order < currentPhase.order ? 'done' : 'upcoming';
}
