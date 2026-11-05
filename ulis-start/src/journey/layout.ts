// Pure layout constants/helpers for the journey screens on desktop web (see src/ui/useLayout.ts for breakpoints).
import type { Task } from '../types';

/** Reading width of a task detail page opened directly on desktop. */
export const READING_MAX_WIDTH = 760;
/** Width of centered forms (demo controls, check-in) on desktop. */
export const FORM_MAX_WIDTH = 640;
/** Onboarding card width on desktop. */
export const ONBOARDING_CARD_MAX_WIDTH = 560;
/** Medium (768–1023) single-column screens get a comfortable, wider column. */
export const MEDIUM_COLUMN_MAX_WIDTH = 840;

export const TODAY_LIMIT_COMPACT = 3;
export const TODAY_LIMIT_WIDE = 5;

/** "Việc của hôm nay" shows 3 on phones (spec) and up to 5 on wide desktop. */
export function todayTaskLimit(isWide: boolean): number {
  return isWide ? TODAY_LIMIT_WIDE : TODAY_LIMIT_COMPACT;
}

/** Slice of the already-sorted due list for the current layout + how many are hidden. */
export function sliceTodayTasks(dueTasks: Task[], isWide: boolean): { visible: Task[]; hidden: number } {
  const limit = todayTaskLimit(isWide);
  return { visible: dueTasks.slice(0, limit), hidden: Math.max(0, dueTasks.length - limit) };
}

/**
 * Master–detail selection: keep the selected id only while it is still in the visible list
 * (e.g. a filter change hides it → panel falls back to the empty state).
 */
export function resolveSelectedTask(selectedId: string | null, visible: Task[]): Task | null {
  if (!selectedId) return null;
  return visible.find((t) => t.id === selectedId) ?? null;
}
