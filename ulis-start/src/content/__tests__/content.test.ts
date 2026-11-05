import {
  about,
  benefits,
  contacts,
  content,
  faq,
  getContact,
  getGuide,
  getResource,
  getTask,
  guides,
  phases,
  resources,
  synonyms,
  tasks,
  validateContent,
} from '..';
import type { Task, Track } from '../../types';

const forTrack = (track: Track): Task[] =>
  tasks.filter((t) => t.tracks.includes('all') || t.tracks.includes(track));

describe('content validation', () => {
  it('has no validation errors', () => {
    expect(validateContent()).toEqual([]);
  });

  it('detects broken cross-references', () => {
    const broken = {
      ...content,
      tasks: [{ ...tasks[0], guideId: 'g-missing', formIds: ['r-missing'] }, ...tasks.slice(1)],
      faq: [{ ...faq[0], links: [{ kind: 'contact' as const, id: 'ct-missing' }] }],
    };
    const errors = validateContent(broken);
    expect(errors.some((e) => e.includes('g-missing'))).toBe(true);
    expect(errors.some((e) => e.includes('r-missing'))).toBe(true);
    expect(errors.some((e) => e.includes('ct-missing'))).toBe(true);
  });

  it('meets minimum counts', () => {
    expect(phases).toHaveLength(5);
    expect(guides.length).toBeGreaterThanOrEqual(8);
    expect(resources.length).toBeGreaterThanOrEqual(12);
    expect(resources.some((r) => r.status === 'superseded')).toBe(true);
    expect(faq.length).toBeGreaterThanOrEqual(25);
    expect(Object.keys(synonyms).length).toBeGreaterThanOrEqual(30);
    expect(contacts.length).toBeGreaterThanOrEqual(8);
    expect(benefits.length).toBeGreaterThan(0);
    expect(about.foundedYear).toBe(1955);
    expect(about.dayAtUlis?.length).toBeGreaterThanOrEqual(6);
    expect(about.dayAtUlis?.length).toBeLessThanOrEqual(8);
  });

  it('marks every item as unverified demo content', () => {
    const all = [...tasks, ...guides, ...contacts, ...resources, ...faq, ...benefits, about];
    for (const item of all) expect(item.verified).toBe(false);
  });

  it('every guide has 2–4 situations and all 7 categories are covered', () => {
    for (const g of guides) {
      expect(g.situations.length).toBeGreaterThanOrEqual(2);
      expect(g.situations.length).toBeLessThanOrEqual(4);
    }
    expect(new Set(guides.map((g) => g.category)).size).toBe(7);
  });

  it('lookup helpers resolve ids', () => {
    expect(getTask('t-welcome-submit-dossier')?.owner).toBe('me');
    expect(getGuide('g-leave')?.category).toBe('hr');
    expect(getContact('ct-hr')?.unit).toContain('TCTT');
    expect(getResource('r-reg-leave-old')?.status).toBe('superseded');
    expect(getTask('nope')).toBeUndefined();
  });

  it('uses only placeholder phone numbers and example emails', () => {
    for (const c of contacts) {
      if (c.phone) expect(c.phone).toBe('024 0000 0000');
      if (c.email) expect(c.email).toMatch(/^example-[a-z]+@ulis\.vnu\.edu\.vn$/);
    }
  });
});

describe('demo script support', () => {
  it('Day 0 lecturer sees ~4 preboard tasks incl. one owned by hr', () => {
    const pre = forTrack('lecturer').filter((t) => t.phaseId === 'preboard');
    expect(pre.length).toBeGreaterThanOrEqual(4);
    expect(pre.some((t) => t.owner === 'hr')).toBe(true);
  });

  it('a contact handles "công tác phí"', () => {
    expect(contacts.some((c) => c.handles.includes('công tác phí'))).toBe(true);
  });

  it('switching lecturer -> specialist swaps teaching tasks for admin-system tasks', () => {
    const lec = new Set(forTrack('lecturer').map((t) => t.id));
    const spec = new Set(forTrack('specialist').map((t) => t.id));
    expect(lec.has('t-lec-teaching-assignment')).toBe(true);
    expect(spec.has('t-lec-teaching-assignment')).toBe(false);
    expect(spec.has('t-spec-eoffice')).toBe(true);
    expect(lec.has('t-spec-eoffice')).toBe(false);
  });

  it('has a buddy-owned task (for the "connected" badge)', () => {
    expect(tasks.some((t) => t.owner === 'buddy')).toBe(true);
  });

  it('has required tasks due by day 8 in every track (overdue on Day 9)', () => {
    for (const track of ['lecturer', 'specialist', 'staff'] as Track[]) {
      const dueEarly = forTrack(track).filter((t) => t.required && t.dueDay <= 8);
      expect(dueEarly.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('each track has ~20 tasks and ~70% required', () => {
    for (const track of ['lecturer', 'specialist', 'staff'] as Track[]) {
      const list = forTrack(track);
      expect(list.length).toBeGreaterThanOrEqual(18);
      expect(list.length).toBeLessThanOrEqual(26);
      const ratio = list.filter((t) => t.required).length / list.length;
      expect(ratio).toBeGreaterThanOrEqual(0.6);
      expect(ratio).toBeLessThanOrEqual(0.85);
    }
  });
});
