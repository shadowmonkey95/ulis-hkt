// Out-of-scope guard: the assistant never computes salary/benefit amounts or leave counts and never
// interprets law. Detection runs on normalized text with word-boundary phrase matching.
import { containsPhrase, normalize } from '../search/normalize';
import type { GuardReason } from './types';

// Money topics → paired with an "amount" cue below. Each topic phrase is also used as the
// retrieval query to find the guide to point to (e.g. "luong" → Lương guide).
const MONEY_TOPICS = [
  'luong', 'thu nhap', 'phu cap', 'tro cap', 'tien thuong', 'thuong tet', 'cong tac phi', 'bao hiem', 'phuc loi',
  'muc chi', 'dinh muc',
  // BHXH / sickness benefits ("Nghỉ ốm được hưởng mấy phần trăm?").
  'nghi om', 'om dau', 'thai san', 'duong suc', 'bhxh', 'bao hiem xa hoi',
];
/** Phrases that ask for a money amount on their own, whatever the topic ("bao nhiêu tiền", "mấy tiền"). */
const AMOUNT_QUESTIONS = ['bao nhieu tien', 'may tien', 'het bao nhieu', 'duoc bao nhieu tien', 'bao nhieu phan tram', 'may phan tram'];
const AMOUNT_CUES = [
  'bao nhieu', 'may trieu', 'trieu', 'nghin dong', 'he so', 'bac luong', 'cach tinh', 'tinh luong', 'tinh the nao',
  'phan tram', 'duoc bao nhieu', 'muc luong', 'muc chi', 'muc phu cap', 'muc dong', 'muc huong', 'dinh muc',
];

const LEAVE_TOPICS = ['phep', 'ngay nghi', 'nghi'];
const LEAVE_COUNT_CUES = ['bao nhieu ngay', 'may ngay', 'so ngay', 'con bao nhieu', 'con may ngay', 'duoc nghi bao nhieu'];

const LEGAL_PHRASES = [
  'luat', 'bo luat', 'nghi dinh', 'thong tu', 'khoi kien', 'kien truong', 'toa an', 'khieu nai', 'tranh chap',
  'phap ly', 'hop phap', 'trai luat', 'trai phap luat', 'boi thuong', 'don phuong', 'cham dut hop dong', 'sa thai',
  'ky luat', 'dieu khoan', 'dieu luat', 'luat su',
];

export interface GuardHit {
  reason: GuardReason;
  /** Normalized topic phrase that triggered the guard (used to look up the guide to point to). */
  topic: string;
}

const firstPhrase = (text: string, phrases: readonly string[]) => phrases.find((p) => containsPhrase(text, p));

/** Returns why a question must not be answered with numbers/interpretation, or null if it is fine. */
export function detectOutOfScope(question: string): GuardHit | null {
  const n = normalize(question);
  if (!n) return null;

  const legal = firstPhrase(n, LEGAL_PHRASES);
  if (legal) return { reason: 'legal', topic: legal };

  const leaveTopic = firstPhrase(n, LEAVE_TOPICS);
  if (leaveTopic && firstPhrase(n, LEAVE_COUNT_CUES)) return { reason: 'leave-count', topic: 'nghi phep' };

  const money = firstPhrase(n, MONEY_TOPICS);
  if (money && firstPhrase(n, AMOUNT_CUES)) return { reason: 'amount', topic: money };
  const amount = firstPhrase(n, AMOUNT_QUESTIONS);
  if (amount) return { reason: 'amount', topic: money ?? 'luong' };

  return null;
}

export const GUARD_TEXT: Record<GuardReason, string> = {
  amount:
    'Mình không tự đưa ra hay tính các con số về lương, phụ cấp, phúc lợi để tránh sai lệch. Con số chính thức theo quy định hiện hành của Trường.',
  'leave-count':
    'Mình không tự tính số ngày phép của bạn. Số ngày phép được hưởng theo quy định hiện hành của Trường và cần được Phòng TCTT xác nhận.',
  legal:
    'Mình không diễn giải quy định pháp luật hay tư vấn pháp lý. Với câu hỏi này, bạn nên trao đổi trực tiếp với đơn vị phụ trách để có câu trả lời chính thức.',
};
