# 30-day journey spec (core feature)

## Concepts
- **Start date** (`startDate`): the new hire's first working day = Day 1. Pre-boarding = Day ≤ 0.
- **Current day** (`currentDay`): `businessDaysBetween(startDate, today) + 1`, or the demo override.
  Use **calendar days** for simplicity (the draft's "30 ngày" is calendar); expose a single function so it can change.
- **Phase**: a range of days with a goal. Phases unlock by day, never lock again.
- **Task**: an atomic thing to do, with an owner and a due day.
- **Track**: role filter. A task has `tracks: ("all"|"lecturer"|"specialist"|"staff")[]`.

## Phases (5 — draft had 4; pre-boarding added)
| # | id | Days | Tên | Mục tiêu (shown under title) |
|---|---|---|---|---|
| 0 | `preboard` | −7…0 | Trước ngày đầu | Chuẩn bị hồ sơ, biết ngày đầu đi đâu, gặp ai |
| 1 | `welcome` | 1–3 | Chào mừng & làm quen | Nhận việc, làm quen đơn vị, hoàn tất thủ tục ban đầu |
| 2 | `ready` | 4–7 | Sẵn sàng làm việc | Có tài khoản, biết hệ thống, biết đầu mối hỗ trợ |
| 3 | `integrate` | 8–15 | Hòa nhập chuyên môn | Hiểu vị trí việc làm, quy trình phối hợp, biểu mẫu |
| 4 | `grow` | 16–30 | Chủ động & phát triển | Tự thực hiện nhiệm vụ, phản hồi, kế hoạch phát triển |

## Task schema (see DATA_MODEL.md for TS types)
Each task has: `id, phaseId, title, why (1 sentence: vì sao quan trọng), dueDay, owner, tracks,
required, estimatedMinutes, steps[], guideId?, contactId?, formIds[], source, updatedAt, verified`.

Owners: `me` (Bạn), `unit` (Đơn vị/Khoa), `hr` (Phòng Tổ chức và Thanh tra), `it` (Trung tâm CNTT/ phòng phụ trách CNTT),
`buddy` (Người đồng hành). Non-`me` tasks are shown as "Đơn vị sẽ làm – bạn cần: …" with the user's part,
and the user marks them "Đã nhận" (received) rather than "Đã làm".

## Task states (derived, not stored except `done`)
```
done          stored: completedAt set
upcoming      dueDay > currentDay + 2
dueSoon       currentDay ≤ dueDay ≤ currentDay + 2
overdue       dueDay < currentDay && !done && required
skipped       optional && dueDay < currentDay - 3 && !done   (shown collapsed, not red)
locked        phase.startDay > currentDay   (title visible, checkbox disabled, "Mở vào ngày X")
```
Users CAN complete locked tasks early? → **Yes** for `me` tasks (people get ahead), with no penalty. Keep checkbox enabled
but visually muted. (Decision: don't block motivated people.)

## Progress metrics
- **Overall %** = done required tasks in user's track / all required tasks in track. Optional tasks don't dilute %.
- **Phase %** same formula per phase.
- **On-track status**: `onTrack` if no overdue required tasks; `behind` if 1–2; `needsHelp` if ≥3 → banner
  "Bạn đang có 3 việc quá hạn – cần hỗ trợ?" with button to the relevant contact.

## Hôm nay screen (the first thing the user sees)
1. Greeting: "Chào An, hôm nay là ngày 9/30 của bạn" + phase chip.
2. Progress ring (overall %) + "7/20 việc bắt buộc".
3. Overdue banner (if any).
4. **"Việc của hôm nay"**: overdue + dueSoon tasks, max 3, sorted overdue → required → dueDay.
   Empty state: "Hôm nay bạn đã xong việc! Xem trước giai đoạn tiếp theo →".
5. Check-in card if a check-in day passed and not answered.
6. Shortcuts row: Cẩm nang · Danh bạ · Tài liệu · Hỏi trợ lý.
7. Next milestone teaser: "Còn 2 việc để đạt huy hiệu Sẵn sàng".

## Hành trình screen
Vertical timeline of 5 phases. Current phase expanded, others collapsed with %.
Each task row: checkbox · title · owner chip · due label ("Ngày 5", "Quá hạn 2 ngày") · chevron.
Filter chips at top: Tất cả · Của tôi · Chưa xong · Bắt buộc.

## Task detail screen
Title, why, due + owner, steps (numbered, each step may have a link), forms to download (link out),
contact card (tap to call/email – `Linking`), "Mở hướng dẫn chi tiết" (guide), **"Hỏi trợ lý về việc này"**
(opens assistant prefilled with task context), big primary button "Đánh dấu hoàn thành" / "Đã nhận",
source footer with verified badge. Completing: haptic success, toast "Tuyệt! +1 việc", back.

## Milestones / badges (5)
| id | Điều kiện | Tên |
|---|---|---|
| `kickoff` | first task done | Khởi động |
| `paperwork` | all required `preboard`+`welcome` tasks done | Hồ sơ hoàn tất |
| `ready` | phase `ready` 100% required | Sẵn sàng |
| `connected` | contact viewed ≥3 + buddy task done | Kết nối |
| `journey30` | overall 100% + day-30 check-in | Thành viên ULIS |
Badge unlock = modal with confetti-ish animation (Animated API only; no extra lib needed).

## Pulse check-ins
Days 3, 7, 15, 30. One question each, 5 emoji scale + optional note:
- D3 "Những ngày đầu của bạn thế nào?"
- D7 "Bạn đã biết cần hỏi ai khi gặp khó khăn chưa?"
- D15 "Công việc chuyên môn đang rõ ràng với bạn chứ?"
- D30 "Bạn có sẵn sàng giới thiệu ULIS là nơi làm việc tốt?" + "Điều gì nên cải thiện cho người sau?"
Stored locally; (pitch) aggregated anonymously for Phòng TCTT. Score ≤2 → show contact suggestion immediately.

## Role-track differences (seed content must reflect these)
- **Common (all)**: quyết định/hợp đồng, hồ sơ nhân sự, email công vụ, quy tắc ứng xử, gặp lãnh đạo đơn vị,
  nhận Buddy, an toàn PCCC/tòa nhà, chấm công/nghỉ phép, check-ins, kế hoạch phát triển cá nhân.
- **lecturer**: phân công giảng dạy, đề cương học phần, hệ thống quản lý đào tạo/ LMS, lịch giảng & phòng học,
  quy định coi thi/chấm thi, dự giờ đồng nghiệp, nghiên cứu khoa học & đề tài.
- **specialist**: hệ thống quản lý văn bản (eOffice), quy trình trình ký, mẫu công văn, phần mềm nghiệp vụ của phòng,
  quy trình thanh toán/ công tác phí.
- **staff**: nội quy làm việc, ca/ giờ làm, trang thiết bị & bảo hộ, quy trình báo sự cố, liên hệ quản lý trực tiếp.
Target counts: ~14 common + ~6 per track → each user sees ~20 required/optional tasks (matches draft's "7/20").

## Engine API (`src/journey/engine.ts`) – pure functions, unit-tested
```ts
getCurrentDay(profile, now, demoOverride?): number
getTasksForTrack(allTasks, track): Task[]
getTaskStatus(task, progress, currentDay): TaskStatus
getProgress(tasks, progress, phaseId?): { done: number; total: number; pct: number }
getTodayTasks(tasks, progress, currentDay, limit = 3): Task[]
getHealth(tasks, progress, currentDay): 'onTrack' | 'behind' | 'needsHelp'
getUnlockedBadges(state): BadgeId[]
getPendingCheckin(state, currentDay): CheckinDay | null
```
Tests: `src/journey/__tests__/engine.test.ts` with jest-expo (≥15 cases incl. day boundaries −7, 0, 1, 30, 31).
