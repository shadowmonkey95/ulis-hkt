// Local store for feedback and questions sent to Phòng TCTT (pitch: would sync to a server).
// Shared by app/feedback.tsx and the assistant ("Gửi câu hỏi tới Phòng TCTT").
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FEEDBACK_KEY = 'ulis.feedback.v1';

export type FeedbackKind = 'feedback' | 'question' | 'content-error';

export interface FeedbackEntry {
  id: string;
  kind: FeedbackKind;
  message: string;
  anonymous: boolean;
  createdAt: string; // ISO
  /** Where it was sent from, e.g. "feedback", "assistant". */
  origin: string;
  /** Optional sender name (omitted when anonymous). */
  name?: string;
  /** Optional related content id (task/guide). */
  relatedId?: string;
}

export type NewFeedback = Omit<FeedbackEntry, 'id' | 'createdAt'>;

const MAX_ENTRIES = 100;

function isEntry(x: unknown): x is FeedbackEntry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.message === 'string' && typeof e.createdAt === 'string';
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    // Corrupt value: reset this key only (DATA_MODEL.md).
    await AsyncStorage.removeItem(FEEDBACK_KEY).catch(() => undefined);
    return [];
  }
}

export async function addFeedback(input: NewFeedback): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = {
    ...input,
    name: input.anonymous ? undefined : input.name,
    id: `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const all = await listFeedback();
  await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify([entry, ...all].slice(0, MAX_ENTRIES)));
  return entry;
}
