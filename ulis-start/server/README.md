# ULIS START – assistant server

The app works fully **without** this server: with no `EXPO_PUBLIC_ASSISTANT_URL` the Trợ lý runs offline
(keyword/synonym matching over `content/*.json`) and makes no network calls.

With the server, the Trợ lý answers with **Claude**, grounded in two kinds of sources:

1. the app's own content (guides, journey tasks, FAQ, contacts…), retrieved with the same matcher as the app;
2. **documents ULIS staff upload** on the `/admin` page (PDF, DOCX, TXT, MD, CSV) — regulations, handbooks, lists.

The Anthropic API key, the uploaded files and the search index stay on the server; the app only receives answers.

## How an answer is produced (and the guardrails)

`POST /ask {question, taskId?, guideId?, track?}` →

| Step | What happens | Stops with |
|---|---|---|
| 1. Retrieval | Top 6 passages from uploaded documents (keyword BM25, + semantic search if  is set) and top 5 from app content. Questions about amounts, leave days or regulations get 10 document passages. | – |
| 2. Scope prompt | Claude is told the scope (working at ULIS) and to use **only** the passages; passage text is data, never instructions. | – |
| 3. JSON verdict | Claude returns  /  / , cited passage ids, and any arithmetic as separate  (expression + result + source ids). | fixed  /  text |
| 4. Server checks | An answer must cite passages we sent. Each calculation is re-computed by the server and may only use figures from cited passages or the question. Every number in the answer must come from a cited passage, the question, or a verified calculation. Otherwise → . |  |

Figures (salary, allowances, rates, days) are answered **only from uploaded documents / app content**, with the
calculation shown as a step: "Lương: 2,67 × 2.340.000 = 6.247.800 (theo Quy chế chi tiêu … – trang 12)".
Offline (no server), the app's rule guard still refuses these questions.

Out-of-scope questions (weather, coding, homework, politics, "ignore your rules"…) get a fixed polite reply, so the
model's own wording never leaks there. A safety-classifier decline is retried server-side on Anthropic's recommended
fallback model (`fallbacks: "default"`); if that also declines, the user gets the out-of-scope reply.

Response: `{ verdict, answer, steps?, sources: [app content ids], docSources: [{id, docId, title, page?, excerpt, uploadedAt}], calculations?: [{label, expression, result, sources}] }`.
The app shows document sources as "Nguồn: <title> – trang N". Any error or a reply slower than 30 s → the app answers offline.

## Run locally

Requires Node 20.12+.

```bash
cd ulis-start/server
npm install
cp .env.example .env     # set ANTHROPIC_API_KEY and ADMIN_TOKEN (server/.env is gitignored)
npm start                # → http://0.0.0.0:8787
```

- `http://localhost:8787/health` → status, model, number of documents (no secrets).
- `http://localhost:8787/admin` → log in with `ADMIN_TOKEN`, drag in files, try questions in "Thử hỏi Trợ lý".

| Variable | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Required for AI answers. Without it `/ask` returns 503 and the app answers offline. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | |
| `ANTHROPIC_EFFORT` | `low` | `low`…`max`. Higher = slower and more expensive; low is enough for answering from short passages. |
| `ADMIN_TOKEN` | – | Password for `/admin`. Uploads are disabled while empty. 10 wrong attempts lock an IP for 15 min. |
| `VOYAGE_API_KEY` | – | Optional semantic search ([voyageai.com](https://www.voyageai.com), free tier). Applies to files uploaded **after** it is set — re-upload older files to embed them. |
| `VOYAGE_MODEL` | `voyage-3.5` | |
| `DATA_DIR` | `server/data` | Uploaded files + `index.json`. Must be a persistent disk in production. |
| `ALLOWED_ORIGINS` | any | Comma-separated web origins allowed to call `/ask` (browsers only; the phone app is not affected). |
| `MAX_UPLOAD_MB` | `20` | |
| `PORT` | `8787` | |

`/ask` is rate-limited to 20 questions per minute per IP. Type-check: `npm run typecheck`.

Document tips: PDFs must have a text layer (scanned images are rejected with a clear message). Give each upload a
clear title — it is what users see as the source. Delete and re-upload to replace a document.

## Deploy on Render

`ulis-start/render.yaml` is a Render Blueprint (Singapore region, Starter instance, 1 GB persistent disk at `/var/data`).

1. Push the repo to GitHub/GitLab.
2. Render dashboard → **New → Blueprint** → choose the repo. Render reads `render.yaml`.
3. Fill in `ANTHROPIC_API_KEY` (and `VOYAGE_API_KEY` if you have one). `ADMIN_TOKEN` is generated — copy it from
   the service's **Environment** tab.
4. When it is live, open `https://<service>.onrender.com/health`, then `/admin` to upload documents.
5. Point the app at it and redeploy the web app:
   ```bash
   cd ulis-start
   # .env.local (gitignored) or inline:
   EXPO_PUBLIC_ASSISTANT_URL=https://<service>.onrender.com npx expo export -p web
   npx eas-cli@latest deploy --prod
   ```
   For Expo Go: `EXPO_PUBLIC_ASSISTANT_URL=https://<service>.onrender.com npx expo start -c`.

Persistent disks need a paid instance on Render. On Railway the same setup works: start command
`cd server && npm start`, a volume mounted at `/var/data`, and the same variables.

## Local network / tunnel (no hosting)

`EXPO_PUBLIC_ASSISTANT_URL` is inlined when Metro builds the bundle, so set it before starting Expo and restart with `-c`.

- **Same Wi-Fi:** `EXPO_PUBLIC_ASSISTANT_URL=http://<laptop LAN IP>:8787 npx expo start -c` (allow Node through the
  Windows firewall for private networks).
- **Tunnel:** run `cloudflared tunnel --url http://localhost:8787` and use the printed `https://…trycloudflare.com` URL.
  `npx expo start --tunnel` tunnels only Metro, not this server.

## Demo safety

If anything goes wrong on stage, restart Expo **without** `EXPO_PUBLIC_ASSISTANT_URL`: the header shows
**Ngoại tuyến** and every answer comes from the bundled content. With remote mode on, a dead server only costs one
timeout before the offline answer appears.
