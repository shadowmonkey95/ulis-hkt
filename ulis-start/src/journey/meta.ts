// Static journey copy that is part of the engine contract (badge names, check-in questions, health labels).
// Kept here rather than in content/*.json because it is defined by docs/JOURNEY_SPEC.md, not by ULIS data.
import type { BadgeId, CheckinDay, CheckinScore, Health } from '../types';

export interface BadgeMeta {
  id: BadgeId;
  title: string;
  description: string;
  /** Feather icon name. */
  icon: 'zap' | 'file-text' | 'check-circle' | 'users' | 'award';
}

export const BADGES: Record<BadgeId, BadgeMeta> = {
  kickoff: { id: 'kickoff', title: 'Khởi động', description: 'Bạn đã hoàn thành việc đầu tiên trong hành trình.', icon: 'zap' },
  paperwork: {
    id: 'paperwork',
    title: 'Hồ sơ hoàn tất',
    description: 'Mọi việc bắt buộc trước ngày đầu và tuần chào mừng đã xong.',
    icon: 'file-text',
  },
  ready: { id: 'ready', title: 'Sẵn sàng', description: 'Bạn đã hoàn tất giai đoạn "Sẵn sàng làm việc".', icon: 'check-circle' },
  connected: {
    id: 'connected',
    title: 'Kết nối',
    description: 'Bạn đã gặp người đồng hành và biết các đầu mối hỗ trợ.',
    icon: 'users',
  },
  journey30: {
    id: 'journey30',
    title: 'Thành viên ULIS',
    description: 'Chúc mừng! Bạn đã hoàn thành hành trình hội nhập.',
    icon: 'award',
  },
};

export interface CheckinMeta {
  day: CheckinDay;
  question: string;
  /** Optional second free-text prompt (Day 30). */
  notePrompt: string;
}

export const CHECKINS: Record<CheckinDay, CheckinMeta> = {
  3: { day: 3, question: 'Những ngày đầu của bạn thế nào?', notePrompt: 'Bạn muốn chia sẻ thêm điều gì? (không bắt buộc)' },
  7: {
    day: 7,
    question: 'Bạn đã biết cần hỏi ai khi gặp khó khăn chưa?',
    notePrompt: 'Bạn muốn chia sẻ thêm điều gì? (không bắt buộc)',
  },
  15: {
    day: 15,
    question: 'Công việc chuyên môn đang rõ ràng với bạn chứ?',
    notePrompt: 'Bạn muốn chia sẻ thêm điều gì? (không bắt buộc)',
  },
  30: {
    day: 30,
    question: 'Bạn có sẵn sàng giới thiệu ULIS là nơi làm việc tốt?',
    notePrompt: 'Điều gì nên cải thiện cho người sau?',
  },
};

export const CHECKIN_SCALE: { score: CheckinScore; emoji: string; label: string }[] = [
  { score: 1, emoji: '😟', label: 'Rất không ổn' },
  { score: 2, emoji: '🙁', label: 'Chưa ổn' },
  { score: 3, emoji: '😐', label: 'Bình thường' },
  { score: 4, emoji: '🙂', label: 'Tốt' },
  { score: 5, emoji: '😄', label: 'Rất tốt' },
];

/** Score at or below this shows a contact suggestion right away. */
export const LOW_SCORE_THRESHOLD = 2;
/** Fallback contact for help prompts when a task has no contactId. */
export const DEFAULT_HELP_CONTACT_ID = 'ct-hr';

export const HEALTH_LABELS: Record<Health, string> = {
  onTrack: 'Đúng tiến độ',
  behind: 'Hơi chậm',
  needsHelp: 'Cần hỗ trợ',
};
