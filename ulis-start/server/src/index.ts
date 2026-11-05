// ULIS START assistant server.
//   POST /ask      {question, taskId?, guideId?, track?} → {verdict, answer, steps?, sources, docSources}
//   GET  /health   status (no secrets)
//   GET  /admin    password-protected page to upload the documents the assistant answers from
// The Anthropic API key lives only here (env), never in the app.
import Anthropic from '@anthropic-ai/sdk';
import express, { type NextFunction, type Request, type Response } from 'express';

import type { Track } from '../../src/types';
import { adminRouter } from './admin';
import { answerQuestion, hasModel } from './answer';
import { config } from './config';
import { allChunks, listDocs, loadStore } from './docs/store';

loadStore();

const TRACKS: Track[] = ['lecturer', 'specialist', 'staff'];

const app = express();
app.set('trust proxy', 1); // behind the host's load balancer: req.ip = the real client
app.use(express.json({ limit: '16kb' }));

// CORS for /ask (the web app runs on another origin). /admin is same-origin only.
app.use('/ask', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  const allowed = config.allowedOrigins.length === 0 ? '*' : origin && config.allowedOrigins.includes(origin) ? origin : '';
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Per-IP rate limit: the endpoint is public and each answer costs API credits.
const recentByIp = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  recentByIp.set(ip, recent);
  return recent.length > 20;
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

app.get('/health', (_req, res) => {
  res.json({ ok: true, model: config.model, hasKey: hasModel(), documents: listDocs().length, chunks: allChunks().length, semantic: Boolean(config.voyageKey) });
});

app.post('/ask', async (req: Request, res: Response) => {
  const body: Record<string, unknown> = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    res.status(400).json({ error: 'bad_request', message: 'Thiếu câu hỏi.' });
    return;
  }
  if (question.length > 500) {
    res.status(400).json({ error: 'too_long', message: 'Câu hỏi quá dài (tối đa 500 ký tự).' });
    return;
  }
  if (rateLimited(req.ip ?? 'unknown')) {
    res.status(429).json({ error: 'rate_limited', message: 'Bạn hỏi hơi nhanh, vui lòng thử lại sau ít phút.' });
    return;
  }
  if (!hasModel()) {
    res.status(503).json({ error: 'no_api_key', message: 'Máy chủ chưa cấu hình ANTHROPIC_API_KEY – ứng dụng sẽ trả lời ở chế độ ngoại tuyến.' });
    return;
  }
  try {
    const result = await answerQuestion({
      question,
      taskId: str(body.taskId, 80),
      guideId: str(body.guideId, 80),
      track: TRACKS.find((t) => t === body.track),
    });
    console.log(`[ask] ${result.verdict} · docs ${result.docSources.length} · app ${result.sources.length}`);
    res.json(result);
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : '';
    console.error('[ask] failed', status, err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'upstream_error', message: 'Không gọi được mô hình – ứng dụng sẽ trả lời ngoại tuyến.' });
  }
});

app.use('/admin', adminRouter());

app.listen(config.port, '0.0.0.0', () => {
  console.log(`ULIS START assistant server on http://0.0.0.0:${config.port} (model ${config.model}, effort ${config.effort})`);
  console.log(`Documents: ${listDocs().length} (${allChunks().length} chunks) in ${config.dataDir}`);
  if (!hasModel()) console.warn('ANTHROPIC_API_KEY is not set – /ask answers 503 and the app falls back to local mode.');
  if (!config.adminToken) console.warn('ADMIN_TOKEN is not set – /admin uploads are disabled.');
  if (!config.voyageKey) console.log('VOYAGE_API_KEY not set – document search is keyword-only.');
});
