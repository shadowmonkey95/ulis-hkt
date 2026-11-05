// Public API of the assistant module.
import { detectOutOfScope } from './guard';
import { answerLocal } from './local';
import { ASSISTANT_URL, askRemote } from './remote';
import type { AskContext, AssistantMode, AssistantReply } from './types';

/** 'remote' only when EXPO_PUBLIC_ASSISTANT_URL is set; otherwise everything stays on device. */
export const assistantMode: AssistantMode = ASSISTANT_URL ? 'remote' : 'local';

/**
 * Answer a question. Remote mode is tried only when configured; guarded (out-of-scope) questions are
 * always answered locally; any remote failure or the 30s timeout (REMOTE_TIMEOUT_MS) falls back to the local answer.
 */
export async function ask(question: string, ctx: AskContext = {}): Promise<AssistantReply> {
  if (assistantMode === 'local' || detectOutOfScope(question)) return answerLocal(question, ctx);
  try {
    return await askRemote(question, ctx);
  } catch {
    return { ...answerLocal(question, ctx), fellBack: true };
  }
}

export { answerLocal, ASK_HR_LABEL, DISCLAIMER, NO_INFO_TEXT, HR_CONTACT_ID } from './local';
export { detectOutOfScope } from './guard';
export { ASSISTANT_URL, REMOTE_TIMEOUT_MS, askRemote, replyFromRemote } from './remote';
export { HISTORY_KEY, MAX_HISTORY, appendHistory, clearHistory, loadHistory, newMessageId, saveHistory, type ChatMessage } from './history';
export { retrieve, retrieveChunks } from './retrieve';
export type * from './types';
export { suggestQuestions } from './suggest';
