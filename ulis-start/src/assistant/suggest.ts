// Suggested questions for the empty chat: FAQ items related to the user's open journey tasks first.
import { faq as allFaq, tasks as allTasks } from '../content';
import type { FaqItem, Task, Track } from '../types';

const fitsTrack = (t: Task, track?: Track) => !track || t.tracks.includes('all') || t.tracks.includes(track);

/**
 * Up to `n` FAQ items: first those linked to the user's not-yet-done tasks (by due day) or their guides,
 * then the rest in content order. FAQ items that only point to other tracks' tasks are skipped.
 */
export function suggestQuestions(opts: {
  track?: Track;
  /** Track-filtered journey tasks (sorted by dueDay). */
  tasks?: Task[];
  completed?: Record<string, string>;
  n?: number;
  faq?: FaqItem[];
}): FaqItem[] {
  const { track, completed = {}, n = 5, faq = allFaq } = opts;
  const tasks = (opts.tasks ?? allTasks.filter((t) => fitsTrack(t, track))).filter((t) => !completed[t.id]);
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  const relevant = (f: FaqItem) =>
    f.links.every((l) => {
      const t = l.kind === 'task' ? taskById.get(l.id) : undefined;
      return !t || fitsTrack(t, track);
    });

  const picked: FaqItem[] = [];
  const add = (f: FaqItem | undefined) => {
    if (f && picked.length < n && !picked.includes(f) && relevant(f)) picked.push(f);
  };
  for (const t of tasks) {
    add(faq.find((f) => f.links.some((l) => (l.kind === 'task' && l.id === t.id) || (l.kind === 'guide' && l.id === t.guideId))));
    if (picked.length >= n) return picked;
  }
  for (const f of faq) add(f);
  return picked;
}
