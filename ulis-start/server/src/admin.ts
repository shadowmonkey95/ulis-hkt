// /admin: password-protected page + JSON API to upload, list and delete knowledge documents.
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';

import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import multer from 'multer';

import { config } from './config';
import { ACCEPTED_EXTENSIONS, UnsupportedFileError, chunkPages, extractText } from './docs/extract';
import { embed } from './docs/search';
import { addDoc, listDocs, newDocId, removeDoc, type DocChunk } from './docs/store';

function tokenOk(header: string | undefined): boolean {
  if (!config.adminToken || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(config.adminToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Slow down password guessing: at most 10 failed attempts per IP per 15 minutes.
const failures = new Map<string, number[]>();
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!config.adminToken) {
    res.status(503).json({ error: 'admin_disabled', message: 'Máy chủ chưa đặt ADMIN_TOKEN nên chưa thể tải tài liệu.' });
    return;
  }
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const recent = (failures.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  if (recent.length >= 10) {
    res.status(429).json({ error: 'locked', message: 'Sai mật khẩu quá nhiều lần, thử lại sau 15 phút.' });
    return;
  }
  if (!tokenOk(req.get('authorization'))) {
    failures.set(ip, [...recent, now]);
    res.status(401).json({ error: 'unauthorized', message: 'Sai mật khẩu quản trị.' });
    return;
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
});

export function adminRouter(): Router {
  const r = express.Router();

  r.get('/', (_req, res) => {
    res.type('html').send(ADMIN_PAGE);
  });

  r.get('/api/docs', requireAdmin, (_req, res) => {
    res.json({ docs: listDocs(), semantic: Boolean(config.voyageKey), accepted: ACCEPTED_EXTENSIONS, maxUploadMb: config.maxUploadMb });
  });

  r.post('/api/docs', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'no_file', message: 'Chưa chọn tệp.' });
      return;
    }
    // multer decodes the multipart filename as latin1; restore UTF-8 Vietnamese names.
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const titleField = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 160) : '';
    try {
      const pages = await extractText(filename, file.buffer);
      const pieces = chunkPages(pages);
      if (pieces.length === 0) {
        res.status(422).json({
          error: 'no_text',
          message: 'Không đọc được chữ trong tệp (có thể là PDF dạng ảnh scan). Hãy dùng bản có lớp chữ hoặc chuyển sang DOCX/TXT.',
        });
        return;
      }
      const id = newDocId();
      const vectors = await embed(pieces.map((p) => p.text), 'document');
      const chunks: DocChunk[] = pieces.map((p, i) => ({ id: `${id}-${i + 1}`, docId: id, ord: i, page: p.page, text: p.text, vec: vectors?.[i] }));
      const meta = {
        id,
        title: titleField || path.basename(filename, path.extname(filename)),
        filename,
        mime: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        pages: pages.some((p) => p.page) ? pages.length : undefined,
        chunkCount: chunks.length,
        embedded: Boolean(vectors),
      };
      addDoc(meta, chunks, file.buffer);
      res.status(201).json({ doc: meta });
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        res.status(415).json({ error: 'unsupported', message: err.message });
        return;
      }
      console.error('[admin] upload failed', err);
      res.status(500).json({ error: 'extract_failed', message: 'Không xử lý được tệp này.' });
    }
  });

  r.delete('/api/docs/:id', requireAdmin, (req, res) => {
    if (!removeDoc(String(req.params.id))) {
      res.status(404).json({ error: 'not_found', message: 'Không tìm thấy tài liệu.' });
      return;
    }
    res.status(204).end();
  });

  // Upload errors from multer (e.g. file too large) as JSON.
  r.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      res.status(413).json({ error: err.code, message: `Tệp quá lớn (tối đa ${config.maxUploadMb} MB).` });
      return;
    }
    next(err);
  });

  return r;
}

const ADMIN_PAGE = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ULIS START – Tài liệu cho Trợ lý</title>
<style>
:root{--p:#B94E79;--ink:#24314E;--muted:#6B7280;--bg:#FAF9FC;--card:#fff;--line:#E9E5EB;--soft:#FCECF2;--ok:#2E7D5B;--err:#B42318}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}h1{font-size:24px;margin:0 0 4px}p.sub{color:var(--muted);margin:0 0 24px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;margin-bottom:16px}
label{font-weight:600;display:block;margin-bottom:6px}input[type=text],input[type=password]{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:11px;font:inherit}
button{background:var(--p);color:#fff;border:0;border-radius:11px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer}button.ghost{background:transparent;color:var(--p);border:1px solid var(--line)}
button:disabled{opacity:.5;cursor:default}.row{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.row>div{flex:1;min-width:200px}
.drop{border:2px dashed var(--line);border-radius:16px;padding:28px;text-align:center;color:var(--muted);cursor:pointer}.drop.on{border-color:var(--p);background:var(--soft)}
table{width:100%;border-collapse:collapse}td,th{padding:10px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-size:13px;color:var(--muted);font-weight:600}
.msg{margin-top:10px;font-weight:600}.msg.ok{color:var(--ok)}.msg.err{color:var(--err)}.pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:var(--soft);color:var(--p)}
.ans{white-space:pre-wrap;background:var(--bg);border-radius:12px;padding:12px;margin-top:10px}[hidden]{display:none!important}.wrap{overflow-x:auto}
</style></head><body><main>
<h1>Tài liệu cho Trợ lý ULIS START</h1>
<p class="sub">Tải lên quy định, hướng dẫn, sổ tay… Trợ lý chỉ trả lời dựa trên các tài liệu này và nội dung có sẵn trong ứng dụng.</p>

<section class="card" id="login">
  <div class="row"><div><label for="tok">Mật khẩu quản trị</label><input id="tok" type="password" autocomplete="current-password"></div>
  <button id="loginBtn">Đăng nhập</button></div><div class="msg" id="loginMsg"></div>
</section>

<div id="app" hidden>
<section class="card">
  <div class="row"><div><label for="title">Tiêu đề hiển thị (không bắt buộc)</label><input id="title" type="text" placeholder="Ví dụ: Quy chế chi tiêu nội bộ 2026"></div></div>
  <div class="drop" id="drop" style="margin-top:12px">Kéo thả tệp vào đây hoặc <u>chọn tệp</u><br><small id="hint"></small></div>
  <input id="file" type="file" hidden>
  <div class="msg" id="upMsg"></div>
</section>

<section class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:18px">Đã tải lên</h2><span id="mode" class="pill"></span></div>
  <div class="wrap"><table><thead><tr><th>Tài liệu</th><th>Đoạn</th><th>Ngày tải</th><th></th></tr></thead><tbody id="list"></tbody></table></div>
  <p id="empty" class="sub" style="margin:12px 0 0">Chưa có tài liệu nào.</p>
</section>

<section class="card"><label for="q">Thử hỏi Trợ lý</label>
  <div class="row"><div><input id="q" type="text" placeholder="Ví dụ: Thủ tục xin nghỉ phép thế nào?"></div><button id="askBtn" class="ghost">Hỏi</button></div>
  <div id="ans" class="ans" hidden></div>
</section>
<button class="ghost" id="logout">Đăng xuất</button>
</div>

<script>
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('ulisAdmin') || '';
const api = (path, opts = {}) => fetch('/admin/api' + path, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
const say = (el, text, ok) => { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); };
const fmtDate = (s) => new Date(s).toLocaleString('vi-VN');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function refresh() {
  const res = await api('/docs');
  if (res.status === 401 || res.status === 503 || res.status === 429) { const j = await res.json(); token = ''; sessionStorage.removeItem('ulisAdmin'); $('app').hidden = true; $('login').hidden = false; say($('loginMsg'), j.message, false); return; }
  const data = await res.json();
  $('login').hidden = true; $('app').hidden = false;
  $('hint').textContent = 'PDF, DOCX, TXT, MD, CSV · tối đa ' + data.maxUploadMb + ' MB · PDF dạng ảnh scan không đọc được';
  $('mode').textContent = data.semantic ? 'Tìm kiếm: từ khóa + ngữ nghĩa (Voyage)' : 'Tìm kiếm: từ khóa';
  $('empty').hidden = data.docs.length > 0;
  $('list').innerHTML = data.docs.map((d) => '<tr><td><strong>' + esc(d.title) + '</strong><br><small>' + esc(d.filename) + (d.pages ? ' · ' + d.pages + ' trang' : '') + '</small></td><td>' + d.chunkCount + '</td><td><small>' + fmtDate(d.uploadedAt) + '</small></td><td><button class="ghost" data-del="' + d.id + '" data-title="' + esc(d.title) + '">Xóa</button></td></tr>').join('');
}

$('loginBtn').onclick = () => { token = $('tok').value.trim(); sessionStorage.setItem('ulisAdmin', token); refresh(); };
$('tok').onkeydown = (e) => { if (e.key === 'Enter') $('loginBtn').click(); };
$('logout').onclick = () => { token = ''; sessionStorage.removeItem('ulisAdmin'); location.reload(); };

let pendingDelete = null;
$('list').onclick = async (e) => {
  const b = e.target.closest('button[data-del]'); if (!b) return;
  if (pendingDelete !== b) { if (pendingDelete) pendingDelete.textContent = 'Xóa'; pendingDelete = b; b.textContent = 'Bấm lần nữa để xóa'; return; }
  b.disabled = true; const res = await api('/docs/' + b.dataset.del, { method: 'DELETE' }); pendingDelete = null;
  say($('upMsg'), res.ok ? 'Đã xóa "' + b.dataset.title + '".' : 'Xóa không thành công.', res.ok); refresh();
};

async function send(file) {
  const fd = new FormData(); fd.append('file', file); fd.append('title', $('title').value);
  say($('upMsg'), 'Đang xử lý "' + file.name + '"…', true);
  const res = await api('/docs', { method: 'POST', body: fd }); const j = await res.json().catch(() => ({}));
  if (res.ok) { say($('upMsg'), 'Đã thêm "' + j.doc.title + '" (' + j.doc.chunkCount + ' đoạn).', true); $('title').value = ''; refresh(); }
  else say($('upMsg'), j.message || 'Tải lên không thành công.', false);
}
const drop = $('drop');
drop.onclick = () => $('file').click();
$('file').onchange = () => { if ($('file').files[0]) send($('file').files[0]); $('file').value = ''; };
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('on'); };
drop.ondragleave = () => drop.classList.remove('on');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) send(e.dataTransfer.files[0]); };

$('askBtn').onclick = async () => {
  const q = $('q').value.trim(); if (!q) return; const box = $('ans'); box.hidden = false; box.textContent = 'Đang hỏi…';
  const res = await fetch('/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { box.textContent = j.message || 'Lỗi ' + res.status; return; }
  const srcs = [...(j.docSources || []).map((s) => s.title + (s.page ? ' – trang ' + s.page : '')), ...(j.sources || [])];
  box.textContent = '[' + j.verdict + '] ' + j.answer + (j.steps ? '\\n\\n' + j.steps.map((s, i) => (i + 1) + '. ' + s).join('\\n') : '') + (srcs.length ? '\\n\\nNguồn: ' + srcs.join('; ') : '');
};
$('q').onkeydown = (e) => { if (e.key === 'Enter') $('askBtn').click(); };

if (token) refresh();
</script></main></body></html>`;
