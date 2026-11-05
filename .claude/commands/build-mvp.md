---
description: Build the full ULIS START MVP end to end with the sub-agent team
---
Build ULIS START following CLAUDE.md. Run the phases in order and keep `docs/PROGRESS.md` updated
(create it from the acceptance criteria in docs/PRODUCT_SPEC.md if missing). Extra instructions from the user: $ARGUMENTS

**Phase 0 – scaffold (you do this yourself):**
1. `npx create-expo-app@latest ulis-start --template default` (TypeScript + expo-router). Remove the template's
   example screens/components.
2. `cd ulis-start && npx expo install @react-native-async-storage/async-storage expo-haptics react-native-svg`
   and dev deps `npx expo install jest-expo jest @types/jest -- --save-dev`; add `"test": "jest"` and the jest-expo preset.
3. Create folders `content/ src/{types,content,journey,ui,search,assistant} server/`. Set app name "ULIS START",
   slug `ulis-start`, primary color in `app.json`.
4. `npx tsc --noEmit` passes. Commit if git is available.

**Phase 1:** delegate to `content-architect`. Wait for it. Check its table.

**Phase 2 (parallel):** delegate to `ui-builder` (tell it to finish `src/ui` components first) and to
`journey-engineer`. When ui-builder reports components done, notify journey-engineer.

**Phase 3:** delegate to `ai-assistant-engineer`. Remote mode is optional – build it, but the app must not depend on it.

**Phase 4:** delegate to `qa-demo`. Fix every blocker and major yourself or re-delegate to the owning agent,
then run `qa-demo` again until no blockers.

Finish with: how to run (`cd ulis-start && npx expo start`, scan QR with Expo Go; web: press `w`),
the demo script, and the open "cần ULIS xác nhận" content list.
