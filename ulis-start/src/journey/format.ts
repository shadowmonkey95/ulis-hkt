// Vietnamese display helpers for journey values (pure).
import type { Owner, Task } from '../types';
import { JOURNEY_LENGTH, parseLocalDate } from './engine';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "Thứ Ba, 04/11/2026" */
export function formatDateVi(d: Date | string): string {
  const date = typeof d === 'string' ? parseLocalDate(d) : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]}, ${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "Ngày 9/30", "Còn 1 ngày đến ngày đầu" (Day 0), "Đã qua 30 ngày" */
export function dayCounterLabel(day: number): string {
  if (day <= 0) return `Còn ${1 - day} ngày đến ngày đầu`;
  if (day > JOURNEY_LENGTH) return `Đã qua ${JOURNEY_LENGTH} ngày`;
  return `Ngày ${day}/${JOURNEY_LENGTH}`;
}

/** Vietnamese given name = last word ("Nguyễn Minh An" → "An"). */
export function givenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName.trim();
}

export const isMine =(owner: Owner) => owner === 'me';

/** Primary action label: "Đánh dấu hoàn thành" for own tasks, "Đã nhận" for tasks done by others. */
export function completeLabel(owner: Owner): string {
  return isMine(owner) ? 'Đánh dấu hoàn thành' : 'Đã nhận';
}

/** Accessibility label for a completion checkbox. */
export function checkboxA11yLabel(task: Task, done: boolean): string {
  if (done) return `Bỏ đánh dấu: ${task.title}`;
  return isMine(task.owner) ? `Đánh dấu hoàn thành: ${task.title}` : `Đã nhận: ${task.title}`;
}
