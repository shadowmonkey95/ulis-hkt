import { dashboard } from '../../content';
import { filterByTrack, questionCounts, summarize, toCsv, withStatuses } from '../stats';

describe('dashboard stats', () => {
  it('summarizes the sample staff', () => {
    const s = summarize(dashboard.staff, dashboard.issues);
    expect(s.total).toBe(8);
    expect(s.completed).toBe(2);
    expect(s.distribution.reduce((a, b) => a + b, 0)).toBe(8);
    expect(s.unresolved).toBe(3);
  });

  it('filters by track and applies saved statuses', () => {
    expect(filterByTrack(dashboard.staff, 'lecturer').every((x) => x.track === 'lecturer')).toBe(true);
    const issues = withStatuses(dashboard.issues, { B01: 'resolved' });
    expect(summarize([], issues).unresolved).toBe(2);
  });

  it('adds chat questions to topic counts (accent-insensitive)', () => {
    const counts = questionCounts(dashboard.questions, ['Làm sao đăng ký chấm công?', 'cham cong o dau']);
    expect(counts.find((q) => q.id === 'q-attendance')?.count).toBe(20);
    expect(counts[0].id).toBe('q-attendance');
  });

  it('exports CSV with a BOM and quoted cells', () => {
    const csv = toCsv(dashboard.staff.slice(0, 1), () => 'Giảng viên');
    expect(csv.startsWith('﻿"Tên nhân sự"')).toBe(true);
    expect(csv).toContain('"Nguyễn Minh Hòa","Giảng viên"');
  });
});
