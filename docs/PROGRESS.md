# Progress

## Phases
- [x] 0 Scaffold (Expo SDK 58, RN 0.88, expo-router root `app/`, jest-expo; tsc + expo-doctor 20/20 pass)
- [x] 1 Content + types (38 tasks, 13 guides, 8 contacts, 23 resources, 30 FAQ, 7 benefits, 45 synonyms; validation test passes)
- [x] 2a UI system + secondary screens (src/ui 24 components + ResourceRow, src/search/match.ts + tests, tabs, Khám phá, Về ULIS, Cẩm nang + situation search, Danh bạ, Tài liệu, Phúc lợi, Góp ý; tsc + jest + web export pass)
- [x] 2b Journey core (engine + 50 jest tests, JourneyProvider w/ AsyncStorage, onboarding, Hôm nay, Hành trình, task detail, check-in modal, demo controls; tsc passes)
- [x] 3 AI assistant (local mode: shared matcher + context boost + out-of-scope guard + honest fallback; chat tab w/ history, sources, actions, "Gửi câu hỏi tới Phòng TCTT"; optional remote mode via `server/` (Express + @anthropic-ai/sdk, model via ANTHROPIC_MODEL, 12s → local fallback); eval 13/13; tsc + jest 127 + server tsc + web export + expo-doctor pass)
- [ ] 4 QA + demo polish — QA round 2 (2026-11-03, commit 31e39fd): tsc, jest 7/132, server tsc, expo lint 0 warnings, expo-doctor 20/20, web export all PASS; all 17 round-1 fixes verified in headless Chrome (37/37 functional checks); demo steps 1–7 PASS on the web export. Remaining before ticking: one full run on a physical iPhone + Android in Expo Go.

## Acceptance criteria
- [ ] Cold start to Hôm nay < 3s on a mid phone in Expo Go — UNVERIFIED on device. Web export: time-to-Today 0.99–1.11 s (round 2, headless Chrome, localhost). Needs a timed run in Expo Go.
- [x] Progress survives app restart — web: "2/18 việc bắt buộc" kept after full reload (round 1 + 2); chat history also survives reload. Save is now flushed on AppState background (native); confirm once on device.
- [x] Changing role or start date recomputes the journey without losing completed common tasks — role: Chuyên viên switch removes lecturer tasks, 2/18 kept. Start date: Cài đặt demo → "Ngày đầu đi làm" preset "9 ngày trước" → Hôm nay shows "hôm nay là ngày 10/30", 2/18 kept; changing start clears the demo-day override (round 2, headless Chrome) + reducer test.
- [x] Every task/guide/contact screen shows source + updatedAt + "Nội dung mẫu" badge when unverified — SourceFooter in app/task/[id].tsx, app/guide/[id].tsx, app/contacts/[id].tsx (+ list screens via aggregateMeta); all 119 content items have source/updatedAt/verified:false; web-verified on task detail.
- [x] Assistant answers 10 FAQ test questions correctly in local mode, refuses 3 out-of-scope ones (`src/assistant/__tests__/eval.test.ts`)
- [x] Works on web (`expo start --web`) for projector backup — `npx expo export --platform web` OK; demo steps 1–7 run end-to-end in headless Chrome against the export, no runtime errors (only the RN-web useNativeDriver warning).
- [ ] Usable with large system font and screen-reader labels on interactive elements — labels: PASS (static scan: 0 unlabeled Pressable/Card with onPress). Type: `small` now 13/18; only tab-bar labels stay 12 px (accepted, fixed tab-bar height); step badges use minWidth/minHeight + maxFontSizeMultiplier. Large font scale still UNVERIFIED on a device (iOS Larger Text / Android font size 1.3).

## Content needing ULIS confirmation
(content-architect appends items here)

All seed content is `verified: false`, `source: "Nội dung mẫu cho Hackathon"`, `updatedAt: 2026-11-03` (about.json: public-website facts + sample text). Items ULIS must confirm or fill in:

**Organisation & contacts**
- [ ] Official unit names: Phòng Tổ chức và Thanh tra, Phòng Hành chính – Tổng hợp, Phòng Kế hoạch – Tài chính, Phòng Đào tạo, Trung tâm/ bộ phận CNTT, Công đoàn Trường (contacts.json, about.json units)
- [ ] Real phone/email/room/office hours for every contact (all placeholders: `024 0000 0000`, `example-*@ulis.vnu.edu.vn`, "cần xác nhận số phòng")
- [ ] Split of salary responsibilities TCTT vs. KH-TC (g-salary)
- [ ] Who is the security/PCCC focal point and the emergency number (g-safety)
- [ ] Whether a formal Buddy programme exists and how buddies are assigned

**Rules/ figures deliberately left blank ("theo quy định hiện hành của Trường – cần xác nhận")**
- [ ] Number of copies/items in hồ sơ nhân sự; official danh mục hồ sơ and mẫu sơ yếu lý lịch
- [ ] Leave entitlement (days), lead time for leave requests, approver; lecturer leave tied to academic calendar
- [ ] Công tác phí: required documents, submission deadline, rates (Quy chế chi tiêu nội bộ)
- [ ] Salary payment date for the first month
- [ ] Deadline for submitting grades; coi thi/ chấm thi rules
- [ ] Thi đua – khen thưởng: registration timing, eligibility of new staff
- [ ] Insurance details (BHXH/BHYT registration, KCB ban đầu), health-check frequency, Công đoàn welfare, training support policy, library/parking for staff (benefits.json)

**Documents (resources.json – all URLs are `https://ulis.vnu.edu.vn` or `#`)**
- [ ] Document numbers (số hiệu) and links for: Quy tắc ứng xử, Quy định nghỉ phép (+ which older version it replaces), Quy chế chi tiêu nội bộ, Quy định coi thi/ chấm thi, Nội quy làm việc, Quy chế thi đua – khen thưởng
- [ ] Actual forms: đơn xin nghỉ phép, đề nghị thanh toán công tác phí, đề nghị tạm ứng, bộ mẫu văn bản hành chính, phiếu yêu cầu hỗ trợ CNTT, báo cáo sự cố, đăng ký thi đua, kế hoạch phát triển cá nhân
- [ ] Manuals for email công vụ, LMS/ hệ thống quản lý đào tạo, eOffice (system names in use at ULIS?)
- [ ] Welcome video and PCCC / teaching-method training materials

**About ULIS (about.json)**
- [ ] Founding year 1955, VNU membership and address (Phạm Văn Đồng, Cầu Giấy) – from public website, to be checked
- [ ] Official sứ mạng, tầm nhìn, giá trị cốt lõi (current text is sample), detailed history milestones
- [ ] "Một ngày tại ULIS" (`about.dayAtUlis`, 7 sample entries): typical arrival time, parking for staff, lunch break, usual meeting slots, library access – all generic/approximate ("khoảng"), no official hours stated

**BHXH sickness benefit (g-sick-leave, r-manual-bhxh-sick, faq-31/32)**
- [ ] Confirm the BHXH Việt Nam infographic (assets/guides/bhxh-tro-cap-om-dau.jpg) is still current – the base-salary figure (mức lương cơ sở / mức tham chiếu) and rates change over time; also confirm ULIS may republish it
- [ ] ULIS internal process for sickness-benefit papers: who receives them in Phòng TCTT, internal deadline (stricter than BHXH deadline?), required papers for nghỉ chăm con ốm, how DS-PHSK leave is decided with Công đoàn

**Journey**
- [ ] Due days per task (e.g. email by day 4, hồ sơ by day 2, PDP by day 28) and owner per task match ULIS practice
