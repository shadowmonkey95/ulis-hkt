# ULIS START – Claude agent kit

A Claude Code agent team that builds **ULIS START**, the 30-day onboarding app for new ULIS staff,
as an Expo app you demo on a phone with **Expo Go** (and on a laptop browser as backup).

## Requirements
- Node.js 20+ and Claude Code installed
- Phone with **Expo Go** (App Store / Google Play), same Wi-Fi as the laptop

## Run
```bash
cd ulis-start-agents
claude
> /build-mvp
```
Optional extra instructions: `/build-mvp chỉ làm track Giảng viên trước`.

Then:
```bash
cd ulis-start
npx expo start          # scan QR with Expo Go (Android) / Camera (iOS)
npx expo start --tunnel # if venue Wi-Fi blocks device-to-laptop traffic
# press w for web backup on the projector
```

## Other commands
| Command | Use |
|---|---|
| `/add-journey-task "<mô tả>"` | add/change a journey task safely |
| `/review-ux <screen>` | UX critique + apply top fixes |
| `/demo-check` | pre-demo readiness report |

## What's in here
- `CLAUDE.md` – lead-agent rules, stack, build order
- `docs/` – product, journey (core), data model, design system specs, progress tracker
- `.claude/agents/` – content-architect, journey-engineer, ui-builder, ai-assistant-engineer, qa-demo
- `.claude/commands/` – pipeline and helper commands

## AI assistant
Works offline by default (searches the app's own content, always cites a source). For the live Claude
version, put `ANTHROPIC_API_KEY` in `ulis-start/server/.env`, run the server, and set
`EXPO_PUBLIC_ASSISTANT_URL` — see `ulis-start/server/README.md` after the build. The key never goes in the app.

All seeded content is marked **"Nội dung mẫu – cần ULIS xác nhận"**; replace it with verified content in
`ulis-start/content/*.json` before any real use.

Deploy
npx expo export -p web && npx eas-cli@latest deploy --prod