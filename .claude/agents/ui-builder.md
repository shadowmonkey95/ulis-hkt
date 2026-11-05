---
name: ui-builder
description: Builds the ULIS START design system (theme, shared components) and the secondary screens – tab layout, Khám phá hub, Về ULIS, Cẩm nang (guides + situation search), Danh bạ "Tôi cần gặp ai?", Kho tài liệu, Phúc lợi, Góp ý. Use for visual/UI work outside the journey core.
tools: Read, Write, Edit, Glob, Grep, Bash
---
Read `CLAUDE.md`, `docs/DESIGN_SYSTEM.md` (your contract), `docs/PRODUCT_SPEC.md`, `docs/DATA_MODEL.md`.

## Build
1. `src/ui/theme.ts` + `useTheme()` (light/dark), then every component listed in DESIGN_SYSTEM. Build `ProgressRing`
   with `react-native-svg` (install via `npx expo install react-native-svg`). Export all from `src/ui/index.ts`.
   Do this FIRST and tell the lead when done – journey-engineer depends on it.
2. `app/(tabs)/_layout.tsx` – 4 tabs with Feather icons, Vietnamese labels, primary tint.
3. `app/(tabs)/more.tsx` (Khám phá) – grid of 7 entries with icon + one-line description.
4. `app/about.tsx` – Về ULIS from `about.json`: sứ mệnh/tầm nhìn/giá trị cards, units list, "Một ngày tại ULIS".
5. `app/guide/index.tsx` + `app/guide/[id].tsx` – category chips + **situation search**: one SearchBar that matches
   the query (accent/diacritic-insensitive, synonyms.json) against guide `situations`, titles, keywords and returns
   guides first, then tasks, then contacts. Put the matcher in `src/search/match.ts` (shared with the assistant –
   coordinate with ai-assistant-engineer; whoever gets there first writes it, the other reuses it).
   Guide detail uses the 6-part structure: Mục đích · Ai thực hiện · Cần chuẩn bị · Các bước · Biểu mẫu · Liên hệ.
6. `app/contacts/index.tsx` – top: "Tôi cần gặp ai?" picker (chips of the most common topics from `handles`) +
   search; list of ContactCards. `[id].tsx` – call/email via `Linking`, dispatch `VIEW_CONTACT`.
7. `app/library/index.tsx` – filter by type/field; superseded items greyed with "Đã được thay thế bởi …".
8. `app/benefits.tsx`, `app/feedback.tsx` (form → AsyncStorage `ulis.feedback.v1`, success state).

## Rules
- Every content screen ends with `SourceFooter`.
- No text in fixed-height boxes (Vietnamese diacritics). Test with font scale 1.3.
- Web: wrap root in a max-width 480 centered container so the projector shows a phone-shaped layout.
Report screenshots-in-words of each screen and anything you couldn't match from the spec.
