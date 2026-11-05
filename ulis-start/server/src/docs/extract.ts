// Text extraction for uploads: PDF (per page), DOCX, and plain-text formats.
import path from 'node:path';

export interface ExtractedPage {
  page?: number;
  text: string;
}

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv'] as const;

export class UnsupportedFileError extends Error {}

export async function extractText(filename: string, data: Buffer): Promise<ExtractedPage[]> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    // unpdf is ESM-only; a dynamic import keeps this CommonJS server working.
    const { extractText: pdfText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await pdfText(pdf, { mergePages: false });
    return text.map((t, i) => ({ page: i + 1, text: t }));
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: data });
    return [{ text: value }];
  }
  if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    return [{ text: data.toString('utf8').replace(/^﻿/, '') }];
  }
  throw new UnsupportedFileError(`Định dạng ${ext || '(không rõ)'} chưa được hỗ trợ. Hãy dùng PDF, DOCX, TXT, MD hoặc CSV.`);
}

const MAX_CHARS = 1200;
const OVERLAP_CHARS = 200;

/**
 * Split into ~1200-char chunks on paragraph/sentence boundaries with a small overlap, keeping the page
 * number so answers can cite "trang N". Scanned PDFs (no text layer) produce no chunks.
 */
export function chunkPages(pages: ExtractedPage[]): { page?: number; text: string }[] {
  const out: { page?: number; text: string }[] = [];
  for (const { page, text } of pages) {
    const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!clean) continue;
    const pieces = clean.split(/\n\n+|(?<=[.!?…])\s+(?=[A-ZÀ-Ỹ0-9])/u);
    let buf = '';
    const flush = () => {
      const t = buf.trim();
      if (t.length >= 40) out.push({ page, text: t });
      buf = t.length > OVERLAP_CHARS ? t.slice(-OVERLAP_CHARS).replace(/^\S*\s/, '') : '';
    };
    for (const piece of pieces) {
      if (buf && buf.length + piece.length + 1 > MAX_CHARS) flush();
      if (piece.length > MAX_CHARS) {
        for (let i = 0; i < piece.length; i += MAX_CHARS - OVERLAP_CHARS) {
          buf = piece.slice(i, i + MAX_CHARS);
          flush();
        }
        buf = '';
        continue;
      }
      buf = buf ? `${buf}\n${piece}` : piece;
    }
    if (buf.trim().length >= 40) out.push({ page, text: buf.trim() });
  }
  return out;
}
