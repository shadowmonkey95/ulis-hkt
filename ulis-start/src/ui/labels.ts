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

/** Human due label for a task row (see JOURNEY_SPEC "Task states"). */
export function getDueInfo(status: TaskStatus, dueDay: number, currentDay: number, phaseStartDay?: number): DueInfo {
  const diff = dueDay - currentDay;
  switch (status) {
    case 'done':
      return { text: 'Đã xong', tone: 'success' };
    case 'locked':
      return { text: phaseStartDay !== undefined && phaseStartDay >= 1 ? `Mở vào ngày ${phaseStartDay}` : formatDay(dueDay), tone: 'muted' };
    case 'overdue':
      return { text: `Quá hạn ${Math.max(1, -diff)} ngày`, tone: 'danger' };
    case 'skipped':
      return { text: 'Không bắt buộc · đã qua', tone: 'muted' };
    case 'dueSoon':
      // Pre-boarding (Day ≤ 0): don't show "Trễ N ngày" before the person has even started.
      if (diff < 0 && currentDay <= 0) return { text: 'Nên làm ngay', tone: 'warning' };
      if (diff < 0) return { text: `Trễ ${-diff} ngày`, tone: 'warning' };
      if (diff === 0) return { text: 'Hạn hôm nay', tone: 'warning' };
      if (diff === 1) return { text: 'Hạn ngày mai', tone: 'warning' };
      return { text: `Còn ${diff} ngày`, tone: 'warning' };
    case 'upcoming':
    default:
      return { text: formatDay(dueDay), tone: 'muted' };
  }
}

/** One Meta for a list screen: first source, latest date, verified only if all are. */
export function aggregateMeta(items: Meta[]): Meta {
  if (items.length === 0) return { source: 'Nội dung mẫu cho Hackathon', updatedAt: '', verified: false };
  const sources = [...new Set(items.map((i) => i.source))];
  const updatedAt = items.map((i) => i.updatedAt).sort().at(-1) ?? '';
  return { source: sources.join('; '), updatedAt, verified: items.every((i) => i.verified) };
}
