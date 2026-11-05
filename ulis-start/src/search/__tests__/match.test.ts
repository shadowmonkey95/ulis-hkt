import { contacts, synonyms } from '../../content';
import { expandQuery, groupHits, normalize, searchContent, textMatches, tokenize } from '../match';

describe('normalize / tokenize', () => {
  it('lowercases, strips diacritics and đ', () => {
    expect(normalize('Đường Nghỉ PHÉP – Công tác phí!')).toBe('duong nghi phep cong tac phi');
    expect(normalize('  Thẻ   cán bộ ')).toBe('the can bo');
  });

  it('drops stopwords and 1-char tokens', () => {
    expect(tokenize('Tôi muốn xin nghỉ phép ở đâu?')).toEqual(['nghi', 'phep']);
  });
});

describe('expandQuery', () => {
  it('adds synonym variants for a matched group', () => {
    const terms = expandQuery('đi công tác', synonyms).map((t) => t.term);
    expect(terms).toContain('cong tac phi');
    expect(terms).toContain('thanh toan di cong tac');
  });

  it('returns nothing for empty / stopword-only queries', () => {
    expect(expandQuery('', synonyms)).toEqual([]);
    expect(expandQuery('tôi cần gì', synonyms)).toEqual([]);
  });
});

describe('searchContent', () => {
  it('finds the leave guide from a situation sentence', () => {
    const hits = searchContent('Tôi muốn xin nghỉ phép');
    expect(hits[0]).toMatchObject({ kind: 'guide', id: 'g-leave' });
  });

  it('is diacritic-insensitive', () => {
    const hits = searchContent('cong tac phi', { kinds: ['guide'] });
    expect(hits[0]?.id).toBe('g-travel-allowance');
  });

  it('answers "Tôi cần gặp ai?" for công tác phí with the finance contact', () => {
    const hits = searchContent('Tôi cần hỏi về công tác phí', { kinds: ['contact'] });
    expect(hits[0]?.id).toBe('ct-finance');
    expect(hits[0]?.matchedText).toBe('công tác phí');
  });

  it('relativeCutoff drops one-syllable noise for multi-word queries', () => {
    const ids = searchContent('Tôi cần hỏi về công tác phí', { kinds: ['contact'], minScore: 1, relativeCutoff: 0.5 }).map((h) => h.id);
    expect(ids[0]).toBe('ct-finance');
    expect(ids).not.toContain('ct-union');
  });

  it('routes email problems to IT', () => {
    const hits = searchContent('quên mật khẩu email', { kinds: ['contact'] });
    expect(hits[0]?.id).toBe('ct-it');
  });

  it('respects kinds, track and limit', () => {
    const hits = searchContent('lịch giảng phòng học', { kinds: ['task'], track: 'specialist', limit: 3 });
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits.every((h) => h.kind === 'task')).toBe(true);
  });

  it('excludes superseded resources by default', () => {
    const ids = searchContent('quy định nghỉ phép', { kinds: ['resource'] }).map((h) => h.id);
    expect(ids).not.toContain('r-reg-leave-old');
    const withOld = searchContent('quy định nghỉ phép', { kinds: ['resource'], includeSuperseded: true }).map((h) => h.id);
    expect(withOld).toContain('r-reg-leave-old');
  });

  it('returns no hits for out-of-scope questions', () => {
    expect(searchContent('giá vàng hôm nay bao nhiêu')).toEqual([]);
    expect(searchContent('xyz qwerty')).toEqual([]);
  });

  it('groups hits guides → tasks → contacts', () => {
    const kinds = groupHits(searchContent('nghỉ phép')).map((g) => g.kind);
    expect(kinds.indexOf('guide')).toBeLessThan(kinds.indexOf('contact'));
    if (kinds.includes('task')) expect(kinds.indexOf('task')).toBeLessThan(kinds.indexOf('contact'));
  });

  it('every contact is findable by its first handle', () => {
    for (const c of contacts) {
      const ids = searchContent(c.handles[0], { kinds: ['contact'], minScore: 0.1 }).map((h) => h.id);
      expect(ids).toContain(c.id);
    }
  });
});

describe('textMatches', () => {
  it('matches all tokens accent-insensitively', () => {
    expect(textMatches('mau don', 'Mẫu đơn xin nghỉ phép')).toBe(true);
    expect(textMatches('mau luong', 'Mẫu đơn xin nghỉ phép')).toBe(false);
    expect(textMatches('', 'anything')).toBe(true);
  });
});
