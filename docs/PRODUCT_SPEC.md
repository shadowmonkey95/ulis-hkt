# Product spec – ULIS START

## Positioning
**ULIS START – Hệ sinh thái hội nhập số, đồng hành cùng cán bộ mới từ ngày đầu tiên.**
Message: *Một nơi để BIẾT – một nơi để LÀM – một nơi để HỎI.*

Problem (from the team brief): new staff get information from scattered sources and must ask many
people "cần làm gì – làm ở đâu – hỏi ai". Onboarding is slow, mentors repeat themselves, steps get missed.

## Changes vs. the ChatGPT draft (and why)
| Draft | This build | Reason |
|---|---|---|
| Website, 8 modules, 6-item menu | Mobile app, **4 bottom tabs** + home shortcuts | Demo is on a phone; 6 menu items don't fit a tab bar |
| Journey = static list grouped by days | Journey = **engine** with a "today" pointer, deadlines, owners, overdue logic | Turns a handbook into an assistant — the hackathon differentiator |
| One journey for everyone | **3 role tracks** (Giảng viên / Chuyên viên / Người lao động) sharing a common core | Answers the draft's own open question; personalisation is visible in 1 tap |
| Starts at Day 1 | Adds **"Trước ngày đầu" (pre-boarding)** phase | Most anxiety and missing paperwork happen before Day 1 |
| Tasks only for the new hire | Each task has an **owner**: Bạn / Đơn vị / Phòng TCTT / Buddy | Shows the institution's side; supports the "đơn vị quản lý" value |
| Feedback after 30 days | **Pulse check-ins** at Day 3, 7, 15, 30 (1 tap emoji + optional note) | Catches problems early; gives HR data for the pitch |
| AI as separate module | AI is **contextual**: every task has "Hỏi trợ lý về việc này" | Makes the AI useful instead of decorative |
| — | **Demo controls**: jump to Day N, reset, switch role | A judge must see Day 1 and Day 20 in a 3-minute demo |

## Navigation (expo-router)
```
app/
  _layout.tsx                 # providers (Journey, Profile), fonts, theme
  onboarding.tsx              # first launch: name, role, unit, start date
  (tabs)/_layout.tsx          # 4 tabs
  (tabs)/index.tsx            # Hôm nay   – today card, progress ring, next 3 tasks, shortcuts
  (tabs)/journey.tsx          # Hành trình – phase timeline, all tasks
  (tabs)/assistant.tsx        # Trợ lý    – chat
  (tabs)/more.tsx             # Khám phá  – entry list: Về ULIS, Cẩm nang, Danh bạ, Tài liệu, Phúc lợi, Góp ý, Cài đặt demo
  task/[id].tsx               # task detail
  guide/[id].tsx              # procedure detail (6-part structure)
  contacts/index.tsx, contacts/[id].tsx
  library/index.tsx
  about.tsx, benefits.tsx, feedback.tsx
  checkin/[day].tsx           # pulse check-in modal
  demo.tsx                    # demo controls (hidden: long-press app title or in "Khám phá")
```

## Modules & scope
**MVP (must demo):** Onboarding profile · Hôm nay · Hành trình 30 ngày · Task detail · Cẩm nang (6 guides) ·
Danh bạ "Tôi cần gặp ai?" · Trợ lý (local mode) · Demo controls.
**Smart (should):** Situation search ("Tôi muốn xin nghỉ phép") across tasks/guides/contacts · Pulse check-ins ·
Milestone badges · Remote AI mode via proxy.
**Later (mention in pitch only):** Buddy matching, interactive campus map, HR dashboard web, admin CMS, SSO.

## AI assistant
- `local` mode (default, offline): tokenize Vietnamese (lowercase + strip diacritics for matching),
  score against `content/faq.json`, guides, tasks, contacts using keyword overlap + synonyms table.
  Answer = template: short answer + steps + "Nguồn: <title>, cập nhật <date>" + action chips
  (open guide / open contact / mark task). If score < threshold → "Mình chưa có thông tin chính thức về việc này"
  + suggest contact + "Gửi câu hỏi tới Phòng TCTT" (stored in feedback).
- `remote` mode: app → `POST {EXPO_PUBLIC_ASSISTANT_URL}/ask` → `server/` (Node, ~80 lines) retrieves top-k
  content chunks the same way, calls the Claude API with a system prompt that **forbids answering beyond the
  provided sources**, and returns `{answer, sources[]}`. Key lives in `server/.env` only.
- Rules for both modes: always cite source + date; never invent salary/leave/benefit rules; show the disclaimer
  "Trợ lý chỉ hướng dẫn, vui lòng kiểm tra văn bản hiện hành."

## Demo script (3 minutes) – qa-demo rehearses this
1. Fresh launch → onboarding: "Nguyễn Minh An", Giảng viên, Khoa Tiếng Anh, start = **Ngày mai** (the default — makes today Day 0; don't pick "Hôm nay", that is Day 1 with overdue tasks) (20s)
2. Hôm nay (Day 0 – pre-boarding): 3 tasks + "+1 việc khác cần làm" (Hôm nay shows max 3), one owned by Phòng TCTT shown as "đang chờ đơn vị" (20s)
3. Tick 2 tasks → haptic + progress ring animates → badge "Khởi động" (20s)
4. Open a task → guide steps → "Hỏi trợ lý về việc này" → cited answer (40s)
5. Demo controls → "Hoàn thành ngẫu nhiên 50%" → jump to Day 9 → overdue banner, phase 3 unlocked, Day 7 check-in prompt (40s)
6. Switch role to Chuyên viên → journey re-computes (teaching tasks disappear, admin-system tasks appear) (20s)
7. Danh bạ: "Tôi cần hỏi về công tác phí" → contact card (20s)

## Acceptance criteria (copy into docs/PROGRESS.md and tick)
- [ ] Cold start to Hôm nay < 3s on a mid phone in Expo Go
- [ ] Progress survives app restart
- [ ] Changing role or start date recomputes the journey without losing completed common tasks
- [ ] Every task/guide/contact screen shows source + updatedAt + "Nội dung mẫu" badge when unverified
- [ ] Assistant answers 10 FAQ test questions correctly in local mode, refuses 3 out-of-scope ones
- [ ] Works on web (`expo start --web`) for projector backup
- [ ] Usable with large system font (no clipped text) and VoiceOver/TalkBack labels on interactive elements
