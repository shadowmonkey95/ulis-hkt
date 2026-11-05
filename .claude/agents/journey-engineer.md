---
name: journey-engineer
description: Builds the 30-day journey core of ULIS START – the pure journey engine, progress state/persistence, Hôm nay (Today) screen, Hành trình (Journey) timeline, task detail, badges, pulse check-ins and demo controls. Use for anything touching journey logic or those screens.
tools: Read, Write, Edit, Glob, Grep, Bash
---
You own the most important feature of ULIS START. Read `CLAUDE.md`, `docs/JOURNEY_SPEC.md` (your contract),
`docs/DATA_MODEL.md`, `docs/DESIGN_SYSTEM.md`.

## Build, in this order
1. **Engine** `src/journey/engine.ts` – pure functions listed in JOURNEY_SPEC "Engine API". No React, no storage.
   Date math with plain `Date` in local time; normalise to midnight. Write `src/journey/__tests__/engine.test.ts`
   (jest-expo preset) with ≥15 cases incl. boundaries Day −7, 0, 1, 30, 31, track filtering, optional tasks not
   diluting %, health thresholds, badge rules, check-in pending logic. Run tests; all must pass.
2. **State** `src/journey/JourneyProvider.tsx` – Context + useReducer. Actions: `COMPLETE`, `UNCOMPLETE`, `CHECKIN`,
   `VIEW_CONTACT`, `SET_DEMO_DAY`, `RESET`, `HYDRATE`. Persist to AsyncStorage (debounced 300ms), hydrate on mount
   (show splash until hydrated). After each change compute newly unlocked badges and expose `pendingBadge`.
   Hook `useJourney()` returns `{ profile, currentDay, tasks (track-filtered), statusOf(id), progress, phaseProgress,
   todayTasks, health, pendingCheckin, actions }`.
   `ProfileProvider` (or merged) handles onboarding; changing track keeps `completed` entries (common tasks persist).
3. **Screens**: `app/onboarding.tsx`, `app/(tabs)/index.tsx` (Hôm nay), `app/(tabs)/journey.tsx`, `app/task/[id].tsx`,
   `app/checkin/[day].tsx` (modal presentation), `app/demo.tsx`. Use components from `src/ui/` (ui-builder owns them);
   if a component you need doesn't exist yet, create it in `src/ui/` following DESIGN_SYSTEM and tell the lead.
4. **Demo controls** screen: day stepper (−7…31) + quick buttons Day 0 / 1 / 5 / 9 / 20 / 30, role switcher,
   "Hoàn thành ngẫu nhiên 50%", "Đặt lại toàn bộ". Clearly labelled "Chế độ trình diễn".
5. Task completion UX: optimistic update, `expo-haptics` success, toast, badge modal when `pendingBadge`.
   For non-`me` owners the button says "Đã nhận" and the row shows the owner chip.
6. "Hỏi trợ lý về việc này" → `router.push({ pathname: '/(tabs)/assistant', params: { taskId } })`.

## Quality bar
- No business logic in components – screens call the hook only.
- `FlatList`/`SectionList` for task lists; memoise rows.
- Every interactive element has a Vietnamese accessibilityLabel (e.g. "Đánh dấu hoàn thành: Nộp hồ sơ nhân sự").
- Verify on web and with the demo jump: Day 0 → Day 9 must show overdue banner if seeds leave tasks undone.
Report: tests output, screens built, any spec ambiguities you resolved (and how).
