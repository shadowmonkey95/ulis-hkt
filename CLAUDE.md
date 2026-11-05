# ULIS START – New Employee Journey (Hackathon build)

You are the **lead agent** for building ULIS START: a mobile-first onboarding app for new staff
(giảng viên, chuyên viên, người lao động) at ULIS – Trường Đại học Ngoại ngữ, ĐHQGHN.
The demo runs on a phone through **Expo Go** (scan QR) and in a browser (`expo start --web`).

Read these before writing any code:
- `docs/PRODUCT_SPEC.md` – what we build, scope, demo script
- `docs/JOURNEY_SPEC.md` – the 30-day journey (the core feature – most effort goes here)
- `docs/DATA_MODEL.md` – types, JSON content format, storage keys
- `docs/DESIGN_SYSTEM.md` – colors, type, components, screen layouts

## Non-negotiable rules
1. **Language**: all UI text is Vietnamese (with diacritics). Code, identifiers, comments in English.
2. **Expo Go compatible**: only use libraries bundled with Expo Go or pure-JS libraries.
   No custom native modules, no `expo prebuild`, no dev client. Always install with `npx expo install <pkg>`
   (never plain `npm install` for RN libs) so versions match the SDK.
3. **Offline-first demo**: the app must work with no network and no API key. All content lives in
   `content/*.json`. Progress persists with `@react-native-async-storage/async-storage`.
4. **No secrets in the app**: never put an Anthropic API key in the client bundle. The AI assistant
   has two modes: `local` (default, keyword/semantic match over content JSON) and `remote`
   (calls a small proxy server in `server/` that holds the key). See `docs/PRODUCT_SPEC.md §AI`.
5. **Content is data, not code**: screens render from JSON. Never hard-code a procedure, contact or
   task inside a component. Every content item has `source` and `updatedAt`, and demo data has
   `verified: false` so the UI can show "Nội dung mẫu – cần ULIS xác nhận".
6. **Personal data**: no real names/phones of ULIS staff in seed data. Use clearly fake placeholders.
7. **TypeScript strict**. No `any` in components. Run `npx tsc --noEmit` before declaring work done.

## Tech stack (fixed)
- Expo SDK: latest stable (`npx create-expo-app@latest --template default`), TypeScript
- Navigation: `expo-router` (file-based, bottom tabs)
- State: React Context + `useReducer` for journey progress (no Redux)
- Storage: `@react-native-async-storage/async-storage`
- Icons: `@expo/vector-icons` (Feather set)
- Notifications (optional, Phase 3): `expo-notifications` local only — note Expo Go limits remote push
- Haptics on task completion: `expo-haptics`

## Team of sub-agents (`.claude/agents/`)
Delegate by area; you integrate and resolve conflicts.
| Agent | Owns |
|---|---|
| `content-architect` | `content/*.json`, types in `src/types/` — writes Vietnamese content |
| `journey-engineer` | journey engine: `src/journey/*`, progress state, day logic, Today screen, Journey screens |
| `ui-builder` | design system `src/ui/*`, Home, Guides, Contacts, Library screens |
| `ai-assistant-engineer` | `src/assistant/*`, Assistant screen, `server/` proxy |
| `qa-demo` | type-check, lint, flows test, demo script rehearsal, bug list |

## Build order
Run `/build-mvp` for the whole pipeline, or the phases one by one:
1. **Phase 0 – scaffold**: create Expo app in `app/` folder `ulis-start/`, install deps, folders, theme.
2. **Phase 1 – content + types** (content-architect) → must finish before Phase 2.
3. **Phase 2 – journey core** (journey-engineer) ‖ **UI shell + secondary screens** (ui-builder), in parallel.
4. **Phase 3 – AI assistant** (ai-assistant-engineer).
5. **Phase 4 – QA + demo polish** (qa-demo) → fix list → you fix or re-delegate.

## Definition of done (per phase)
- `npx tsc --noEmit` passes, `npx expo-doctor` has no errors
- App launches in Expo Go and web without red screens
- The phase's acceptance criteria in the spec docs are checked off in `docs/PROGRESS.md`
