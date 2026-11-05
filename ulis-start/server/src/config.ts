// Server configuration from the environment (server/.env locally, the host's dashboard in production).
import path from 'node:path';

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // No server/.env – rely on the process environment.
}

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
const env = (k: string) => process.env[k]?.trim() || undefined;

export const config = {
  port: Number(env('PORT')) || 8787,
  anthropicKey: env('ANTHROPIC_API_KEY'),
  model: env('ANTHROPIC_MODEL') ?? 'claude-opus-5-5',
  /** Grounded Q&A over short sources does well at low effort and stays fast. */
  effort: EFFORTS.find((e) => e === env('ANTHROPIC_EFFORT')) ?? ('low' as Effort),
  /** Password for the /admin upload page. Uploading is disabled until it is set. */
  adminToken: env('ADMIN_TOKEN'),
  /** Optional semantic search (Voyage AI, Anthropic's recommended embeddings provider). */
  voyageKey: env('VOYAGE_API_KEY'),
  voyageModel: env('VOYAGE_MODEL') ?? 'voyage-3.5',
  /** Documents committed to the repo; indexed automatically on boot (see docs/defaults.ts). */
  defaultDocsDir: path.resolve(env('DEFAULT_DOCS_DIR') ?? path.join(__dirname, '..', 'default_docs')),
  /** Where uploaded files and the search index live (a persistent disk in production). */
  dataDir: path.resolve(env('DATA_DIR') ?? path.join(__dirname, '..', 'data')),
  /** Comma-separated origins allowed to call /ask; empty = any (the app has no secrets to protect). */
  allowedOrigins: (env('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  maxUploadMb: Number(env('MAX_UPLOAD_MB')) || 20,
};
