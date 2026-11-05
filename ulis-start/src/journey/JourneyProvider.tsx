// Journey + profile state: Context + useReducer, persisted to AsyncStorage (debounced 300 ms).
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { phasesInOrder, tasks as allTasks } from '../content';
import type {
  BadgeId,
  CheckinDay,
  CheckinScore,
  Health,
  JourneyState,
  Phase,
  PhaseId,
  Profile,
  Task,
  TaskStatus,
} from '../types';
import {
  getCheckinDayForTask,
  getCurrentDay,
  getHealth,
  getNextMilestone,
  getOverdueTasks,
  getPendingCheckin,
  getPhaseForDay,
  getPhaseProgress,
  getProgress,
  getTaskStatus,
  getTasksForTrack,
  getTodayTasks,
  getUnlockedBadges,
  pickRandomHalf,
  type ProgressStat,
} from './engine';
import { DEFAULT_HELP_CONTACT_ID } from './meta';
import { initialRootState, journeyReducer } from './reducer';
import { loadPersisted, savePersisted } from './storage';

export interface JourneyActions {
  complete(id: string): void;
  uncomplete(id: string): void;
  /** Toggles done/undone; returns the new done flag. */
  toggle(id: string): boolean;
  checkin(day: CheckinDay, score: CheckinScore, note?: string): void;
  viewContact(contactId: string): void;
  /** `null` = use the real date. Clamped to −7…31. */
  setDemoDay(day: number | null): void;
  setProfile(profile: Profile): void;
  /** Demo: complete ~50% of the remaining tasks at random. */
  completeRandomHalf(): void;
  /** Clears progress but keeps the profile. */
  resetProgress(): void;
  /** Clears everything (profile too) → onboarding. */
  reset(): void;
  dismissBadge(): void;
}

export interface JourneyValue {
  hydrated: boolean;
  profile: Profile | null;
  currentDay: number;
  /** True when the demo day override is active. */
  isDemoDay: boolean;
  phases: Phase[];
  currentPhase: Phase;
  /** Track-filtered tasks sorted by dueDay. */
  tasks: Task[];
  statusOf(id: string): TaskStatus;
  progress: ProgressStat;
  phaseProgress: Record<PhaseId, ProgressStat>;
  /** "Việc của hôm nay": max 3. */
  todayTasks: Task[];
  /** All overdue + dueSoon tasks (for "+N việc khác"). */
  dueTaskCount: number;
  /** All overdue + dueSoon tasks in "Việc của hôm nay" order (desktop shows more than 3). */
  dueTasks: Task[];
  overdueTasks: Task[];
  health: Health;
  /** Contact to suggest when behind: first overdue task's contact, else Phòng TCTT. */
  helpContactId: string;
  pendingCheckin: CheckinDay | null;
  pendingBadge: BadgeId | null;
  unlockedBadges: BadgeId[];
  nextMilestone: { badge: BadgeId; remaining: number } | null;
  checkinDayOf(task: Task): CheckinDay | null;
  state: JourneyState;
  actions: JourneyActions;
}

const JourneyContext = createContext<JourneyValue | null>(null);

const nowIso = () => new Date().toISOString();

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [root, dispatch] = useReducer(journeyReducer, initialRootState);
  const [now, setNow] = useState(() => new Date());

  // Hydrate once.
  useEffect(() => {
    let alive = true;
    loadPersisted().then(({ profile, journey }) => {
      if (alive) dispatch({ type: 'HYDRATE', profile, journey, at: nowIso() });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist (debounced 300 ms), only after hydration so we never overwrite storage with the empty initial state.
  const latest = useRef(root);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    latest.current = root;
  }, [root]);
  useEffect(() => {
    if (!root.hydrated) return;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void savePersisted(root.profile, root.journey);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [root.hydrated, root.profile, root.journey]);

  // Refresh "today" on foreground; flush any pending save when the app goes to background/inactive
  // (the OS may kill the process before the debounce fires).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setNow(new Date());
        return;
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const cur = latest.current;
        if (cur.hydrated) void savePersisted(cur.profile, cur.journey);
      }
    });
    return () => sub.remove();
  }, []);

  const { profile, journey } = root;
  const track = profile?.track ?? 'lecturer';

  const tasks = useMemo(() => getTasksForTrack(allTasks, track), [track]);

  const actions = useMemo<JourneyActions>(
    () => ({
      complete: (id) => dispatch({ type: 'COMPLETE', id, at: nowIso() }),
      uncomplete: (id) => dispatch({ type: 'UNCOMPLETE', id }),
      toggle: (id) => {
        // The reducer decides from the real current state (safe against fast double taps);
        // the return value is a best-effort prediction for UI feedback.
        dispatch({ type: 'TOGGLE', id, at: nowIso() });
        return !latest.current.journey.completed[id];
      },
      checkin: (day, score, note) => dispatch({ type: 'CHECKIN', day, score, note, at: nowIso() }),
      viewContact: (id) => dispatch({ type: 'VIEW_CONTACT', id, at: nowIso() }),
      setDemoDay: (day) => dispatch({ type: 'SET_DEMO_DAY', day }),
      setProfile: (p) => dispatch({ type: 'SET_PROFILE', profile: p, at: nowIso() }),
      completeRandomHalf: () => {
        const cur = latest.current;
        const pool = getTasksForTrack(allTasks, cur.profile?.track ?? 'lecturer');
        dispatch({ type: 'COMPLETE_MANY', ids: pickRandomHalf(pool, cur.journey.completed), at: nowIso() });
      },
      resetProgress: () => dispatch({ type: 'RESET_PROGRESS' }),
      reset: () => dispatch({ type: 'RESET' }),
      dismissBadge: () => dispatch({ type: 'DISMISS_BADGE' }),
    }),
    [],
  );

  const value = useMemo<JourneyValue>(() => {
    const currentDay = getCurrentDay(profile, now, journey.demoDayOverride);
    const { completed } = journey;
    const statusCache = new Map<string, TaskStatus>();
    for (const t of tasks) statusCache.set(t.id, getTaskStatus(t, completed, currentDay, phasesInOrder));
    const badgeInput = { tasks, journey };
    const overdueTasks = getOverdueTasks(tasks, completed, currentDay, phasesInOrder);
    const dueAll = getTodayTasks(tasks, completed, currentDay, Number.POSITIVE_INFINITY, phasesInOrder);
    return {
      hydrated: root.hydrated,
      profile,
      currentDay,
      isDemoDay: journey.demoDayOverride !== null,
      phases: phasesInOrder,
      currentPhase: getPhaseForDay(phasesInOrder, currentDay),
      tasks,
      statusOf: (id) => {
        const cached = statusCache.get(id);
        if (cached) return cached;
        // Task outside the user's track (e.g. deep link): compute on demand.
        const t = allTasks.find((x) => x.id === id);
        return t ? getTaskStatus(t, completed, currentDay, phasesInOrder) : 'upcoming';
      },
      progress: getProgress(tasks, completed),
      phaseProgress: getPhaseProgress(tasks, completed, phasesInOrder),
      todayTasks: dueAll.slice(0, 3),
      dueTaskCount: dueAll.length,
      dueTasks: dueAll,
      overdueTasks,
      health: getHealth(tasks, completed, currentDay, phasesInOrder),
      helpContactId: overdueTasks.find((t) => t.contactId)?.contactId ?? DEFAULT_HELP_CONTACT_ID,
      pendingCheckin: getPendingCheckin(journey, currentDay),
      pendingBadge: root.pendingBadges[0] ?? null,
      unlockedBadges: getUnlockedBadges(badgeInput),
      nextMilestone: getNextMilestone(badgeInput),
      checkinDayOf: getCheckinDayForTask,
      state: journey,
      actions,
    };
  }, [root.hydrated, root.pendingBadges, profile, journey, now, tasks, actions]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}
