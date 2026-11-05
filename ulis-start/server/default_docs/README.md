# default_docs

Documents in this folder are indexed automatically when the assistant server starts, so they survive
redeploys on hosts without a persistent disk (Render free tier). No manual upload is needed.

- Supported: `.pdf` (with a text layer, not scanned images), `.docx`, `.txt`, `.md`, `.csv`.
- Display titles (optional): add `titles.json` next to the files, for example
  `{ "quy-che-chi-tieu-2026.pdf": "Quy chế chi tiêu ĐHNN 2026" }`. Without it the file name is the title.
- To update a document, replace the file and deploy; changed files are re-indexed (SHA-256 check).
- To remove one, delete the file and deploy. These documents show as "Mặc định" on /admin and cannot be
  deleted there.
- Documents uploaded through /admin still work as before; on a host without a disk they are lost on redeploy.

This README and `titles.json` are not indexed.

**Visibility:** this repository is public, so every file in this folder can be downloaded by anyone.
Only add documents that may be published.
