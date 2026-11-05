// One indexing pipeline for every document source (admin upload, default_docs/ on boot):
// extract text → chunk → embed (if Voyage is configured) → store.
import path from 'node:path';

import { chunkPages, extractText } from './extract';
import { embed } from './search';
import { addDoc, newDocId, type DocChunk, type DocMeta } from './store';

export class NoTextError extends Error {}

export interface IngestInput {
  filename: string;
  data: Buffer;
  mime: string;
  /** Display title; defaults to the file name without extension. */
  title?: string;
  /** Set for documents synced from default_docs/. */
  builtin?: { sha256: string };
}

export async function ingestDocument(input: IngestInput): Promise<DocMeta> {
  const pages = await extractText(input.filename, input.data);
  const pieces = chunkPages(pages);
  if (pieces.length === 0) throw new NoTextError('no text layer');
  const id = newDocId();
  const vectors = await embed(pieces.map((p) => p.text), 'document');
  const chunks: DocChunk[] = pieces.map((p, i) => ({ id: `${id}-${i + 1}`, docId: id, ord: i, page: p.page, text: p.text, vec: vectors?.[i] }));
  const meta: DocMeta = {
    id,
    title: input.title?.trim() || path.basename(input.filename, path.extname(input.filename)),
    filename: input.filename,
    mime: input.mime,
    size: input.data.length,
    uploadedAt: new Date().toISOString(),
    pages: pages.some((p) => p.page) ? pages.length : undefined,
    chunkCount: chunks.length,
    embedded: Boolean(vectors),
    ...(input.builtin ? { builtin: true, sha256: input.builtin.sha256 } : {}),
  };
  addDoc(meta, chunks, input.data);
  return meta;
}
