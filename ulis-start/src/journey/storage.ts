// AsyncStorage persistence for profile + journey (keys from docs/DATA_MODEL.md).
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JourneyState, Profile } from '../types';
import { emptyJourneyState } from './engine';

export const PROFILE_KEY = 'ulis.profile.v1';
export const JOURNEY_KEY = 'ulis.journey.v1';

const TRACKS = ['lecturer', 'specialist', 'staff'];

function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  const p = JSON.parse(raw) as Partial<Profile>;
  if (typeof p.name !== 'string' || !TRACKS.includes(p.track ?? '') || typeof p.startDate !== 'string') {
    throw new Error('invalid profile');
  }
  return {
    name: p.name,
    track: p.track as Profile['track'],
    unit: typeof p.unit === 'string' ? p.unit : '',
    startDate: p.startDate,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
  };
}

function parseJourney(raw: string | null): JourneyState {
  const base = emptyJourneyState();
  if (!raw) return base;
  const j = JSON.parse(raw) as Partial<JourneyState>;
  return {
    completed: j.completed && typeof j.completed === 'object' ? j.completed : base.completed,
    checkins: j.checkins && typeof j.checkins === 'object' ? j.checkins : base.checkins,
    badges: j.badges && typeof j.badges === 'object' ? j.badges : base.badges,
    contactsViewed: Array.isArray(j.contactsViewed) ? j.contactsViewed : base.contactsViewed,
    demoDayOverride: typeof j.demoDayOverride === 'number' ? j.demoDayOverride : null,
  };
}

/** Loads both keys. On a parse error only the broken key is reset. */
export async function loadPersisted(): Promise<{ profile: Profile | null; journey: JourneyState }> {
  let profile: Profile | null = null;
  let journey = emptyJourneyState();
  try {
    profile = parseProfile(await AsyncStorage.getItem(PROFILE_KEY));
  } catch {
    await AsyncStorage.removeItem(PROFILE_KEY).catch(() => undefined);
  }
  try {
    journey = parseJourney(await AsyncStorage.getItem(JOURNEY_KEY));
  } catch {
    await AsyncStorage.removeItem(JOURNEY_KEY).catch(() => undefined);
  }
  return { profile, journey };
}

export async function savePersisted(profile: Profile | null, journey: JourneyState): Promise<void> {
  try {
    if (profile) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else await AsyncStorage.removeItem(PROFILE_KEY);
    await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
  } catch {
    // Storage failures must never crash the demo; state stays in memory.
  }
}
