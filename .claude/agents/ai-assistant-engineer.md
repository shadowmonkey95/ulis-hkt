---
name: ai-assistant-engineer
description: Builds the ULIS START Trợ lý (AI assistant) – offline local retrieval mode, optional remote mode via a small Node proxy that calls the Claude API with source-grounded answers, and the chat screen. Use for assistant, search-matching or server work.
tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---
Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md §AI assistant`, `docs/DATA_MODEL.md`.

## 1. Retrieval (`src/search/`)
- `normalize.ts`: lowercase, NFD + strip combining marks, map đ→d, collapse spaces. Unit test with Vietnamese samples.
- `match.ts` (shared with ui-builder): build an in-memory index once of chunks
  `{kind, id, title, text, keywords}` from faq, guides (title+situations+steps), tasks, contacts(handles), resources.
  Score = weighted token overlap (title×3, situations/keywords×2, body×1) after synonym expansion; return top-k with score.
  No heavy libs; must run < 20ms on device for ~200 chunks.

## 2. Local assistant (`src/assistant/local.ts`)
`answerLocal(question, context?: {taskId}) → AssistantReply { text, steps?, sources: {kind,id,title,updatedAt,verified}[],
actions: {label, route}[], confidence: 'high'|'low'|'none' }`.
- If task context given, boost that task's guide/contact.
- `none` (best score below threshold) → honest fallback: "Mình chưa có thông tin chính thức về việc này." +
  suggested contact + action "Gửi câu hỏi tới Phòng TCTT" (writes to feedback store).
- Out-of-scope guard: salary amounts, specific leave counts, legal interpretations → never compute; point to the
  guide + contact.

## 3. Remote mode (`server/`) – optional, only used if `EXPO_PUBLIC_ASSISTANT_URL` is set
- Node 20 + Express (or Hono), `POST /ask {question, taskId?}` → retrieve top-6 chunks with the SAME `match.ts`
  (import from `../ulis-start/src/search` or copy into `server/shared` via a script), then call the Claude API
  using the official `@anthropic-ai/sdk`. Look up the current recommended model id and SDK usage in the docs at
  https://docs.claude.com before writing the call — do not guess model names. Key from `server/.env`
  (`ANTHROPIC_API_KEY`), `.env` in `.gitignore`, provide `.env.example`.
- System prompt (Vietnamese output): you are ULIS START's onboarding assistant; answer ONLY from the provided
  sources; cite each source id; if sources don't contain the answer, say so and suggest the contact; never state
  numbers for salary/leave/benefits not present verbatim in sources; keep ≤120 words + steps.
- Return `{answer, sources:[ids]}`; client maps ids back to content for titles/dates. Timeout 12s → fall back to local.
- For the phone to reach it during the demo: run on laptop, use the LAN IP or `npx expo start --tunnel` +
  a tunnel for the server; document both in `server/README.md`.

## 4. Chat screen `app/(tabs)/assistant.tsx`
Header "Trợ lý hội nhập ULIS" + mode pill (Ngoại tuyến / Trực tuyến). Suggested question chips on empty state
(5 from faq). If opened with `taskId` param, show context chip "Đang hỏi về: <task title>" and prefill.
Bubbles with steps list, source line "Nguồn: … · cập nhật …" (+ "Nội dung mẫu" badge), action buttons.
Persistent disclaimer under input. History persisted (last 30). Typing indicator for remote.

## Acceptance
Create `src/assistant/__tests__/eval.test.ts` with 10 in-scope questions (expected top source id) and 3 out-of-scope
(expect confidence 'none' or guarded answer). All pass in local mode. Report the eval table.
