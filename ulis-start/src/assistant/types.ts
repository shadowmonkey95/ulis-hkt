// Assistant reply model shared by local mode, remote mode and the chat screen.
import type { Href } from 'expo-router';

import type { HitKind } from '../search/match';
import type { Track } from '../types';

export type AssistantMode = 'local' | 'remote';
export type Confidence = 'high' | 'low' | 'none';
/** Why the assistant refused to compute/interpret (out-of-scope guard). */
export type GuardReason = 'amount' | 'leave-count' | 'legal';

export interface ReplySource {
  /** 'document' = a passage from a document uploaded on the assistant server (remote mode only). */
  kind: HitKind | 'document';
  id: string;
  title: string;
  updatedAt: string;
  verified: boolean;
  source: string;
  /** Page number inside an uploaded PDF. */
  page?: number;
}

export type AssistantAction =
  | { kind: 'route'; label: string; route: Href; icon?: ActionIcon }
  /** Writes the question to the feedback store ("Gửi câu hỏi tới Phòng TCTT"). */
  | { kind: 'ask-hr'; label: string; question: string; relatedId?: string; icon?: ActionIcon }
  /** Marks a journey task as done. */
  | { kind: 'complete-task'; label: string; taskId: string; icon?: ActionIcon };

export type ActionIcon = 'book-open' | 'user' | 'check-square' | 'file-text' | 'send' | 'check-circle' | 'folder';

export interface AssistantReply {
  text: string;
  steps?: string[];
  sources: ReplySource[];
  actions: AssistantAction[];
  confidence: Confidence;
  /** Set when the out-of-scope guard answered (no numbers/legal interpretation). */
  guarded?: GuardReason;
  mode: AssistantMode;
  /** Remote mode failed and the reply was produced locally. */
  fellBack?: boolean;
}

export interface AskContext {
  taskId?: string;
  guideId?: string;
  track?: Track;
}
