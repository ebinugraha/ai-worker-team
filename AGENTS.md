<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## Aturan push github
- jangan sesekali melakukan commit, membuat branch, worktree secara otomatis tanpa perintah dari pengguna

## Aturan Database & Drizzle ORM
- Jangan menjalankan migration (seperti drizzle migration files / migrate scripts) setiap melakukan sinkronisasi atau push ke database. Gunakan schema push langsung (`drizzle-kit push`).
- Jika ada perubahan skema, kolom, tipe data, atau tabel, jangan ragu untuk menghapus data atau drop/reset kolom/tabel yang konflik karena seluruh data bersifat dummy / tidak penting (hanya untuk main-main).
