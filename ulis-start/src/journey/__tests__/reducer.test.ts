import { phasesInOrder, tasks } from '../../content';
import type { Profile } from '../../types';
import * as engine from '../engine';
import { initialRootState, journeyReducer, type RootState } from '../reducer';

const at = '2026-11-03T08:00:00.000Z';
const profile: Profile = { name: 'An', track: 'lecturer', unit: 'Khoa Tiếng Anh', startDate: '2026-11-04', createdAt: at };
const hydrated = (): RootState => journeyReducer(initialRootState, { type: 'HYDRATE', profile, journey: initialRootState.journey, at });

describe('journeyReducer', () => {
  it('first completion unlocks kickoff and queues it once', () => {
    let s = journeyReducer(hydrated(), { type: 'COMPLETE', id: 't-preboard-dossier', at });
    expect(s.pendingBadges).toEqual(['kickoff']);
    s = journeyReducer(s, { type: 'COMPLETE', id: 't-preboard-first-day', at });
    expect(s.pendingBadges).toEqual(['kickoff']);
    s = journeyReducer(s, { type: 'DISMISS_BADGE' });
    expect(s.pendingBadges).toEqual([]);
    expect(s.journey.badges.kickoff).toBe(at);
  });

  it('switching track keeps completed common tasks', () => {
    let s = journeyReducer(hydrated(), { type: 'COMPLETE', id: 't-preboard-dossier', at });
    s = journeyReducer(s, { type: 'SET_PROFILE', profile: { ...profile, track: 'specialist' }, at });
    expect(s.journey.completed['t-preboard-dossier']).toBe(at);
    expect(s.profile?.track).toBe('specialist');
  });

  it('changing the start date keeps completed tasks, check-ins and badges', () => {
    let s = journeyReducer(hydrated(), { type: 'COMPLETE', id: 't-preboard-dossier', at });
    s = journeyReducer(s, { type: 'CHECKIN', day: 3, score: 4, at });
    s = journeyReducer(s, { type: 'SET_PROFILE', profile: { ...profile, startDate: '2026-10-25' }, at });
    expect(s.profile?.startDate).toBe('2026-10-25');
    expect(s.journey.completed['t-preboard-dossier']).toBe(at);
    expect(s.journey.checkins[3]?.score).toBe(4);
    expect(s.journey.badges.kickoff).toBe(at);
    expect(engine.getCurrentDay(s.profile, new Date(2026, 10, 3, 10))).toBe(10);
  });

  it('TOGGLE is resolved from reducer state, so a double tap flips back instead of double-completing', () => {
    let s = journeyReducer(hydrated(), { type: 'TOGGLE', id: 't-preboard-dossier', at });
    expect(s.journey.completed['t-preboard-dossier']).toBe(at);
    s = journeyReducer(s, { type: 'TOGGLE', id: 't-preboard-dossier', at });
    expect(s.journey.completed['t-preboard-dossier']).toBeUndefined();
    expect(s.pendingBadges).toEqual(['kickoff']);
  });

  it('check-in marks the linked check-in task done', () => {
    const s = journeyReducer(hydrated(), { type: 'CHECKIN', day: 7, score: 2, note: '  ', at });
    expect(s.journey.checkins[7]).toEqual({ score: 2, at });
    expect(s.journey.completed['t-ready-checkin-d7']).toBe(at);
  });

  it('contacts viewed are de-duplicated; demo day is clamped', () => {
    let s = journeyReducer(hydrated(), { type: 'VIEW_CONTACT', id: 'ct-hr', at });
    s = journeyReducer(s, { type: 'VIEW_CONTACT', id: 'ct-hr', at });
    expect(s.journey.contactsViewed).toEqual(['ct-hr']);
    s = journeyReducer(s, { type: 'SET_DEMO_DAY', day: 99 });
    expect(s.journey.demoDayOverride).toBe(31);
  });

  it('hydrate stores already-earned badges silently; reset clears profile', () => {
    const s = journeyReducer(initialRootState, {
      type: 'HYDRATE',
      profile,
      journey: { ...initialRootState.journey, completed: { 't-preboard-dossier': at } },
      at,
    });
    expect(s.journey.badges.kickoff).toBe(at);
    expect(s.pendingBadges).toEqual([]);
    const r = journeyReducer(s, { type: 'RESET' });
    expect(r.profile).toBeNull();
    expect(r.hydrated).toBe(true);
    expect(r.journey.completed).toEqual({});
  });
});

describe('demo script code path (steps 1–3, 5, 6)', () => {
  it('Day 0 → tick 2 → kickoff → Day 9 needsHelp + D7 check-in → switch to Chuyên viên', () => {
    // 1. onboarding with start = tomorrow → today is Day 0
    let s = journeyReducer(hydrated(), { type: 'SET_DEMO_DAY', day: 0 });
    let track = engine.getTasksForTrack(tasks, s.profile!.track);
    // 2. Day 0: 4 preboard tasks due, top 3 include the HR-owned contract; nothing overdue yet
    expect(engine.getTodayTasks(track, s.journey.completed, 0, 10, phasesInOrder)).toHaveLength(4);
    expect(engine.getTodayTasks(track, s.journey.completed, 0, 3, phasesInOrder).map((t) => t.id)).toContain('t-preboard-contract');
    expect(engine.getHealth(track, s.journey.completed, 0, phasesInOrder)).toBe('onTrack');
    // 3. tick 2 → kickoff badge
    s = journeyReducer(s, { type: 'COMPLETE', id: 't-preboard-dossier', at });
    s = journeyReducer(s, { type: 'COMPLETE', id: 't-preboard-first-day', at });
    expect(s.pendingBadges).toEqual(['kickoff']);
    expect(engine.getProgress(track, s.journey.completed).done).toBe(2);
    // 5. jump to Day 9
    s = journeyReducer(s, { type: 'SET_DEMO_DAY', day: 9 });
    const day = engine.getCurrentDay(s.profile, new Date(), s.journey.demoDayOverride);
    expect(day).toBe(9);
    expect(engine.getHealth(track, s.journey.completed, day, phasesInOrder)).toBe('needsHelp');
    expect(engine.getPhaseForDay(phasesInOrder, day).id).toBe('integrate');
    expect(engine.getPendingCheckin(s.journey, day)).toBe(7);
    // 6. switch to specialist
    s = journeyReducer(s, { type: 'SET_PROFILE', profile: { ...s.profile!, track: 'specialist' }, at });
    track = engine.getTasksForTrack(tasks, s.profile!.track);
    expect(track.some((t) => t.id.startsWith('t-lec-'))).toBe(false);
    expect(track.some((t) => t.id === 't-spec-eoffice')).toBe(true);
    expect(engine.getProgress(track, s.journey.completed).done).toBe(2);
  });
});
