// Content + assistant integration for the BHXH sickness-benefit guide (g-sick-leave).
import { answerLocal } from '../../assistant/local';
import { isContentImageKey } from '../imageKeys';
import { benefits, getGuide, validateContent, content } from '..';

const routeIds = (q: string) =>
  answerLocal(q).actions.flatMap((a) => {
    if (a.kind !== 'route' || typeof a.route !== 'object' || !a.route.params) return [];
    const { id } = a.route.params as { id?: string };
    return id ? [id] : [];
  });

describe('g-sick-leave', () => {
  it('has a registered infographic with alt text and source', () => {
    const g = getGuide('g-sick-leave');
    expect(g?.category).toBe('hr');
    expect(g?.contactId).toBe('ct-hr');
    const img = g?.images?.[0];
    expect(img && isContentImageKey(img.asset)).toBe(true);
    expect(img?.source).toBe('Bảo hiểm xã hội Việt Nam');
    expect(img?.alt.length).toBeGreaterThan(200);
  });

  it('guide text itself contains no percentages or money amounts', () => {
    const g = getGuide('g-sick-leave');
    const text = [g?.purpose, g?.whoDoes, ...(g?.prepare ?? []), ...(g?.steps ?? [])].join(' ');
    expect(text).not.toMatch(/\d+\s*%|đồng|\d{1,3}(\.\d{3})+/);
  });

  it('insurance benefit links to the guide', () => {
    expect(benefits.find((b) => b.id === 'b-insurance')?.guideId).toBe('g-sick-leave');
  });

  it('validator rejects an unknown image asset', () => {
    const guides = content.guides.map((g) =>
      g.id === 'g-sick-leave' ? { ...g, images: [{ ...g.images![0], asset: 'nope' }] } : g,
    );
    expect(validateContent({ ...content, guides }).some((e) => e.includes('"nope"'))).toBe(true);
  });
});

describe('assistant on sickness benefit', () => {
  it('refuses percentage questions and points to g-sick-leave + ct-hr', () => {
    const r = answerLocal('Tôi được hưởng bao nhiêu phần trăm lương khi ốm?');
    expect(r.guarded).toBe('amount');
    const ids = routeIds('Tôi được hưởng bao nhiêu phần trăm lương khi ốm?');
    expect(ids).toEqual(expect.arrayContaining(['g-sick-leave', 'ct-hr']));
  });

  it.each([
    ['Tôi bị ốm thì thủ tục hưởng BHXH thế nào?', 'faq-31'],
    ['Nghỉ chăm con ốm có được hưởng trợ cấp không?', 'faq-32'],
  ])('answers "%s" from %s', (q, id) => {
    const r = answerLocal(q);
    expect(['g-sick-leave', id]).toContain(r.sources[0]?.id);
    expect(routeIds(q)).toContain('g-sick-leave');
  });
});
