import { appendHistory, clearHistory, loadHistory, MAX_HISTORY, ask, assistantMode, type ChatMessage } from '..';
import { detectOutOfScope } from '../guard';
import { answerLocal, NO_INFO_TEXT } from '../local';
import { askRemote, replyFromRemote } from '../remote';
import { retrieve, retrieveChunks } from '../retrieve';
import { suggestQuestions } from '../suggest';

// babel-jest hoists this above the imports.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('out-of-scope guard', () => {
  it.each([
    ['Lương của tôi bao nhiêu?', 'amount'],
    ['Hệ số lương giảng viên mới là mấy?', 'amount'],
    ['Đóng bảo hiểm bao nhiêu phần trăm lương?', 'amount'],
    ['Tôi còn bao nhiêu ngày phép?', 'leave-count'],
    ['Nghỉ ốm được hưởng bao nhiêu tiền?', 'amount'],
    ['Trợ cấp ốm đau được mấy tiền một ngày?', 'amount'],
    ['Nghỉ thai sản được hưởng bao nhiêu phần trăm?', 'amount'],
    ['Làm hồ sơ nhân sự hết bao nhiêu?', 'amount'],
    ['Theo Bộ luật Lao động tôi có quyền gì?', 'legal'],
    ['Đơn phương chấm dứt hợp đồng có bị bồi thường không?', 'legal'],
  ])('%s → %s', (q, reason) => {
    expect(detectOutOfScope(q)?.reason).toBe(reason);
  });

  it.each([
    'Khi nào tôi nhận lương tháng đầu tiên?',
    'Tôi muốn đổi tài khoản ngân hàng nhận lương',
    'Tôi muốn xin nghỉ phép',
    'Tôi muốn góp ý kiến về quy trình',
    'Bình thường mấy giờ thì vào làm?',
    'Đóng dấu công văn ở đâu?',
    'Thanh toán công tác phí cần giấy tờ gì?',
    'Tôi cần tạm ứng tiền đi công tác thì làm sao?',
    'Tôi bị ốm phải nghỉ thì làm thủ tục BHXH thế nào?',
    'Nghỉ chăm con ốm có được hưởng trợ cấp không?',
  ])('does not guard in-scope question: %s', (q) => {
    expect(detectOutOfScope(q)).toBeNull();
  });

  it('legal questions point to Phòng TCTT and never interpret', () => {
    const r = answerLocal('Trường chấm dứt hợp đồng thì tôi có khởi kiện được không?');
    expect(r.guarded).toBe('legal');
    expect(r.sources.map((s) => s.id)).toContain('ct-hr');
    expect(r.actions.some((a) => a.kind === 'ask-hr')).toBe(true);
  });
});

describe('answerLocal', () => {
  it('returns the honest fallback for empty and unknown questions', () => {
    for (const q of ['', '   ', 'Công thức nấu phở bò']) {
      const r = answerLocal(q);
      expect(r.confidence).toBe('none');
      expect(r.text.startsWith(NO_INFO_TEXT)).toBe(true);
      expect(r.sources).toEqual([]);
      expect(r.actions.find((a) => a.kind === 'ask-hr')).toMatchObject({ label: 'Gửi câu hỏi tới Phòng TCTT' });
    }
  });

  it('cites the context task and offers to mark it done', () => {
    const r = answerLocal('Mình cần làm gì cho việc “Chuẩn bị hồ sơ nhân sự theo danh mục”?', { taskId: 't-preboard-dossier', track: 'lecturer' });
    expect(r.confidence).toBe('high');
    expect(r.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['g-hr-dossier', 't-preboard-dossier']));
    expect(r.actions[0]).toMatchObject({ kind: 'complete-task', taskId: 't-preboard-dossier' });
    expect(r.steps?.length).toBeGreaterThan(0);
  });

  it('does not offer completion for check-in tasks', () => {
    const r = answerLocal('Trả lời check-in ngày 3', { taskId: 't-welcome-checkin-d3' });
    expect(r.actions.some((a) => a.kind === 'complete-task')).toBe(false);
  });

  it('boosts the context task, its guide and contact', () => {
    const q = 'cần chuẩn bị giấy tờ gì';
    const plain = retrieve(q);
    const boosted = retrieve(q, { taskId: 't-preboard-dossier' });
    expect(boosted.contextIds).toEqual(['t-preboard-dossier', 'g-hr-dossier', 'ct-hr']);
    const score = (r: typeof plain, id: string) => r.hits.find((h) => h.id === id)?.score ?? 0;
    expect(score(boosted, 'g-hr-dossier')).toBeGreaterThan(score(plain, 'g-hr-dossier'));
  });

  it('every source carries title, date and verified flag; routes point to real screens', () => {
    const r = answerLocal('Tôi muốn xin nghỉ phép');
    for (const s of r.sources) {
      expect(s.title).toBeTruthy();
      expect(s.verified).toBe(false);
    }
    const routes = r.actions.flatMap((a) => (a.kind === 'route' ? [a.route] : []));
    expect(routes).toContainEqual({ pathname: '/guide/[id]', params: { id: 'g-leave' } });
    expect(routes).toContainEqual({ pathname: '/contacts/[id]', params: { id: 'ct-hr' } });
  });

  it('runs well under 20ms per question', () => {
    answerLocal('warm up nghỉ phép');
    const qs = ['Tôi muốn xin nghỉ phép', 'quên mật khẩu email', 'máy chiếu hỏng', 'thời tiết hôm nay', 'thanh toán công tác phí'];
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) for (const q of qs) answerLocal(q);
    expect((Date.now() - t0) / 100).toBeLessThan(20);
  });
});

describe('remote mode', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('is off without EXPO_PUBLIC_ASSISTANT_URL and never calls the network', async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    expect(assistantMode).toBe('local');
    const r = await ask('Tôi muốn xin nghỉ phép');
    expect(r.mode).toBe('local');
    expect(spy).not.toHaveBeenCalled();
  });

  it('maps server ids back to bundled content and drops unknown ids', () => {
    const r = replyFromRemote({ answer: 'Bạn làm đơn xin nghỉ phép.', sources: ['g-leave', 'nope', 'ct-hr'] }, 'q', {});
    expect(r.mode).toBe('remote');
    expect(r.sources.map((s) => s.id)).toEqual(['g-leave', 'ct-hr']);
    expect(r.sources[0]).toMatchObject({ title: 'Xin nghỉ phép', updatedAt: '2026-11-03' });
    expect(r.confidence).toBe('high');
  });

  it('remote answer without sources is low confidence with the TCTT action', () => {
    const r = replyFromRemote({ answer: 'Mình chưa có thông tin.', sources: [] }, 'q', {});
    expect(r.confidence).toBe('low');
    expect(r.actions.some((a) => a.kind === 'ask-hr')).toBe(true);
  });

  it('shows uploaded-document sources with page numbers, before app content', () => {
    const r = replyFromRemote(
      {
        verdict: 'answer',
        answer: 'Theo quy chế, bạn nộp đơn cho đơn vị.',
        steps: ['Viết đơn', ' ', 'Nộp cho đơn vị'],
        sources: ['g-leave'],
        docSources: [{ id: 'dabc12-3', title: 'Quy chế nội bộ', page: 4, uploadedAt: '2026-11-05T00:00:00Z' }],
      },
      'q',
      {},
    );
    expect(r.sources.map((s) => s.kind)).toEqual(['document', 'guide']);
    expect(r.sources[0]).toMatchObject({ title: 'Quy chế nội bộ – trang 4', page: 4, verified: true });
    expect(r.steps).toEqual(['Viết đơn', 'Nộp cho đơn vị']);
    expect(r.confidence).toBe('high');
    // Document sources have no in-app screen, so they add no navigation chip.
    expect(r.actions.every((a) => a.kind !== 'route' || a.label !== 'Quy chế nội bộ')).toBe(true);
  });

  it('out-of-scope verdict: no sources, no actions; not_found offers the TCTT action', () => {
    const out = replyFromRemote({ verdict: 'out_of_scope', answer: 'Mình chỉ hỗ trợ câu hỏi về ULIS.', sources: [] }, 'thời tiết?', {});
    expect(out).toMatchObject({ confidence: 'none', sources: [], actions: [] });
    const nf = replyFromRemote(
      { verdict: 'not_found', answer: 'Mình chưa có thông tin.', sources: [], docSources: [{ id: 'd1-1', title: 'Sổ tay' }] },
      'q',
      {},
    );
    expect(nf.confidence).toBe('low');
    expect(nf.actions.some((a) => a.kind === 'ask-hr')).toBe(true);
  });

  it('askRemote posts the question and rejects on server errors', async () => {
    const ok = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ answer: 'OK [g-leave]', sources: ['g-leave'] }) });
    global.fetch = ok as unknown as typeof fetch;
    const r = await askRemote('nghỉ phép', { taskId: 't-ready-leave-timekeeping' }, 'http://x:8787');
    expect(ok).toHaveBeenCalledWith('http://x:8787/ask', expect.objectContaining({ method: 'POST' }));
    expect(r.sources[0]?.id).toBe('g-leave');

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;
    await expect(askRemote('nghỉ phép', {}, 'http://x:8787')).rejects.toThrow('503');
  });

  it('retrieveChunks gives the server ≤6 chunks with context first-class', () => {
    const chunks = retrieveChunks('sơ yếu lý lịch', { taskId: 't-preboard-dossier' });
    expect(chunks.length).toBeLessThanOrEqual(6);
    expect(chunks.map((c) => c.id)).toEqual(expect.arrayContaining(['t-preboard-dossier', 'g-hr-dossier']));
    expect(chunks[0]?.text).toContain('cập nhật');
  });
});

describe('suggestQuestions', () => {
  it('returns 5 FAQ items, led by the user’s open tasks, never other tracks', () => {
    const s = suggestQuestions({ track: 'specialist' });
    expect(s).toHaveLength(5);
    expect(s.map((f) => f.id)).not.toContain('faq-18'); // lecturer-only task link
    const done = suggestQuestions({ track: 'specialist', completed: { 't-preboard-contract': 'x' } });
    expect(done.map((f) => f.id)).not.toContain('faq-04');
  });
});

describe('history (merge-safe)', () => {
  const msg = (id: string): ChatMessage => ({ id, role: 'user', text: id, at: '2026-11-03T00:00:00.000Z' });

  it('concurrent appends from two screen instances keep every message', async () => {
    await clearHistory();
    // Two instances, each only knowing its own messages, write at the same time.
    await Promise.all([appendHistory(msg('a1')), appendHistory(msg('b1')), appendHistory(msg('a2'), msg('a1'))]);
    expect((await loadHistory()).map((m) => m.id)).toEqual(['b1', 'a2', 'a1']);
  });

  it('keeps only the last MAX_HISTORY messages', async () => {
    await clearHistory();
    await appendHistory(...Array.from({ length: MAX_HISTORY + 5 }, (_, i) => msg(`m${i}`)));
    const saved = await loadHistory();
    expect(saved).toHaveLength(MAX_HISTORY);
    expect(saved[0]?.id).toBe('m5');
  });
});
