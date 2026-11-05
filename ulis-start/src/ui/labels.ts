// Vietnamese display labels for enum values + small formatting helpers (pure, no React).
import type { BenefitCategory, GuideCategory, Meta, Owner, ResourceType, TaskStatus, Track } from '../types';

export const OWNER_LABELS: Record<Owner, string> = {
  me: 'Bạn',
  unit: 'Đơn vị',
  hr: 'Phòng TCTT',
  it: 'CNTT',
  buddy: 'Người đồng hành',
};

export const OWNER_LONG_LABELS: Record<Owner, string> = {
  me: 'Bạn',
  unit: 'Đơn vị/ Khoa',
  hr: 'Phòng Tổ chức và Thanh tra',
  it: 'Trung tâm/ bộ phận CNTT',
  buddy: 'Người đồng hành (Buddy)',
};

export const TRACK_LABELS: Record<Track, string> = {
  lecturer: 'VC, NLĐ Khối đào tạo',
  specialist: 'VC, NLĐ Khối phục vụ đào tạo',
  staff: 'Người lao động',
};

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  hr: 'Nhân sự',
  admin: 'Hành chính',
  finance: 'Tài chính',
  it: 'CNTT',
  academic: 'Đào tạo',
  emulation: 'Đánh giá thi đua',
  research: 'Khoa học công nghệ',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  form: 'Biểu mẫu',
  regulation: 'Quy định',
  manual: 'Hướng dẫn',
  video: 'Video',
  training: 'Đào tạo',
};

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  insurance: 'Bảo hiểm',
  leave: 'Nghỉ phép',
  health: 'Sức khỏe',
  union: 'Công đoàn',
  development: 'Phát triển',
  recognition: 'Ghi nhận',
  facility: 'Tiện ích',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  done: 'Đã xong',
  upcoming: 'Sắp tới',
  dueSoon: 'Sắp đến hạn',
  overdue: 'Quá hạn',
  skipped: 'Đã bỏ qua',
  locked: 'Chưa mở',
};

/** "Ngày 5" for day ≥ 1, "Trước ngày đầu" for pre-boarding days (≤ 0). */
export function formatDay(day: number): string {
  return day >= 1 ? `Ngày ${day}` : 'Trước ngày đầu';
}

/** YYYY-MM-DD (or ISO) -> DD/MM/YYYY. Returns input unchanged if it can't be parsed. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export interface DueInfo {
  text: string;
  tone: 'success' | 'muted' | 'warning' | 'danger';
}

/**
 * Status label for a task row. The journey is not tied to a fixed number of days, so no deadlines or
 * day counts are shown ("Quá hạn 3 ngày", "Còn 2 ngày" …) – only whether the task is done or not open yet.
 * Returns null when there is nothing to show.
 */
export function getDueInfo(status: TaskStatus): DueInfo | null {
  switch (status) {
    case 'done':
      return { text: 'Đã xong', tone: 'success' };
    case 'locked':
      return { text: 'Chưa mở', tone: 'muted' };
    default:
      return null;
  }
}

/** One Meta for a list screen: first source, latest date, verified only if all are. */
export function aggregateMeta(items: Meta[]): Meta {
  if (items.length === 0) return { source: 'Nội dung mẫu cho Hackathon', updatedAt: '', verified: false };
  const sources = [...new Set(items.map((i) => i.source))];
  const updatedAt = items.map((i) => i.updatedAt).sort().at(-1) ?? '';
  return { source: sources.join('; '), updatedAt, verified: items.every((i) => i.verified) };
}
