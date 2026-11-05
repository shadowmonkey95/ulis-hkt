// Pure dashboard calculations (no React, no storage) so they can be unit-tested.
import { normalize } from '../search/normalize';
import type { DashboardIssue, DashboardQuestion, DashboardStaff, IssueStatus, Track } from '../types';

export type TrackFilter = Track | 'all';
export type IssueFilter = IssueStatus | 'all';

export const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

export interface DashboardSummary {
  total: number;
  completed: number;
  completedPct: number;
  averagePct: number;
  unresolved: number;
  /** [100%, 50–99%, < 50%] */
  distribution: [number, number, number];
}

export function filterByTrack<T extends { track: Track }>(items: T[], filter: TrackFilter): T[] {
  return filter === 'all' ? items : items.filter((x) => x.track === filter);
}

export function summarize(staff: DashboardStaff[], issues: DashboardIssue[]): DashboardSummary {
  const total = staff.length;
  const completed = staff.filter((x) => x.total > 0 && x.done >= x.total).length;
  const averagePct = total ? Math.round(staff.reduce((s, x) => s + pct(x.done, x.total), 0) / total) : 0;
  const middle = staff.filter((x) => pct(x.done, x.total) >= 50 && x.done < x.total).length;
  const low = staff.filter((x) => pct(x.done, x.total) < 50).length;
  return {
    total,
    completed,
    completedPct: pct(completed, total),
    averagePct,
    unresolved: issues.filter((x) => x.status !== 'resolved').length,
    distribution: [completed, middle, low],
  };
}

/** Applies the manager's saved status changes to the issues. */
export function withStatuses(issues: DashboardIssue[], statuses: Record<string, IssueStatus>): DashboardIssue[] {
  return issues.map((x) => ({ ...x, status: statuses[x.id] ?? x.status }));
}

/** Sample counts plus the user's own chat questions that mention a topic keyword; most asked first. */
export function questionCounts(questions: DashboardQuestion[], asked: string[]): { id: string; question: string; count: number }[] {
  const folded = asked.map(normalize);
  return questions
    .map((q) => {
      const keys = q.keywords.map(normalize);
      const extra = folded.filter((text) => keys.some((k) => text.includes(k))).length;
      return { id: q.id, question: q.question, count: q.count + extra };
    })
    .sort((a, b) => b.count - a.count);
}

/** CSV (UTF-8 with BOM so Excel shows Vietnamese correctly). */
export function toCsv(staff: DashboardStaff[], trackLabel: (t: Track) => string): string {
  const rows: (string | number)[][] = [
    ['Tên nhân sự', 'Nhóm', 'Đơn vị', 'Nhiệm vụ hoàn thành', 'Nhiệm vụ áp dụng', 'Tiến độ (%)'],
    ...staff.map((x) => [x.name, trackLabel(x.track), x.unit, x.done, x.total, pct(x.done, x.total)]),
  ];
  return '﻿' + rows.map((r) => r.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
