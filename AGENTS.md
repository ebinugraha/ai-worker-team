<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan Git & Push GitHub
- Jangan sesekali melakukan commit, membuat branch, atau worktree secara otomatis tanpa perintah eksplisit dari pengguna.
- Hanya lakukan git stage/commit ketika pengguna menginstruksikannya secara jelas (misalnya "stage dan commit semua perubahan").

## Aturan Database & Drizzle ORM
- Jangan menjalankan migration (seperti drizzle migration files / migrate scripts) setiap melakukan sinkronisasi atau push ke database. Gunakan schema push langsung (`drizzle-kit push` atau `npm run db:push`).
- Jika ada perubahan skema, kolom, tipe data, atau tabel, jangan ragu untuk menghapus data atau drop/reset kolom/tabel yang konflik karena seluruh data bersifat dummy / tidak penting (hanya untuk main-main).

## Aturan Next.js 16 & Server Components
- **Proxy/Middleware:** Konvensi Next.js 16 menggunakan `src/proxy.ts` (dengan `clerkMiddleware()`), bukan `middleware.ts`.
- **Partial Prerendering (PPR) & Suspense:** 
  - Dynamic parameters (seperti asinkron `params` pada rute `/chat/[chatId]`) dan komponen Clerk dinamis (seperti `UserButton`) wajib dibungkus batas `<Suspense>` dengan fallback skeleton yang sesuai guna menjamin kompatibilitas PPR.
  - Komponen async yang membaca params harus diisolasi ke dalam sub-komponen terpisah dari layout atau halaman induk yang dirender secara parsial.

## Aturan Desain UI & Komponen Shadcn
- **Scope Implementasi:** Implementasikan UI secara presisi sesuai instruksi dan gambar referensi (seperti di folder `src/references/`). Jangan menambahkan navigasi ekstra, fitur, atau tombol yang tidak diminta pengguna.
- **Styling Token:** Gunakan styling Tailwind CSS v4 dengan semantic design tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, dll.), hindari hardcoded color.
- **Konsistensi Dialog (Create & Edit Bot):**
  - Section **Face**: Tampil tanpa container card/box luar (border-free), avatar DiceBear Gaze tampil natural (`rounded-none` / unclipped), dan tombol **Shuffle** berbentuk rounded rectangle (`rounded-lg h-8 px-3`) bergaris tepi tipis dengan icon shuffle.
  - Tipografi label form: Gunakan `text-sm font-medium text-foreground`.
  - Divider: Gunakan garis pembatas horizontal halus (`border-t border-border/60`) sebelum footer dialog.
  - Tombol Destruktif (Delete): Selalu diletakkan di sudut kiri bawah (`justify-start`), terpisah jauh dari tombol Cancel & Submit di sudut kanan bawah (`justify-end`), serta wajib disertai modal konfirmasi `AlertDialog` shadcn.
- **Resizable Sidebar:**
  - Menggunakan ambang batas histeresis (*deadband*) untuk transisi collapse/expand: collapse hanya jika kursor ditarik `< 100px`, dan expand kembali hanya jika kursor ditarik `> 150px` guna mencegah glitch / flicker buka-tutup berulang.
  - Kursor handle resize menggunakan `col-resize` saat di-hover dan diseret.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-cost-savings`, `trigger-realtime-and-frontend`, `trigger-authoring-chat-agent`, `trigger-chat-agent-advanced`, `trigger-getting-started`.
<!-- TRIGGER.DEV SKILLS END -->
