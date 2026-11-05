// Acceptance eval (PRODUCT_SPEC.md): 10 in-scope questions must cite the expected top source,
// 3 out-of-scope questions must be refused (confidence 'none') or guarded. Local mode only.
// Print the table with: EVAL_TABLE=1 npx jest src/assistant/__tests__/eval.test.ts
import { faq, getGuide } from '../../content';
import { answerLocal, NO_INFO_TEXT } from '../local';
import type { AskContext, AssistantReply } from '../types';

interface InScopeCase {
  q: string;
  expected: string;
  ctx?: AskContext;
}

const IN_SCOPE: InScopeCase[] = [
  { q: 'Tôi muốn xin nghỉ phép thì làm thế nào?', expected: 'faq-08' },
  { q: 'Cần chuẩn bị giấy tờ gì cho hồ sơ nhân sự?', expected: 'faq-02' },
  { q: 'toi chua co email cong vu', expected: 'faq-05' },
  { q: 'Quên mật khẩu email thì làm sao?', expected: 'faq-06' },
  { q: 'Nộp hồ sơ nhân sự ở đâu?', expected: 'faq-03' },
  { q: 'Thanh toán công tác phí hỏi ai?', expected: 'faq-11', ctx: { track: 'specialist' } },
  { q: 'Máy chiếu phòng học bị hỏng', expected: 'g-it-support' },
  { q: 'Xem lịch giảng ở đâu?', expected: 'faq-19' },
  { q: 'Khi nào tôi nhận lương tháng đầu?', expected: 'faq-13' },
  { q: 'Có cháy thì phải làm gì?', expected: 'faq-24', ctx: { track: 'staff' } },
];

const OUT_OF_SCOPE: { q: string; expect: 'guarded' | 'none' }[] = [
  { q: 'Lương giảng viên mới bao nhiêu triệu một tháng?', expect: 'guarded' },
  { q: 'Năm nay tôi được nghỉ mấy ngày phép?', expect: 'guarded' },
  { q: 'Thời tiết Hà Nội ngày mai thế nào?', expect: 'none' },
];

const rows: string[] = [];
const describeReply = (r: AssistantReply) =>
  `${r.confidence}${r.guarded ? `/guard:${r.guarded}` : ''} | ${r.sources.map((s) => s.id).join(', ') || '—'}`;

afterAll(() => {
  if (process.env.EVAL_TABLE) console.log(['# | question | expected | confidence | sources | result', ...rows].join('\n'));
});

describe('assistant eval – in scope', () => {
  it.each(IN_SCOPE.map((c, i) => [i + 1, c] as const))('#%i %p', (i, c) => {
    const r = answerLocal(c.q, { track: 'lecturer', ...c.ctx });
    const ok = r.sources[0]?.id === c.expected && r.confidence !== 'none' && !r.guarded;
    rows.push(`${i} | ${c.q} | ${c.expected} | ${describeReply(r)} | ${ok ? 'PASS' : 'FAIL'}`);
    expect(r.confidence).not.toBe('none');
    expect(r.guarded).toBeUndefined();
    expect(r.sources[0]?.id).toBe(c.expected);
    // Every answer cites a dated source and offers at least one next step.
    expect(r.sources[0]?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.actions.length).toBeGreaterThan(0);
  });
});

describe('assistant eval – out of scope', () => {
  it.each(OUT_OF_SCOPE.map((c, i) => [IN_SCOPE.length + i + 1, c] as const))('#%i %p', (i, c) => {
    const r = answerLocal(c.q, { track: 'lecturer' });
    const ok = c.expect === 'none' ? r.confidence === 'none' : r.guarded !== undefined;
    rows.push(`${i} | ${c.q} | (${c.expect}) | ${describeReply(r)} | ${ok ? 'PASS' : 'FAIL'}`);
    expect(r.confidence === 'none' || r.guarded !== undefined).toBe(true);
    if (c.expect === 'none') {
      expect(r.confidence).toBe('none');
      expect(r.text.startsWith(NO_INFO_TEXT)).toBe(true);
    } else {
      expect(r.guarded).toBeDefined();
      // Never states a number for salary / leave.
      expect(r.text).not.toMatch(/\d/);
    }
    // Always offers to escalate the question to Phòng TCTT.
    expect(r.actions.some((a) => a.kind === 'ask-hr')).toBe(true);
  });
});

// Sick leave / BHXH (content-architect's g-sick-leave). Skipped until that guide is in content/guides.json.
const sickLeave = getGuide('g-sick-leave');
const itSick = sickLeave ? it : it.skip;

describe('assistant eval – sick leave (BHXH)', () => {
  const sickFaqIds = faq.filter((f) => f.links.some((l) => l.kind === 'guide' && l.id === 'g-sick-leave')).map((f) => f.id);
  const opensSickGuide = (r: AssistantReply) =>
    r.actions.some((a) => a.kind === 'route' && typeof a.route === 'object' && 'params' in a.route && a.route.params?.id === 'g-sick-leave');

  itSick('in scope: "Tôi bị ốm phải nghỉ thì làm thủ tục BHXH thế nào?" → g-sick-leave or its FAQ', () => {
    const r = answerLocal('Tôi bị ốm phải nghỉ thì làm thủ tục BHXH thế nào?', { track: 'lecturer' });
    rows.push(`S1 | Tôi bị ốm phải nghỉ thì làm thủ tục BHXH thế nào? | g-sick-leave/FAQ | ${describeReply(r)}`);
    expect(r.confidence).not.toBe('none');
    expect(r.guarded).toBeUndefined();
    expect(['g-sick-leave', ...sickFaqIds]).toContain(r.sources[0]?.id);
    expect(opensSickGuide(r)).toBe(true); // chip opens the guide with the infographic
  });

  it.each(['Nghỉ ốm được hưởng bao nhiêu phần trăm lương?', 'Nghỉ ốm được hưởng bao nhiêu tiền?'])(
    'guarded: %p → points to g-sick-leave + ct-hr, no numbers',
    (q) => {
      if (!sickLeave) return;
      const r = answerLocal(q, { track: 'lecturer' });
      rows.push(`S | ${q} | (guarded) | ${describeReply(r)}`);
      expect(r.guarded).toBeDefined();
      expect(r.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['g-sick-leave', 'ct-hr']));
      expect(r.text).not.toMatch(/\d/);
      expect(opensSickGuide(r)).toBe(true);
      expect(r.actions.some((a) => a.kind === 'ask-hr')).toBe(true);
    },
  );
});
