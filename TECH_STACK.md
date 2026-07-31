# Rekomendasi Tech Stack — Refactor BackupDB

> **Konteks:** Dokumen ini merekomendasikan bahasa pemrograman dan *tech stack* yang **stabil dan cepat** untuk refactor aplikasi **BackupDB** (`automation-backupdb`). Basis analisis: `package.json`, pola kode nyata, dan enam diskrepansi yang terdokumentasi di [FEATURES.md](FEATURES.md) §9 serta agenda refactor di [PRD.md](PRD.md) §9.
>
> **Catatan keamanan:** seluruh variabel `.env` dirujuk **hanya berdasarkan nama** (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, MYSQLDUMP_PATH, BACKUP_DIR, JWT_SECRET) — bukan nilainya.

| | |
|---|---|
| **Baseline** | commit `2427dbe` (versi 0.1) |
| **Stack saat ini** | SolidStart + Nitro + Vite 8 + mysql2 + node-cron, Node ≥ 24 |
| **Sifat aplikasi** | Dashboard operasional internal, I/O-bound (query MySQL, tulis file `.sql`), trafik rendah, satu admin |

---

## 1. Ringkasan Rekomendasi

**Pertahankan TypeScript + Node.js, tetapi jadikan TypeScript *strict* dan disiplin.** Untuk aplikasi ini, mengganti bahasa (mis. ke Go/Rust) **tidak** memberi nilai sepadan: beban kerja bersifat *I/O-bound* (menunggu MySQL & disk), bukan *CPU-bound*, sehingga kecepatan runtime bukan hambatan nyata. Yang menghambat adalah **enam diskrepansi keamanan/keandalan**, bukan bahasa.

> **Prinsip:** *"Refactor untuk keandalan & keamanan, bukan untuk mengejar bahasa yang lebih cepat."* Bottleneck BackupDB adalah I/O dan celah keamanan — keduanya tidak diselesaikan dengan ganti bahasa.

Dua jalur yang dipertimbangkan:

| Jalur | Kapan dipilih | Risiko |
|---|---|---|
| **A. Evolusi (DIREKOMENDASIKAN)** | Tetap SolidStart/TS, rapikan & tutup celah | Rendah — kode & tim tak berubah |
| **B. Migrasi bahasa (Go)** | Hanya jika butuh binari tunggal tanpa Node & konkurensi masif | Tinggi — tulis ulang, ekosistem baru |

---

## 2. Jalur A — Evolusi TypeScript (Direkomendasikan)

### 2.1 Runtime & Bahasa
- **Node.js LTS** (saat ini `engines.node >= 24`). Pertimbangkan pin ke versi **LTS genap** (mis. 24 LTS) untuk stabilitas produksi, bukan versi ganjil/current.
- **TypeScript `strict: true`** menyeluruh. Ini peningkatan "kecepatan" paling nyata: cepat menangkap bug sebelum runtime.
- Alternatif runtime **Bun** menggoda untuk kecepatan start, tetapi **belum** sepadan risikonya untuk stack SolidStart/Nitro/mysql2 produksi — tahan dulu.

### 2.2 Framework
- **Pertahankan SolidStart + Nitro + Vite.** Sudah *fast* (Solid reaktif tanpa VDOM), file-based routes berfungsi sebagai UI + API sekaligus. Tidak ada alasan teknis untuk pindah ke Next/Nuxt.
- **Naikkan `@solidjs/start` dari `^2.0.0-beta.0` ke rilis stabil** begitu tersedia. Beta di jalur produksi adalah utang keandalan.
- **`nitro ^3.0.x-beta` → stabil** dengan alasan sama.

### 2.3 Database & Driver
- **Pertahankan `mysql2/promise`** — matang, cepat, *prepared statements*. Tidak perlu ORM berat.
- Jika ingin *type-safety* query tanpa ORM penuh: pertimbangkan **Kysely** (query builder TS, tipis) atau **Drizzle**. Opsional, bukan wajib.
- Pertahankan pemisahan `pool` (DB `backup_automation`) vs `rootPool` (lintas-DB untuk Explorer & enumerasi target) — desain ini sudah tepat.

### 2.4 Penjadwalan
- **Pertahankan `node-cron`** (in-process, portabel, sesuai NFR portabilitas). Untuk trafik & skala BackupDB ini cukup.
- Jika kelak butuh *durability* (job bertahan lintas restart / multi-instance): naikkan ke **BullMQ + Redis**. **Belum perlu** sekarang — jangan menambah dependensi tanpa kebutuhan nyata.

---

## 3. Prioritas Refactor (menutup 6 diskrepansi)

Urutan ini **mengikat** rekomendasi stack ke masalah nyata. Selesaikan dari 🔴 ke 🟡.

| # | Prioritas | Masalah (ref. diskrepansi) | Tindakan & pustaka |
|---|---|---|---|
| 1 | 🔴 Kritis | **(f)** Tidak ada gate auth sisi server — hampir semua endpoint bisa diakses tanpa sesi | Tambah **middleware/guard sisi server** (verifikasi cookie `session_token` di setiap route API kecuali login). SolidStart: bungkus di server handler / `getSession`. |
| 2 | 🔴 Kritis | **(c)** Password admin **plaintext** (`admin123`) meski README klaim "hashing" | **`argon2`** (utama) atau **`bcrypt`**. Hash saat set, verifikasi saat login. Hapus plaintext dari DB & seed. |
| 3 | 🟠 Tinggi | **(d)** JWT HS256 buatan tangan; `JWT_SECRET` fallback acak per-proses → sesi putus saat restart | Pakai **`jose`** (JWT teruji) + **wajibkan `JWT_SECRET`** dari `.env` (fail-fast bila kosong, jangan generate acak). |
| 4 | 🟠 Tinggi | **(e)** `disk.ts` fallback **simulasi 5GB/100GB** bila `statfs` gagal → bisa izinkan backup di disk penuh | Hilangkan angka simulasi. Bila `statfs` gagal → **gagalkan/blokir** backup + log jelas, jangan pura-pura ada ruang. |
| 5 | 🟡 Sedang | **(a)** Backup pakai **pure-JS** `dumpDatabaseJS`, bukan `mysqldump`; `MYSQLDUMP_PATH` tak terpakai | **Keputusan sadar:** pertahankan pure-JS (portabel, tanpa binari) **atau** dukung `mysqldump` resmi. Apa pun pilihannya, **samakan dokumen** & hapus `MYSQLDUMP_PATH` bila tak dipakai. |
| 6 | 🟡 Sedang | **(b)** Tidak ada kompresi; menulis `.sql` mentah meski README klaim "terkompresi" | Tambah **gzip** via `node:zlib` (stream `.sql` → `.sql.gz`) untuk hemat disk, atau perbaiki klaim dokumen. |
| 7 | 🟡 Sedang | i18n / konsistensi dokumen (README menyebut `app.config.js` yang tak ada) | Rapikan README agar cocok kode; satu bahasa konsisten. |

---

## 4. Tooling Pendukung (stabilitas jangka panjang)

| Area | Rekomendasi | Alasan |
|---|---|---|
| Kualitas kode | **ESLint + Prettier** + `typescript strict` | Cegah regresi saat refactor |
| Validasi input | **Zod** (validasi body/params API & env) | Fail-fast pada input & `.env` tak valid |
| Env | Validasi `.env` saat *startup* (Zod schema) | `JWT_SECRET`/`DB_*` wajib ada sebelum server jalan |
| Testing | **Vitest** (unit) + smoke test endpoint | Amankan logika backup/retention |
| Keamanan | **argon2**, **jose**, cookie `HttpOnly`/`SameSite=Lax` (sudah ada) | Tutup celah auth |
| Observability | Log terstruktur (mis. **pino**) | Audit job backup/retention |

---

## 5. Kapan Jalur B (Migrasi ke Go) Masuk Akal

Hanya pilih **Go** jika **semua** hal berikut menjadi kebutuhan nyata — bukan sekarang:

- Butuh **binari tunggal** yang dideploy tanpa runtime Node sama sekali.
- Butuh konkurensi masif / backup ribuan DB paralel (CPU/goroutine-bound).
- Tim nyaman menulis ulang UI (Solid → templ/htmx atau SPA terpisah).

Untuk BackupDB versi 0.1 (satu admin, trafik rendah, I/O-bound), **biaya tulis-ulang > manfaat**. Rust bahkan lebih jauh lagi biayanya. **Rekomendasi tegas: Jalur A.**

---

## 6. Kesimpulan

1. **Bahasa & stack: tetap TypeScript + SolidStart + Nitro + mysql2 + node-cron.** Sudah stabil dan cepat untuk beban I/O-bound ini.
2. **Naikkan `@solidjs/start` & `nitro` dari beta ke stabil**, aktifkan `strict`, pin Node ke LTS.
3. **Fokus energi refactor pada keamanan/keandalan** (tabel §3), bukan mengganti bahasa: auth sisi server, hashing `argon2`, `jose` + `JWT_SECRET` wajib, hapus fallback disk simulasi, dan samakan dokumen dengan perilaku kode.
4. **Tambah jaring pengaman:** Zod (env & input), Vitest, ESLint/Prettier, pino.

> Kecepatan yang paling terasa untuk aplikasi ini bukan dari runtime yang lebih cepat, melainkan dari **kode yang lebih aman, tervalidasi, dan konsisten dengan dokumennya.**
