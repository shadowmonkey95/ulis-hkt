// Chat history persisted to AsyncStorage (last 30 messages).
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AssistantReply } from './types';

export const HISTORY_KEY = 'ulis.assistant.history.v1';
export const MAX_HISTORY = 30;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string; // ISO
  /** Assistant messages: the structured reply (steps, sources, actions). */
  reply?: AssistantReply;
  /** User messages: what the question was about ("Đang hỏi về: …"). */
  contextLabel?: string;
  /** The question this reply answers (for "Gửi câu hỏi tới Phòng TCTT"). */
  question?: string;
}

function isMessage(x: unknown): x is ChatMessage {
  if (typeof x !== 'object' || x === null) return false;
  const m = x as Record<string, unknown>;
  return typeof m.id === 'string' && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && typeof m.at === 'string';
}

export async function loadHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMessage).slice(-MAX_HISTORY) : [];
  } catch {
    // Corrupt value: reset this key only (DATA_MODEL.md).
    await AsyncStorage.removeItem(HISTORY_KEY).catch(() => undefined);
    return [];
  }
}

export async function saveHistory(messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    // Storage full/unavailable: history is a convenience, never block the chat.
  }
}

// All writes go through one queue and re-read storage first, so several mounted chat screens
// (e.g. a second (tabs) instance pushed by "Hỏi trợ lý") never overwrite each other's messages.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(job);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Read-modify-write append (deduped by id). Resolves with the merged, persisted history. */
export function appendHistory(...items: ChatMessage[]): Promise<ChatMessage[]> {
  return enqueue(async () => {
    const ids = new Set(items.map((m) => m.id));
    const merged = [...(await loadHistory()).filter((m) => !ids.has(m.id)), ...items].slice(-MAX_HISTORY);
    await saveHistory(merged);
    return merged;
  });
}

export function clearHistory(): Promise<void> {
  return enqueue(() => AsyncStorage.removeItem(HISTORY_KEY).catch(() => undefined));
}

export function newMessageId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
