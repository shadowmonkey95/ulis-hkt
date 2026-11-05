import { containsPhrase, hasAnyPhrase, normalize } from '../normalize';

describe('normalize (Vietnamese)', () => {
  it.each([
    ['Nghỉ phép', 'nghi phep'],
    ['CÔNG TÁC PHÍ', 'cong tac phi'],
    ['Đăng ký email công vụ', 'dang ky email cong vu'],
    ['Phòng Tổ chức và Thanh tra (TCTT)', 'phong to chuc va thanh tra tctt'],
    ['  Quên   mật khẩu\temail?  ', 'quen mat khau email'],
    ['Thời khóa biểu / lịch giảng', 'thoi khoa bieu lich giang'],
    ['Bảo hiểm y tế', 'bao hiem y te'],
    ['Ước lượng ưu đãi', 'uoc luong uu dai'],
  ])('%s → %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it('treats precomposed and decomposed input the same', () => {
    expect(normalize('nghỉ phép'.normalize('NFD'))).toBe(normalize('nghỉ phép'.normalize('NFC')));
  });

  it('returns empty string for punctuation only', () => {
    expect(normalize(' ?!… ')).toBe('');
  });
});

describe('phrase helpers', () => {
  it('matches on word boundaries only', () => {
    expect(containsPhrase('gop y kien', 'kien')).toBe(true);
    expect(containsPhrase('kien nghi', 'kien nghi')).toBe(true);
    expect(containsPhrase('phep nam', 'phe')).toBe(false);
  });

  it('hasAnyPhrase normalizes the text', () => {
    expect(hasAnyPhrase('Lương của tôi bao nhiêu?', ['bao nhieu'])).toBe(true);
    expect(hasAnyPhrase('Lương tháng đầu', ['bao nhieu'])).toBe(false);
  });
});
