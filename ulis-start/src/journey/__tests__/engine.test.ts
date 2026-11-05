import { phases, tasks as allTasks } from '../../content';
import type { JourneyState, Phase, Task, TaskStatus } from '../../types';
import {
  addDays,
  clampDemoDay,
  emptyJourneyState,
  filterTasks,
  getBadgeRemaining,
  getCheckinDayForTask,
  getCheckinTaskIds,
  getCurrentDay,
  getHealth,
  getNewlyUnlockedBadges,
  getNextMilestone,
  getPendingCheckin,
  getPhaseForDay,
  getPhaseState,
  getProgress,
  getTaskStatus,
  getTasksForTrack,
  getTodayTasks,
  getUnlockedBadges,
  pickRandomHalf,
  toDateKey,
} from '../engine';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const base: Omit<Task, 'id' | 'phaseId' | 'dueDay'> = {
  title: 't',
  why: 'w',
  owner: 'me',
  tracks: ['all'],
  required: true,
  estimatedMinutes: 10,
  steps: [{ text: 's' }],
  formIds: [],
  keywords: ['k'],
  source: 'test',
  updatedAt: '2026-11-03',
  verified: false,
};
const mk = (id: string, phaseId: Task['phaseId'], dueDay: number, extra: Partial<Task> = {}): Task => ({
  ...base,
  id,
  phaseId,
  dueDay,
  ...extra,
});

const state = (patch: Partial<JourneyState> = {}): JourneyState => ({ ...emptyJourneyState(), ...patch });
const doneMap = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, '2026-11-03T08:00:00.000Z']));

const lecturer = getTasksForTrack(allTasks, 'lecturer');
const specialist = getTasksForTrack(allTasks, 'specialist');

// ---------------------------------------------------------------------------
// getCurrentDay
// ---------------------------------------------------------------------------

describe('getCurrentDay', () => {
  const start = '2026-11-10';
  const at = (offset: number, hour = 9) => {
    const d = addDays(new Date(2026, 10, 10), offset);
    d.setHours(hour, 30);
    return d;
  };

  it('start date itself is Day 1 regardless of time of day', () => {
    expect(getCurrentDay({ startDate: start }, at(0, 0))).toBe(1);
    expect(getCurrentDay({ startDate: start }, at(0, 23))).toBe(1);
  });

  it('day before start is Day 0 and a week before is Day -7 (pre-boarding)', () => {
    expect(getCurrentDay({ startDate: start }, at(-1))).toBe(0);
    expect(getCurrentDay({ startDate: start }, at(-8))).toBe(-7);
  });

  it('Day 30 and Day 31 boundaries', () => {
    expect(getCurrentDay({ startDate: start }, at(29))).toBe(30);
    expect(getCurrentDay({ startDate: start }, at(30))).toBe(31);
  });

  it('works across month boundaries', () => {
    expect(getCurrentDay({ startDate: '2026-01-31' }, new Date(2026, 1, 1, 10))).toBe(2);
  });

  it('demo override wins, including 0 and negative values', () => {
    expect(getCurrentDay({ startDate: start }, at(5), 0)).toBe(0);
    expect(getCurrentDay({ startDate: start }, at(5), -7)).toBe(-7);
    expect(getCurrentDay({ startDate: start }, at(5), null)).toBe(6);
  });

  it('clampDemoDay keeps the stepper within −7…31', () => {
    expect(clampDemoDay(-20)).toBe(-7);
    expect(clampDemoDay(40)).toBe(31);
    expect(clampDemoDay(9)).toBe(9);
  });

  it('toDateKey round-trips local dates', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

// ---------------------------------------------------------------------------
// Tracks & phases
// ---------------------------------------------------------------------------

describe('getTasksForTrack', () => {
  it('includes common tasks and only the matching track', () => {
    expect(lecturer.some((t) => t.id === 't-lec-syllabus')).toBe(true);
    expect(lecturer.some((t) => t.id === 't-spec-eoffice')).toBe(false);
    expect(specialist.some((t) => t.id === 't-spec-eoffice')).toBe(true);
    expect(specialist.some((t) => t.id === 't-lec-syllabus')).toBe(false);
    for (const t of lecturer) expect(t.tracks.includes('all') || t.tracks.includes('lecturer')).toBe(true);
    // Common tasks are shared, so completed entries survive a track switch.
    expect(lecturer.some((t) => t.id === 't-preboard-dossier')).toBe(true);
    expect(specialist.some((t) => t.id === 't-preboard-dossier')).toBe(true);
  });

  it('is sorted by dueDay', () => {
    const days = lecturer.map((t) => t.dueDay);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});

describe('getPhaseForDay', () => {
  it.each([
    [-7, 'preboard'],
    [0, 'preboard'],
    [1, 'welcome'],
    [9, 'integrate'],
    [30, 'grow'],
    [31, 'grow'],
    [-20, 'preboard'],
  ])('day %i → %s', (day, id) => {
    expect(getPhaseForDay(phases, day).id).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// getTaskStatus
// ---------------------------------------------------------------------------

describe('getTaskStatus', () => {
  const p: Phase[] = phases;
  const welcomeTask = mk('a', 'welcome', 2);
  const optional = mk('o', 'welcome', 2, { required: false });

  it('done wins over everything', () => {
    expect(getTaskStatus(welcomeTask, doneMap('a'), 20, p)).toBe('done');
    expect(getTaskStatus(welcomeTask, doneMap('a'), -7, p)).toBe('done');
  });

  it('locked while the phase has not started (Day 0 → welcome locked, Day 1 unlocked)', () => {
    expect(getTaskStatus(welcomeTask, {}, 0, p)).toBe('locked');
    expect(getTaskStatus(welcomeTask, {}, 1, p)).toBe('dueSoon');
  });

  it('dueSoon window is currentDay … currentDay+2, upcoming beyond', () => {
    const t = mk('g', 'grow', 20);
    expect(getTaskStatus(t, {}, 16, p)).toBe('upcoming');
    expect(getTaskStatus(t, {}, 18, p)).toBe('dueSoon');
    expect(getTaskStatus(t, {}, 20, p)).toBe('dueSoon');
  });

  it('required past due → overdue', () => {
    expect(getTaskStatus(welcomeTask, {}, 3, p)).toBe('overdue');
    expect(getTaskStatus(welcomeTask, {}, 31, p)).toBe('overdue');
  });

  it('optional past due → dueSoon within grace, skipped after 3 days (never overdue)', () => {
    expect(getTaskStatus(optional, {}, 5, p)).toBe('dueSoon');
    expect(getTaskStatus(optional, {}, 6, p)).toBe('skipped');
  });

  it('pre-boarding grace: preboard tasks are not overdue before Day 1', () => {
    const contract = mk('c', 'preboard', -3);
    expect(getTaskStatus(contract, {}, -7, p)).toBe('upcoming');
    expect(getTaskStatus(contract, {}, 0, p)).toBe('dueSoon');
    expect(getTaskStatus(contract, {}, 1, p)).toBe('overdue');
  });
});

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

describe('getProgress', () => {
  const list = [mk('r1', 'welcome', 1), mk('r2', 'welcome', 2), mk('o1', 'welcome', 2, { required: false }), mk('r3', 'ready', 5)];

  it('optional tasks do not dilute the percentage', () => {
    expect(getProgress(list, doneMap('r1'))).toEqual({ done: 1, total: 3, pct: 33 });
    expect(getProgress(list, doneMap('r1', 'o1'))).toEqual({ done: 1, total: 3, pct: 33 });
  });

  it('filters by phase', () => {
    expect(getProgress(list, doneMap('r1', 'r2'), 'welcome')).toEqual({ done: 2, total: 2, pct: 100 });
    expect(getProgress(list, {}, 'grow')).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('seed tracks have ~20 tasks and ≥8 required ones due by Day 8', () => {
    for (const track of ['lecturer', 'specialist', 'staff'] as const) {
      const tt = getTasksForTrack(allTasks, track);
      expect(tt.length).toBeGreaterThanOrEqual(15);
      expect(tt.filter((t) => t.required && t.dueDay <= 8).length).toBeGreaterThanOrEqual(8);
    }
  });
});

// ---------------------------------------------------------------------------
// Today & health
// ---------------------------------------------------------------------------

describe('getTodayTasks', () => {
  it('lecturer Day 0: 3 preboard tasks incl. the HR-owned contract (optional one ranked last)', () => {
    const today = getTodayTasks(lecturer, {}, 0, 3, phases);
    expect(today).toHaveLength(3);
    expect(today.every((t) => t.phaseId === 'preboard')).toBe(true);
    expect(today.some((t) => t.id === 't-preboard-contract' && t.owner === 'hr')).toBe(true);
    expect(today.some((t) => !t.required)).toBe(false);
    expect(getTodayTasks(lecturer, {}, 0, 10, phases)).toHaveLength(4);
  });

  it('sorts overdue → required → dueDay and respects the limit', () => {
    const list = [
      mk('soonOpt', 'welcome', 3, { required: false }),
      mk('soonReq', 'welcome', 3),
      mk('late2', 'welcome', 2),
      mk('late1', 'welcome', 1),
      mk('future', 'grow', 25),
    ];
    expect(getTodayTasks(list, {}, 3, 3, phases).map((t) => t.id)).toEqual(['late1', 'late2', 'soonReq']);
    expect(getTodayTasks(list, {}, 3, 10, phases).map((t) => t.id)).toEqual(['late1', 'late2', 'soonReq', 'soonOpt']);
  });

  it('is empty when everything due is done', () => {
    const list = [mk('a', 'welcome', 1)];
    expect(getTodayTasks(list, doneMap('a'), 2, 3, phases)).toEqual([]);
  });
});

describe('getHealth', () => {
  const list = [1, 2, 3, 4].map((d) => mk(`t${d}`, 'welcome', d > 3 ? 3 : d));
  it('thresholds: 0 → onTrack, 1–2 → behind, ≥3 → needsHelp', () => {
    expect(getHealth(list, {}, 1, phases)).toBe('onTrack');
    expect(getHealth(list, {}, 2, phases)).toBe('behind'); // t1
    expect(getHealth(list, {}, 3, phases)).toBe('behind'); // t1, t2
    expect(getHealth(list, {}, 4, phases)).toBe('needsHelp'); // t1..t4
    expect(getHealth(list, doneMap('t1', 't2'), 4, phases)).toBe('behind');
  });

  it('optional tasks never count as overdue', () => {
    const opt = [mk('o', 'welcome', 1, { required: false })];
    expect(getHealth(opt, {}, 20, phases)).toBe('onTrack');
  });

  it('demo jump Day 0 → Day 9 with seeds: needsHelp, integrate unlocked', () => {
    const completed = doneMap('t-preboard-dossier', 't-preboard-first-day');
    expect(getHealth(lecturer, completed, 0, phases)).toBe('onTrack');
    expect(getHealth(lecturer, completed, 9, phases)).toBe('needsHelp');
    const syllabus = lecturer.find((t) => t.id === 't-lec-syllabus')!;
    expect(getTaskStatus(syllabus, completed, 7, phases)).toBe('locked');
    expect(getTaskStatus(syllabus, completed, 9, phases)).not.toBe('locked');
  });
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

describe('badges', () => {
  const list = [
    mk('pre', 'preboard', -2),
    mk('wel', 'welcome', 2),
    mk('welOpt', 'welcome', 3, { required: false }),
    mk('rdy', 'ready', 5),
    mk('bud', 'ready', 5, { owner: 'buddy' }),
    mk('grw', 'grow', 28),
  ];

  it('nothing unlocked on a fresh state; kickoff after the first task', () => {
    expect(getUnlockedBadges({ tasks: list, journey: state() })).toEqual([]);
    expect(getUnlockedBadges({ tasks: list, journey: state({ completed: doneMap('welOpt') }) })).toEqual(['kickoff']);
  });

  it('paperwork needs all required preboard + welcome tasks (optional ignored)', () => {
    const j = state({ completed: doneMap('pre') });
    expect(getBadgeRemaining('paperwork', { tasks: list, journey: j })).toBe(1);
    const j2 = state({ completed: doneMap('pre', 'wel') });
    expect(getUnlockedBadges({ tasks: list, journey: j2 })).toContain('paperwork');
  });

  it('ready = ready phase 100% required', () => {
    const j = state({ completed: doneMap('rdy') });
    expect(getUnlockedBadges({ tasks: list, journey: j })).not.toContain('ready');
    const j2 = state({ completed: doneMap('rdy', 'bud') });
    expect(getUnlockedBadges({ tasks: list, journey: j2 })).toContain('ready');
  });

  it('connected = ≥3 distinct contacts viewed + buddy task done', () => {
    const j = state({ completed: doneMap('bud'), contactsViewed: ['a', 'b'] });
    expect(getBadgeRemaining('connected', { tasks: list, journey: j })).toBe(1);
    const j2 = state({ completed: doneMap('bud'), contactsViewed: ['a', 'b', 'c'] });
    expect(getUnlockedBadges({ tasks: list, journey: j2 })).toContain('connected');
    const j3 = state({ contactsViewed: ['a', 'b', 'c'] });
    expect(getUnlockedBadges({ tasks: list, journey: j3 })).not.toContain('connected');
  });

  it('journey30 = overall 100% + day-30 check-in', () => {
    const all = doneMap('pre', 'wel', 'rdy', 'bud', 'grw');
    expect(getUnlockedBadges({ tasks: list, journey: state({ completed: all }) })).not.toContain('journey30');
    const j = state({ completed: all, checkins: { 30: { score: 5, at: 'x' } } });
    expect(getUnlockedBadges({ tasks: list, journey: j })).toContain('journey30');
  });

  it('stored badges never re-lock; newly unlocked excludes stored ones', () => {
    const j = state({ badges: { kickoff: 'x' } });
    expect(getUnlockedBadges({ tasks: list, journey: j })).toEqual(['kickoff']);
    const j2 = state({ completed: doneMap('pre', 'wel'), badges: { kickoff: 'x' } });
    expect(getNewlyUnlockedBadges({ tasks: list, journey: j2 })).toEqual(['paperwork']);
  });

  it('next milestone teaser skips unlocked badges', () => {
    const j = state({ completed: doneMap('pre'), badges: { kickoff: 'x' } });
    expect(getNextMilestone({ tasks: list, journey: j })).toEqual({ badge: 'paperwork', remaining: 1 });
  });
});

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

describe('getPendingCheckin', () => {
  it('none before Day 3 (incl. pre-boarding)', () => {
    expect(getPendingCheckin(state(), -7)).toBeNull();
    expect(getPendingCheckin(state(), 0)).toBeNull();
    expect(getPendingCheckin(state(), 2)).toBeNull();
  });

  it('D3 pending from Day 3; Day 9 shows the latest passed (D7)', () => {
    expect(getPendingCheckin(state(), 3)).toBe(3);
    expect(getPendingCheckin(state(), 6)).toBe(3);
    expect(getPendingCheckin(state(), 9)).toBe(7);
  });

  it('answered → not pending; Day 30/31 → D30', () => {
    expect(getPendingCheckin(state({ checkins: { 7: { score: 4, at: 'x' } } }), 9)).toBeNull();
    expect(getPendingCheckin(state(), 30)).toBe(30);
    expect(getPendingCheckin(state(), 31)).toBe(30);
    expect(getPendingCheckin(state({ checkins: { 30: { score: 3, at: 'x' } } }), 31)).toBeNull();
  });

  it('check-in tasks are linked by id convention', () => {
    expect(getCheckinDayForTask({ id: 't-ready-checkin-d7' })).toBe(7);
    expect(getCheckinDayForTask({ id: 't-ready-email' })).toBeNull();
    expect(getCheckinTaskIds(allTasks, 30)).toEqual(['t-grow-checkin-d30']);
  });
});

describe('pickRandomHalf', () => {
  it('picks half of the undone, non check-in tasks', () => {
    const picked = pickRandomHalf(lecturer, doneMap('t-preboard-dossier'), () => 0.5);
    const pool = lecturer.filter((t) => t.id !== 't-preboard-dossier' && getCheckinDayForTask(t) === null);
    expect(picked).toHaveLength(Math.ceil(pool.length / 2));
    expect(picked).not.toContain('t-preboard-dossier');
    expect(picked.some((id) => id.includes('checkin'))).toBe(false);
  });
});

describe('filterTasks / getPhaseState', () => {
  it('filters by owner, open and required', () => {
    const list = [mk('a', 'welcome', 1), mk('b', 'welcome', 2, { owner: 'hr' }), mk('c', 'welcome', 3, { required: false })];
    const status = (id: string): TaskStatus => (id === 'a' ? 'done' : 'dueSoon');
    expect(filterTasks(list, 'mine', status).map((t) => t.id)).toEqual(['a', 'c']);
    expect(filterTasks(list, 'open', status).map((t) => t.id)).toEqual(['b', 'c']);
    expect(filterTasks(list, 'required', status).map((t) => t.id)).toEqual(['a', 'b']);
    const cur = getPhaseForDay(phases, 9);
    const full = { done: 3, total: 3, pct: 100 };
    const half = { done: 1, total: 2, pct: 50 };
    expect(getPhaseState(phases[0], cur, full)).toBe('done');
    expect(getPhaseState(phases[0], cur, half)).toBe('upcoming');
    expect(getPhaseState(cur, cur, half)).toBe('current');
    expect(getPhaseState(phases[4], cur, full)).toBe('upcoming');
  });
});
