// Documents committed to the repo under default_docs/ are indexed automatically on boot, so a host
// without a persistent disk (e.g. Render free tier) never needs a manual re-upload after a redeploy.
//
// - A file is (re)indexed when it is new or its content changed (SHA-256); unchanged files are skipped.
// - A built-in document whose file was removed from the folder is removed from the index.
// - Optional default_docs/titles.json maps file names to display titles:
//     { "quy-che-chi-tieu-2026.pdf": "Quy chế chi tiêu ĐHNN 2026" }
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config } from '../config';
import { ACCEPTED_EXTENSIONS, UnsupportedFileError } from './extract';
import { ingestDocument, NoTextError } from './ingest';
import { listDocs, removeDoc } from './store';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
};

/** Files in the folder that are documentation about the folder, not knowledge for the assistant. */
const IGNORED = new Set(['readme.md', 'titles.json']);

export interface SyncResult {
  added: string[];
  updated: string[];
  unchanged: string[];
  removed: string[];
  failed: { file: string; reason: string }[];
}

function readTitles(dir: string): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(dir, 'titles.json'), 'utf8'));
    if (typeof raw !== 'object' || raw === null) return {};
    const out: Record<string, string> = {};
    for (const [file, title] of Object.entries(raw)) if (typeof title === 'string' && title.trim()) out[file] = title.trim();
    return out;
  } catch {
    return {};
  }
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const accepted: readonly string[] = ACCEPTED_EXTENSIONS;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && !IGNORED.has(e.name.toLowerCase()) && accepted.includes(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

function reasonOf(err: unknown): string {
  if (err instanceof NoTextError) return 'no text layer (scanned PDF?) – use a PDF with text, DOCX or TXT';
  if (err instanceof UnsupportedFileError || err instanceof Error) return err.message;
  return String(err);
}

export async function syncDefaultDocs(dir = config.defaultDocsDir): Promise<SyncResult> {
  const result: SyncResult = { added: [], updated: [], unchanged: [], removed: [], failed: [] };
  const files = listFiles(dir);
  const titles = readTitles(dir);

  // Files removed from the folder → drop them from the index.
  for (const doc of listDocs().filter((d) => d.builtin)) {
    if (!files.includes(doc.filename)) {
      removeDoc(doc.id);
      result.removed.push(doc.filename);
    }
  }

  // Sequential on purpose: low memory on small instances, and the embedding API stays within rate limits.
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(dir, file));
      const sha256 = createHash('sha256').update(data).digest('hex');
      const title = titles[file];
      const existing = listDocs().find((d) => d.builtin && d.filename === file);
      if (existing && existing.sha256 === sha256 && (!title || existing.title === title)) {
        result.unchanged.push(file);
        continue;
      }
      if (existing) removeDoc(existing.id);
      const mime = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
      await ingestDocument({ filename: file, data, mime, title, builtin: { sha256 } });
      (existing ? result.updated : result.added).push(file);
    } catch (err) {
      result.failed.push({ file, reason: reasonOf(err) });
    }
  }
  return result;
}
