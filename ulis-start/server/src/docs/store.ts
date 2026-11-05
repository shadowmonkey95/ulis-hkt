// Persistent document index: one JSON file + the original uploads, under DATA_DIR.
// Small and dependency-free on purpose — a ULIS handbook set is hundreds of chunks, not millions.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config } from '../config';

export interface DocMeta {
  id: string;
  title: string;
  filename: string;
  mime: string;
  size: number;
  uploadedAt: string;
  pages?: number;
  chunkCount: number;
  /** True when every chunk has an embedding (semantic search available for this doc). */
  embedded: boolean;
}

export interface DocChunk {
  /** Citation id shown to the model, e.g. "d7f3a-12". */
  id: string;
  docId: string;
  ord: number;
  page?: number;
  text: string;
  vec?: number[];
}

interface IndexFile {
  version: 1;
  docs: DocMeta[];
  chunks: DocChunk[];
}

const INDEX_PATH = () => path.join(config.dataDir, 'index.json');
const FILES_DIR = () => path.join(config.dataDir, 'files');

let state: IndexFile = { version: 1, docs: [], chunks: [] };

export function loadStore(): void {
  fs.mkdirSync(FILES_DIR(), { recursive: true });
  try {
    const raw = JSON.parse(fs.readFileSync(INDEX_PATH(), 'utf8')) as IndexFile;
    if (raw.version === 1 && Array.isArray(raw.docs) && Array.isArray(raw.chunks)) state = raw;
  } catch {
    // First run: empty index.
  }
}

/** Write to a temp file then rename, so a crash never leaves a half-written index. */
function persist(): void {
  const tmp = `${INDEX_PATH()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, INDEX_PATH());
}

export const listDocs = (): DocMeta[] => [...state.docs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
export const allChunks = (): readonly DocChunk[] => state.chunks;
export const getDoc = (id: string): DocMeta | undefined => state.docs.find((d) => d.id === id);
export const newDocId = (): string => `d${randomBytes(3).toString('hex')}`;

export function addDoc(meta: DocMeta, chunks: DocChunk[], original: Buffer): void {
  fs.writeFileSync(path.join(FILES_DIR(), `${meta.id}${path.extname(meta.filename).toLowerCase()}`), original);
  state = { ...state, docs: [...state.docs, meta], chunks: [...state.chunks, ...chunks] };
  persist();
}

export function removeDoc(id: string): boolean {
  const doc = getDoc(id);
  if (!doc) return false;
  state = { ...state, docs: state.docs.filter((d) => d.id !== id), chunks: state.chunks.filter((c) => c.docId !== id) };
  persist();
  fs.rmSync(path.join(FILES_DIR(), `${id}${path.extname(doc.filename).toLowerCase()}`), { force: true });
  return true;
}
