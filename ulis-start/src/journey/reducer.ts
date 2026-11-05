// Pure reducer for profile + journey progress. Timestamps come in via actions so this stays deterministic.
import { tasks as allTasks } from '../content';
import type { BadgeId, CheckinDay, CheckinScore, JourneyState, Profile } from '../types';
import { clampDemoDay, emptyJourneyState, getCheckinTaskIds, getNewlyUnlockedBadges, getTasksForTrack } from './engine';

export interface RootState {
  hydrated: boolean;
  profile: Profile | null;
  journey: JourneyState;
  /** Badges unlocked in this session, waiting for the celebration modal (FIFO). */
  pendingBadges: BadgeId[];
}

export type JourneyAction =
  | { type: 'HYDRATE'; profile: Profile | null; journey: JourneyState; at: string }
  | { type: 'SET_PROFILE'; profile: Profile; at: string }
  | { type: 'COMPLETE'; id: string; at: string }
  | { type: 'COMPLETE_MANY'; ids: string[]; at: string }
  | { type: 'UNCOMPLETE'; id: string }
  | { type: 'TOGGLE'; id: string; at: string }
  | { type: 'CHECKIN'; day: CheckinDay; score: CheckinScore; note?: string; at: string }
  | { type: 'VIEW_CONTACT'; id: string; at: string }
  | { type: 'SET_DEMO_DAY'; day: number | null }
  | { type: 'DISMISS_BADGE' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'RESET' };

export const initialRootState: RootState = {
  hydrated: false,
  profile: null,
  journey: emptyJourneyState(),
  pendingBadges: [],
};

/** Stores newly unlocked badges; `celebrate=false` stores them silently (e.g. on hydrate). */
function withBadges(state: RootState, at: string, celebrate = true): RootState {
  if (!state.profile) return state;
  const fresh = getNewlyUnlockedBadges({
    tasks: getTasksForTrack(allTasks, state.profile.track),
    journey: state.journey,
  });
  if (fresh.length === 0) return state;
  const badges = { ...state.journey.badges };
  for (const b of fresh) badges[b] = at;
  return {
    ...state,
    journey: { ...state.journey, badges },
    pendingBadges: celebrate ? [...state.pendingBadges, ...fresh] : state.pendingBadges,
  };
}

const setJourney = (state: RootState, patch: Partial<JourneyState>): RootState => ({
  ...state,
  journey: { ...state.journey, ...patch },
});

export function journeyReducer(state: RootState, action: JourneyAction): RootState {
  switch (action.type) {
    case 'HYDRATE':
      return withBadges(
        { hydrated: true, profile: action.profile, journey: action.journey, pendingBadges: [] },
        action.at,
        false,
      );

    case 'SET_PROFILE':
      // Track/start date changes keep `completed`: common task ids are shared across tracks.
      return withBadges({ ...state, profile: action.profile }, action.at);

    case 'COMPLETE':
      if (state.journey.completed[action.id]) return state;
      return withBadges(setJourney(state, { completed: { ...state.journey.completed, [action.id]: action.at } }), action.at);

    case 'TOGGLE':
      return journeyReducer(
        state,
        state.journey.completed[action.id] ? { type: 'UNCOMPLETE', id: action.id } : { type: 'COMPLETE', id: action.id, at: action.at },
      );

    case 'COMPLETE_MANY': {
      const completed = { ...state.journey.completed };
      for (const id of action.ids) if (!completed[id]) completed[id] = action.at;
      return withBadges(setJourney(state, { completed }), action.at);
    }

    case 'UNCOMPLETE': {
      if (!state.journey.completed[action.id]) return state;
      const completed = { ...state.journey.completed };
      delete completed[action.id];
      return setJourney(state, { completed });
    }

    case 'CHECKIN': {
      const entry = { score: action.score, at: action.at, ...(action.note?.trim() ? { note: action.note.trim() } : {}) };
      const completed = { ...state.journey.completed };
      for (const id of getCheckinTaskIds(allTasks, action.day)) if (!completed[id]) completed[id] = action.at;
      return withBadges(
        setJourney(state, { checkins: { ...state.journey.checkins, [action.day]: entry }, completed }),
        action.at,
      );
    }

    case 'VIEW_CONTACT':
      if (state.journey.contactsViewed.includes(action.id)) return state;
      return withBadges(setJourney(state, { contactsViewed: [...state.journey.contactsViewed, action.id] }), action.at);

    case 'SET_DEMO_DAY':
      return setJourney(state, { demoDayOverride: action.day === null ? null : clampDemoDay(action.day) });

    case 'DISMISS_BADGE':
      return { ...state, pendingBadges: state.pendingBadges.slice(1) };

    case 'RESET_PROGRESS':
      return { ...state, journey: { ...emptyJourneyState(), demoDayOverride: state.journey.demoDayOverride }, pendingBadges: [] };

    case 'RESET':
      return { ...initialRootState, hydrated: true };
  }
}
