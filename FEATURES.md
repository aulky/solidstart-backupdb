# FEATURES.md — Inventarisasi Fitur BackupDB

> **Tujuan dokumen:** Menjadi *baseline* (kondisi nyata saat ini) sebelum proses **refactor**. Dokumen ini dibuat dengan membaca **kode sumber langsung**, bukan dari dokumentasi lama — karena beberapa dokumen (README, PRD, setup) sudah tidak sinkron dengan implementasi aktual. Seluruh temuan ketidaksesuaian ditandai eksplisit di bagian [§9 Diskrepansi Dokumen vs Kode](#9-diskrepansi-dokumen-vs-kode).

| | |
|---|---|
| **Aplikasi** | `automation-backupdb` — MySQL Backup Automation Dashboard |
| **Versi baseline** | 0.1 (commit `2427dbe`) |
| **Tanggal audit** | 31 Juli 2026 |
| **Runtime** | Node.js >= 24 |
| **Arsitektur** | Full-stack terintegrasi (SolidStart: UI + API dalam satu proyek) |

---

## Daftar Isi
1. [Ringkasan Domain](#1-ringkasan-domain)
2. [Fitur Autentikasi](#2-fitur-autentikasi)
3. [Fitur Backup (Manual & Terjadwal)](#3-fitur-backup-manual--terjadwal)
4. [Fitur Retention (FIFO)](#4-fitur-retention-fifo)
5. [Fitur Database Explorer](#5-fitur-database-explorer)
6. [Fitur Dashboard & Monitoring](#6-fitur-dashboard--monitoring)
7. [Fitur Pengaturan (Settings)](#7-fitur-pengaturan-settings)
8. [Skema Database Internal](#8-skema-database-internal)
9. [Diskrepansi Dokumen vs Kode](#9-diskrepansi-dokumen-vs-kode)
10. [Peta File & Endpoint](#10-peta-file--endpoint)
11. [Utang Teknis untuk Refactor](#11-utang-teknis-untuk-refactor)

## 1. Ringkasan Domain

BackupDB adalah *dashboard* berbasis web untuk **otomatisasi backup database MySQL**. Aplikasi ini menyatukan lima kemampuan inti dalam satu proses SolidStart:

- **Penjadwalan backup** (harian / mingguan / bulanan) melalui `node-cron`.
- **Backup manual instan** untuk satu atau banyak database sekaligus.
- **Retention otomatis (FIFO)** di level folder untuk menjaga kapasitas disk.
- **Database Explorer read-only** untuk menelusuri database, tabel, struktur, dan preview data.
- **Monitoring** disk, status scheduler, dan histori backup melalui log.

Karakteristik arsitektur yang penting untuk refactor:

- **Full-stack terintegrasi** — UI (halaman `.tsx`) dan API (`src/routes/api/**`) hidup dalam satu proyek. Rute berbasis file sekaligus menjadi *page* dan *endpoint*.
- **Single-admin** — hanya ada satu akun administrator (tidak ada multi-user, role, atau tenant).
- **Dua koneksi MySQL**: `pool` (terikat ke DB internal `backup_automation`) dan `rootPool` (tanpa default DB, dipakai untuk query lintas-database seperti Explorer & enumerasi target backup).
- **Dump SQL murni-JS** — aplikasi **tidak** memanggil biner `mysqldump`; dump `.sql` disusun ulang di JavaScript via `mysql2`. Lihat [§9](#9-diskrepansi-dokumen-vs-kode).

---

## 2. Fitur Autentikasi

| Aspek | Implementasi aktual |
|---|---|
| Model | Single-admin, kredensial disimpan di tabel `backup_settings` (baris singleton `id=1`). |
| Default kredensial | username `admin`, password `admin123`. |
| Penyimpanan password | **Plaintext** — dibandingkan langsung `password === settings.admin_password`. Tidak ada hashing. |
| Token sesi | JWT **HS256 hand-rolled** (dibuat manual dengan `crypto` HMAC-SHA256, bukan library). |
| Cookie | `session_token` — HttpOnly, Path=/, SameSite=Lax, Max-Age=86400 (24 jam). |
| Rahasia JWT | `JWT_SECRET` dari env; **fallback** ke `crypto.randomBytes(32)` per proses bila tidak diset. |
| Verifikasi | `GET /api/auth/session` menghitung ulang signature, cek `exp`, dan role `admin`. |
| Logout | `POST /api/auth/session` menyetel cookie Max-Age=0. |

**Alur:** `POST /api/auth/login` membandingkan kredensial plaintext → bila cocok, `signJwt()` membuat token → `Set-Cookie: session_token`. Frontend `app.tsx` memanggil `checkSession()` sebagai gerbang; bila password masih default, muncul *banner* peringatan amber (`isDefaultPassword`).

> ⚠️ **Temuan kritis:** Gerbang autentikasi **hanya di sisi klien**. Tidak ada middleware server. Detail di [§9](#9-diskrepansi-dokumen-vs-kode) dan [§11](#11-utang-teknis-untuk-refactor).

## 3. Fitur Backup (Manual & Terjadwal)

Mesin backup ada di `server/services/backup.ts`. Semua backup — manual maupun terjadwal — melewati fungsi inti yang sama.

**Mekanisme dump (`dumpDatabaseJS`):**
- Enumerasi tabel via `SHOW FULL TABLES WHERE Table_type='BASE TABLE'` (view dilewati).
- Untuk tiap tabel: tulis `DROP TABLE IF EXISTS` + hasil `SHOW CREATE TABLE`, lalu `INSERT` ber-*batch*.
- Baris di-*escape* manual, dikelompokkan (batchSize 1000), *flush* ke file tiap 100 baris **atau** 45.000 byte.
- Output: file `.sql` **mentah (tanpa kompresi)**.

**Kontrol eksekusi:**
- Flag in-memory `backupRunning` + `isBackupRunning()` mencegah backup ganda. `POST /api/backup` mengembalikan **409** bila backup sedang berjalan.
- `MIN_FREE_SPACE = 100 MB` — dicek sebelum menulis.
- `resolveTargetDatabases(override?)` menentukan target: bila `backup_all=1` ambil semua DB non-sistem, jika tidak pakai `selected_dbs` (JSON). `override` dipakai untuk manual backup selektif.

**Struktur output:**
- Satu folder per eksekusi bernama `{YYYY-MM-DD_HHmmss}` (via `formatTimestamp`).
- Di dalam folder: satu file `{namaDatabase}.sql` per database.

**Backup terjadwal (`server/services/scheduler.ts`):**
- `activeTasks: Map` menampung task cron aktif.
- `buildCronExpression`: harian `{mm} {hh} * * *`, mingguan `... * * {dow||1}`, bulanan `... {dom||1} * *`.
- `syncSchedules()` menghentikan semua task lalu membangun ulang dari tabel `backup_schedules` (dipanggil tiap kali settings/schedule berubah). Saat cron memicu → `resolveTargetDatabases` + `runBackup(..., "scheduled")`.
- Validasi ekspresi dengan `cron.validate` sebelum `cron.schedule`.

**Endpoint terkait:** `POST /api/backup` (jalankan manual), `GET /api/backup/status` (`{running}`, di-*poll* dashboard tiap 5 detik).

---

## 4. Fitur Retention (FIFO)

- Diimplementasikan di `applyRetention(dir, limit)` dalam `backup.ts`.
- **Level folder**, bukan file: bila jumlah folder backup melebihi `retention_limit` (default 10), folder tertua dihapus.
- Urutan "tertua" ditentukan **secara leksikografis** atas nama folder `{YYYY-MM-DD_HHmmss}` — aman karena format timestamp sudah *sortable*.
- Setiap penghapusan retention dicatat ke `backup_logs` dengan `db_name='_system'`, `type='retention'`.
- Retention dijalankan otomatis setelah tiap backup sukses.

## 5. Fitur Database Explorer

Penelusuran database MySQL **read-only** (hanya baca, tidak ada mutasi). Berjalan lewat `rootPool` sehingga bisa melihat database di luar `backup_automation`.

| Endpoint | Fungsi |
|---|---|
| `GET /api/databases` | Daftar database (kecuali DB sistem). |
| `GET /api/databases/{name}/tables` | Daftar tabel dalam satu database. |
| `GET /api/databases/{name}/tables/{table}/structure` | Struktur/skema kolom tabel. |
| `GET /api/databases/{name}/tables/{table}/data` | Preview baris data tabel. |

- Identifier (nama db/tabel) di-*sanitasi* dengan menghapus backtick sebelum disisipkan ke query.
- Halaman: `explorer/index.tsx` (daftar DB) → `explorer/[name]/index.tsx` (daftar tabel) → `explorer/[name]/[table].tsx` (tab **Structure** | **Data**).

---

## 6. Fitur Dashboard & Monitoring

Halaman `index.tsx` menyatukan seluruh metrik operasional.

- **StatCards** — ringkasan angka dari `GET /api/logs/stats`: total DB, jadwal aktif, waktu *last run*, total folder backup, total ukuran di disk (`SUM(file_size) WHERE status='success' AND type!='retention'`), plus info disk.
- **BackupChart** — grafik 14 hari (Chart.js): sukses `#16A34A`, gagal `#DC2626`.
- **Storage bar** — bar kapasitas disk beraksen crimson `#E11D48`.
- **Activity Log** — histori backup dikelompokkan per folder eksekusi.
- **Polling** — status backup di-*refresh* tiap 5 detik via `getBackupStatus`.

**Endpoint log & statistik:**
- `GET /api/logs` — paginasi (`page`/`limit` ≤ 100) + filter `type`/`status`/`db`/`search`/`startDate`/`endDate`/`showRetention`, plus data chart 30 hari.
- `GET /api/logs/stats` — agregat kartu statistik (lihat di atas).
- `GET /api/download?folder=&file=` — unduh `.sql` (guard path-traversal `startsWith(backupDir)` → 403; validasi baris log sukses → 404; `stat` → 404).
- `DELETE /api/delete-backup` — hapus folder (regex nama `^\d{4}-\d{2}-\d{2}_\d{6}$` → 400; guard path → 403; `rm` rekursif lalu hapus baris log).

**Sumber data disk (`server/services/disk.ts`):** `getDiskSpace(path)` via `statfs` → `{freeBytes, totalBytes}`; fallback retry ke `statfs(".")`; *worst-case* fallback mengembalikan **nilai simulasi 5 GB free / 100 GB total**. Lihat [§9](#9-diskrepansi-dokumen-vs-kode).

---

## 7. Fitur Pengaturan (Settings)

Halaman `settings.tsx` (`max-w-4xl`) dengan tiga kartu: **General**, **Admin Security**, **Schedules**.

- **General** — `retention_limit`, `backup_dir`, mode target (`backup_all` vs `selected_dbs`).
- **Admin Security** — ganti `admin_username` / `admin_password`.
- **Schedules** — CRUD jadwal (`ScheduleForm`): tipe daily/weekly/monthly, `time_of_day`, `days_of_week`/`days_of_month`, `enabled`.

**Endpoint:**
- `GET /api/settings` — kembalikan settings + info disk.
- `POST /api/settings` — UPDATE parsial, lalu memanggil `syncSchedules()` agar cron langsung sinkron.

## 8. Skema Database Internal

Dibuat idempoten oleh `server/db/init.ts` — membuat DB `backup_automation` + 3 tabel. `SYSTEM_DBS = ["information_schema","mysql","performance_schema","sys"]` dikecualikan dari target backup & Explorer.

**`backup_settings`** (singleton `id=1`):

| Kolom | Tipe | Default |
|---|---|---|
| retention_limit | INT | 10 |
| backup_dir | VARCHAR(512) | `./backups` |
| backup_all | TINYINT | 1 |
| selected_dbs | TEXT NULL | — (JSON array) |
| last_run_success | DATETIME | NULL |
| last_run_fail | DATETIME | NULL |
| admin_username | VARCHAR | `admin` |
| admin_password | VARCHAR | `admin123` (plaintext) |

**`backup_schedules`:**

| Kolom | Tipe | Default |
|---|---|---|
| type | ENUM('daily','weekly','monthly') | — |
| days_of_week | VARCHAR(64) | — |
| days_of_month | VARCHAR(64) | — |
| time_of_day | VARCHAR(5) | `02:00` |
| enabled | TINYINT | 1 |
| created_at | DATETIME | — |

**`backup_logs`:**

| Kolom | Tipe | Default |
|---|---|---|
| db_name | VARCHAR(128) | — |
| executed_at | DATETIME | — |
| type | ENUM('scheduled','manual','retention') | — |
| status | ENUM('success','failed') | — |
| file_size | BIGINT | 0 |
| error_message | TEXT | NULL |
| folder_name | VARCHAR(256) | — |

Indeks: `idx_executed_at` (DESC), `idx_folder`.

---

## 9. Diskrepansi Dokumen vs Kode

Bagian terpenting untuk refactor. Enam ketidaksesuaian antara dokumentasi lama dan implementasi nyata:

| # | Klaim dokumen | Kenyataan di kode | Sumber klaim |
|---|---|---|---|
| **a** | Backup pakai biner `mysqldump` | Dump **murni-JS** via `mysql2` (`dumpDatabaseJS`). `MYSQLDUMP_PATH` **tidak dipakai** sama sekali. | README ln 98; PRD ln 144, 171; setup.md; README `.env` ln 49 |
| **b** | Output backup terkompresi (folder/zip) | File `.sql` **mentah tanpa kompresi**. | README ln 105 ("`.sql` terkompresi"), ln 98 ("kompresi folder") |
| **c** | Password admin pakai "hashing sederhana" | **Plaintext**, dibandingkan langsung. Default `admin123`. | README ln 101 |
| **d** | (implisit) sesi stabil | JWT HS256 hand-rolled; `JWT_SECRET` fallback **random per proses** → semua sesi invalid tiap kali server restart. | `auth.ts` |
| **e** | Validasi disk andal | *Worst-case* fallback `disk.ts` mengembalikan **nilai simulasi 5 GB/100 GB** → backup bisa jalan di disk penuh bila `statfs` gagal. | `disk.ts` |
| **f** | (implisit) endpoint terlindungi | **Tidak ada middleware auth server**. Hanya `GET /api/auth/session` yang verifikasi JWT; semua endpoint lain (settings, schedules, databases, backup, logs, download, delete-backup) **bisa diakses tanpa sesi**. Gerbang murni di klien (`app.tsx`). | seluruh `src/routes/api/**` |

**Catatan lokalisasi:** UI filter di halaman `backups/index.tsx` berbahasa **Indonesia**, sisa aplikasi berbahasa **Inggris**. Perlu dinormalisasi saat refactor.

## 10. Peta File & Endpoint

**Backend services (`server/`):**

| File | Tanggung jawab |
|---|---|
| `server/db/connection.ts` | `loadEnvFile()` (try/catch); `pool` (DB=`backup_automation`) + `rootPool` (tanpa default DB). Baca `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`. |
| `server/db/init.ts` | Skema definitif (3 tabel), idempoten. `SYSTEM_DBS`. |
| `server/services/backup.ts` | Mesin dump murni-JS, `runBackup`, `applyRetention`, `resolveTargetDatabases`, `formatTimestamp`, flag `backupRunning`. |
| `server/services/scheduler.ts` | `activeTasks`, `buildCronExpression`, `syncSchedules`. |
| `server/services/disk.ts` | `getDiskSpace` via `statfs` (+ fallback simulasi). |
| `server/services/auth.ts` | `signJwt` / `verifyJwt` (HS256 manual). |

**API endpoints (`src/routes/api/`):**

| Metode & Path | Fungsi |
|---|---|
| `POST /api/auth/login` | Login (plaintext compare → Set-Cookie). |
| `GET/POST /api/auth/session` | Verifikasi sesi / logout. |
| `GET/POST /api/settings` | Baca / update settings (+ `syncSchedules`). |
| `POST /api/backup` | Backup manual (409 bila berjalan). |
| `GET /api/backup/status` | `{running}`. |
| `GET /api/logs` | Log terpaginasi + filter + chart. |
| `GET /api/logs/stats` | Agregat kartu statistik. |
| `GET /api/download` | Unduh `.sql` (guard path). |
| `DELETE /api/delete-backup` | Hapus folder backup + log. |
| `GET /api/databases[...]` | Explorer read-only (via `rootPool`). |

**Frontend (`src/`):** halaman `index.tsx`, `settings.tsx`, `backups/index.tsx`, `explorer/**`, `[...404].tsx`, gerbang `app.tsx`. Komponen: `Nav`, `Login`, `BackupChart`, `BackupModal`, `DatabaseSelector`, `ScheduleForm`, dan `ui/*` (`Dialog`, `Select`, `StatCard`, `StatusChip`, `LoadingSpinner`). Helper: `src/lib/api.ts` (klien API, forward Cookie saat SSR), `src/lib/format.ts` (formatBytes/Date/timeAgo).

---

## 11. Utang Teknis untuk Refactor

Prioritas berdasar dampak, khusus untuk pekerjaan refactor:

**Keamanan (prioritas tertinggi):**
1. **Tambahkan middleware auth server-side** — saat ini semua endpoint (kecuali `GET /api/auth/session`) terbuka tanpa sesi ([§9-f](#9-diskrepansi-dokumen-vs-kode)). Ini celah paling serius.
2. **Hash password admin** — ganti perbandingan plaintext dengan hashing (mis. argon2/bcrypt) ([§9-c](#9-diskrepansi-dokumen-vs-kode)).
3. **`JWT_SECRET` wajib & persisten** — hentikan fallback random per proses agar sesi tidak invalid tiap restart ([§9-d](#9-diskrepansi-dokumen-vs-kode)). Pertimbangkan library JWT teruji ketimbang implementasi manual.

**Keandalan:**
4. **Perbaiki fallback disk** — jangan kembalikan nilai simulasi yang bisa meloloskan backup di disk penuh; gagalkan dengan aman ([§9-e](#9-diskrepansi-dokumen-vs-kode)).
5. **Pertimbangkan kompresi** output `.sql` (gzip) untuk hemat disk ([§9-b](#9-diskrepansi-dokumen-vs-kode)).
6. **Evaluasi strategi dump** — dump murni-JS portabel tapi lambat & rawan untuk data besar; pertimbangkan streaming atau opsi `mysqldump` native yang sebenarnya ([§9-a](#9-diskrepansi-dokumen-vs-kode)).

**Kualitas & konsistensi:**
7. **Normalisasi bahasa UI** (Inggris vs Indonesia campur) — pilih satu, idealnya i18n.
8. **Sinkronkan dokumentasi** — README/PRD/setup masih menyebut mysqldump, kompresi, hashing yang tidak ada.
9. **Tipe & validasi input** — endpoint mengandalkan validasi manual; pertimbangkan skema (mis. Zod/Valibot) terpusat.
10. **Backup ganda antar-proses** — flag `backupRunning` hanya in-memory; bila diskalakan multi-instance, butuh lock eksternal.

---

*Dokumen ini adalah baseline faktual per commit `2427dbe`. Setelah refactor, perbarui bersama [PRD.md](PRD.md) dan [DESIGN.md](DESIGN.md).*
