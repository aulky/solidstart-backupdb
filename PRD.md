# Product Requirements Document (PRD)
## Fitur: Database Backup Automation

| | |
|---|---|
| **Dokumen** | PRD - Database Backup Automation |
| **Versi** | 2.0 (disinkronkan dengan kode nyata) |
| **Tanggal** | 31 Juli 2026 |
| **Status** | Updated — Baseline Refactor |
| **Baseline kode** | commit `2427dbe` (versi aplikasi 0.1) |
| **Tech Stack** | SolidStart (Frontend + Backend dalam satu proyek), MySQL via `mysql2/promise`, Node.js >= 24 |

---

> **Catatan revisi v2.0:** Dokumen ini diperbarui dari v1.0 (Draft, 28 Juli 2026) agar **sesuai dengan implementasi aktual**. Beberapa asumsi awal di v1.0 ternyata berbeda dari kode yang benar-benar berjalan. Bagian yang berubah signifikan: mekanisme dump (bukan `mysqldump`), autentikasi (single-admin JWT — sebelumnya tidak dibahas), dan seluruh **Open Questions** (§9) yang kini sudah terjawab oleh kode. Untuk inventarisasi fitur lengkap berbasis kode, lihat [FEATURES.md](FEATURES.md). Untuk sistem desain, lihat [DESIGN.md](DESIGN.md).

---

## 1. Latar Belakang & Problem Statement

Saat ini database MySQL yang berjalan secara lokal (via XAMPP/phpMyAdmin) tidak memiliki mekanisme backup otomatis. Proses backup yang dilakukan secara manual melalui phpMyAdmin memiliki risiko:

- **Human error** — lupa melakukan backup secara berkala.
- **Tidak konsisten** — jadwal backup tidak terstandarisasi.
- **Tidak efisien** — harus membuka phpMyAdmin dan export manual satu per satu setiap database.
- **Risiko kehilangan data** — jika terjadi corrupt/crash tanpa backup terbaru, data bisa hilang permanen.
- **Tidak ada visibilitas** — tidak ada cara mudah untuk memantau riwayat backup mana yang sudah/belum berhasil dijalankan.

Oleh karena itu, dibutuhkan sebuah sistem **automation backup database** yang terintegrasi langsung dalam project SolidStart, sehingga proses backup dapat berjalan otomatis sesuai jadwal, dapat dipantau melalui dashboard, dan tetap bisa dijalankan secara manual kapan pun dibutuhkan.

---

## 2. Goals & Objectives

### 2.1 Goals
1. Menyediakan sistem backup database MySQL otomatis (`.sql`) yang terjadwal (scheduled).
2. Memberikan fleksibilitas kepada user untuk mengatur jadwal backup (harian, mingguan, atau tanggal spesifik).
3. Memungkinkan user memilih database mana saja yang akan di-backup (selektif) atau backup seluruh database yang tersedia.
4. Menyediakan opsi backup manual (on-demand) tanpa harus menunggu jadwal otomatis.
5. Menerapkan retention policy (rotasi backup) agar penyimpanan tidak membengkak — backup lama otomatis terhapus berdasarkan jumlah maksimum yang ditentukan.
6. Menyediakan dashboard monitoring untuk memantau status, riwayat, dan hasil dari seluruh aktivitas backup.

### 2.2 Non-Goals (Di luar cakupan versi ini)
- Backup ke cloud storage (Google Drive, S3, dsb.) — dapat menjadi fase berikutnya.
- Restore otomatis via UI (fase awal hanya sebatas download file backup; restore manual via phpMyAdmin/CLI).
- Backup database selain MySQL (PostgreSQL, MongoDB, dll).
- Enkripsi file backup (dapat dipertimbangkan di fase lanjutan).

---

## 3. Target Pengguna

- **Developer/Admin internal** yang mengelola aplikasi dan database secara lokal/self-hosted, membutuhkan jaminan data aman tanpa harus melakukan backup manual berulang kali.

---

## 4. Ruang Lingkup (Scope)

### 4.1 In-Scope
- Konfigurasi jadwal backup (scheduling).
- Konfigurasi database yang ingin di-backup (selective/all).
- Backup manual (trigger langsung).
- Retention policy (auto-delete backup lama).
- Dashboard monitoring (riwayat, status, log).
- Penyimpanan file `.sql` di storage lokal server.

### 4.2 Out-of-Scope
- Cloud backup storage.
- Restore otomatis via UI.
- Multi-database engine (non-MySQL).
- Notifikasi eksternal (email/Telegram) — *bisa jadi future enhancement, lihat bagian 10*.

---

## 5. Functional Requirements

### 5.1 Manajemen Jadwal Backup (Scheduling Settings)
| ID | Requirement |
|---|---|
| FR-1.1 | User dapat mengatur jadwal backup otomatis dengan opsi: **Harian**, **Mingguan** (pilih hari), atau **Tanggal spesifik per bulan** (misal setiap tanggal 1 dan 15). |
| FR-1.2 | User dapat menentukan **jam eksekusi** backup (misal 02:00 dini hari). |
| FR-1.3 | User dapat mengaktifkan/menonaktifkan (enable/disable) jadwal otomatis tanpa menghapus konfigurasi. |
| FR-1.4 | Sistem menjalankan job backup sesuai jadwal menggunakan scheduler (cron job/background job) di sisi backend SolidStart. |

### 5.2 Pemilihan Database yang Dibackup
| ID | Requirement |
|---|---|
| FR-2.1 | Sistem menampilkan daftar seluruh database yang tersedia di MySQL server (via query `SHOW DATABASES` atau sejenisnya, dengan exclude default system DB seperti `information_schema`, `mysql`, `performance_schema`, `sys`). |
| FR-2.2 | User dapat memilih satu atau lebih database spesifik untuk dijadwalkan backup (checkbox multi-select). |
| FR-2.3 | User dapat memilih opsi **"Backup All Database"** — seluruh database yang tersedia otomatis ikut ter-backup, termasuk database baru yang ditambahkan di kemudian hari (jika opsi ini aktif). |
| FR-2.4 | Konfigurasi pemilihan database tersimpan sebagai default untuk backup otomatis maupun manual (namun manual backup boleh override pilihan ini per-eksekusi). |

### 5.3 Backup Manual (On-Demand)
| ID | Requirement |
|---|---|
| FR-3.1 | Tersedia tombol **"Backup Sekarang"** yang dapat diklik kapan saja tanpa menunggu jadwal otomatis. |
| FR-3.2 | Saat backup manual dijalankan, user dapat memilih database mana yang ingin di-backup saat itu juga (default: mengikuti konfigurasi tersimpan, tapi bisa diubah). |
| FR-3.3 | Sistem menampilkan indikator proses (loading/progress) selama backup manual berjalan. |
| FR-3.4 | Hasil backup manual langsung tercatat di riwayat/log dengan penanda tipe **"Manual"**. |

### 5.4 Retention Policy (Auto-Delete Backup Lama)
| ID | Requirement |
|---|---|
| FR-4.1 | Setiap eksekusi backup (baik otomatis maupun manual) menghasilkan **satu folder baru** yang diberi nama sesuai **tanggal & waktu backup** (misal `2026-07-28_020000`), berisi seluruh file `.sql` dari database yang di-backup pada eksekusi tersebut. |
| FR-4.2 | User dapat mengatur **jumlah maksimum folder backup** yang disimpan (contoh default: maksimal 10 folder). |
| FR-4.3 | Jika jumlah folder backup melebihi batas maksimum (misal sudah ada 10, lalu backup ke-11 dijalankan), sistem otomatis menghapus **folder backup paling lama** (FIFO — First In First Out) beserta seluruh isi `.sql` di dalamnya, setelah folder backup baru berhasil dibuat. |
| FR-4.4 | Batas jumlah folder ini **dapat diatur/disetting oleh user** melalui halaman Settings, bukan nilai tetap (default 10, bisa diubah sesuai kebutuhan). |
| FR-4.5 | Proses penghapusan folder otomatis tercatat dalam log aktivitas (nama folder yang dihapus, waktu penghapusan). |

### 5.5 Dashboard Monitoring
| ID | Requirement |
|---|---|
| FR-5.1 | Dashboard menampilkan **ringkasan status**: total database yang dimonitor, jadwal aktif, backup terakhir sukses, backup terakhir gagal (jika ada). |
| FR-5.2 | Dashboard menampilkan **riwayat backup** dalam bentuk tabel/list berisi: nama database, waktu eksekusi, tipe (otomatis/manual), status (sukses/gagal), ukuran file, dan aksi (download/hapus). |
| FR-5.3 | User dapat **mendownload** file `.sql` hasil backup langsung dari dashboard. |
| FR-5.4 | User dapat melihat **detail error/log** jika ada backup yang gagal (misal koneksi DB terputus, disk penuh, dll). |
| FR-5.5 | Dashboard menampilkan visualisasi sederhana (misal jumlah backup per hari/minggu) untuk memantau tren. |
| FR-5.6 | User dapat menghapus file backup secara manual dari dashboard di luar mekanisme retention otomatis. |

### 5.6 Database Explorer / Viewer (mirip phpMyAdmin)
| ID | Requirement |
|---|---|
| FR-6.1 | Dashboard menyediakan halaman **Database Explorer** yang menampilkan daftar seluruh database yang tersedia di MySQL server, mirip tampilan sidebar phpMyAdmin. |
| FR-6.2 | Untuk setiap database, sistem menampilkan informasi ringkas: **nama database**, **jumlah tabel**, **ukuran total** (size), dan **tanggal backup terakhir** (jika ada). |
| FR-6.3 | User dapat mengklik salah satu database untuk melihat **daftar tabel** di dalamnya, beserta jumlah baris (row count) dan ukuran per tabel. |
| FR-6.4 | User dapat melihat **struktur tabel** (nama kolom, tipe data, key) tanpa perlu membuka phpMyAdmin secara terpisah — *bersifat read-only* (tidak untuk edit data, cukup untuk keperluan monitoring & referensi sebelum memilih database yang akan di-backup). |
| FR-6.5 | Dari halaman Database Explorer ini, user dapat langsung memilih database mana yang ingin ditambahkan ke konfigurasi backup (terintegrasi dengan FR-2 — Pemilihan Database yang Dibackup), tanpa harus pindah halaman. |
| FR-6.6 | Data list database diambil secara real-time dari MySQL server (query seperti `SHOW DATABASES`, `information_schema.TABLES`, dsb.), bukan dari cache statis, agar selalu sesuai kondisi terkini. |

> **Catatan:** Fitur ini bersifat **read-only viewer** untuk kebutuhan monitoring dan kemudahan konfigurasi backup — bukan pengganti penuh phpMyAdmin (tidak ada fitur edit/insert/delete data atau query SQL manual di versi ini).

### 5.7 Halaman Pengaturan (Settings)
| ID | Requirement |
|---|---|
| FR-7.1 | Tersedia halaman settings terpusat berisi: jadwal, pemilihan database, retention policy, dan lokasi penyimpanan file backup. |
| FR-7.2 | Perubahan settings tersimpan dan langsung berlaku untuk eksekusi backup berikutnya. |

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Reliability** | Proses backup tidak boleh mengganggu performa aplikasi utama yang sedang berjalan (dijalankan secara async/background job). |
| **Security** | Kredensial koneksi database (host, user, password) disimpan secara aman (environment variable / encrypted config), tidak hardcoded. |
| **Storage Management** | Sistem harus memvalidasi ketersediaan disk space sebelum menjalankan backup untuk menghindari kegagalan akibat storage penuh. |
| **Auditability** | Semua aktivitas backup (sukses/gagal/dihapus) tercatat dengan timestamp di tabel `backup_logs` untuk keperluan audit. |
| **Usability** | Dashboard harus mudah dipahami oleh non-technical admin sekalipun (status jelas: hijau = sukses, merah = gagal). |
| **Maintainability** | Dump `.sql` disusun ulang secara **murni-JS via `mysql2`** (`dumpDatabaseJS`) — `DROP TABLE IF EXISTS` + `SHOW CREATE TABLE` + `INSERT` ber-*batch* — sehingga tetap kompatibel & mudah di-restore **tanpa** dependensi biner `mysqldump`. *(Lihat catatan revisi & rencana refactor di §9.)* |
| **Authentication** | Akses dashboard dilindungi login single-admin berbasis JWT. **Catatan refactor:** proteksi saat ini masih di sisi klien — refactor wajib menambahkan gerbang server-side (lihat §9). |

---

## 7. Alur Proses (High-Level Flow)

**Automated Backup:**
1. Scheduler (cron job di backend SolidStart) memeriksa jadwal yang aktif.
2. Saat waktu eksekusi tercapai, sistem mengambil daftar database sesuai konfigurasi (spesifik atau all).
3. Sistem mengecek ketersediaan disk (`MIN_FREE_SPACE = 100 MB`), lalu membuat **satu folder baru** dengan nama sesuai tanggal & waktu eksekusi backup (misal `2026-07-28_020000`).
4. Untuk setiap database yang dipilih, sistem menjalankan `dumpDatabaseJS` — enumerasi tabel (`SHOW FULL TABLES`, view dilewati), tulis `DROP TABLE IF EXISTS` + `SHOW CREATE TABLE`, lalu `INSERT` ber-*batch* — dan menyimpan hasilnya sebagai file `.sql` mentah **di dalam folder tersebut** (misal `nama_db.sql`).
5. Sistem mengecek retention policy — jika jumlah **folder backup** yang tersimpan melebihi batas maksimum yang disetting user, **folder backup paling lama** (diurutkan leksikografis) dihapus beserta seluruh isinya, dan penghapusan dicatat sebagai log `type='retention'`.
6. Hasil (sukses/gagal) dicatat ke log/riwayat, termasuk nama folder backup yang dihasilkan.
7. Dashboard ter-update otomatis menampilkan status terbaru.

**Manual Backup:**
1. User membuka dashboard, klik tombol "Backup Sekarang".
2. User memilih database yang ingin di-backup (atau gunakan default).
3. Sistem menjalankan proses backup sama seperti alur otomatis (langkah 3–7 di atas), dengan tipe log "Manual".

---

## 8. Pertimbangan Teknis (Technical Notes)

- **Scheduler (implementasi aktual)**: Menggunakan **`node-cron` in-process** yang berjalan di server SolidStart. Modul `server/services/scheduler.ts` menyimpan task aktif dalam `activeTasks: Map`, membangun ekspresi cron via `buildCronExpression` (harian/mingguan/bulanan), dan `syncSchedules()` membangun ulang seluruh task dari tabel `backup_schedules` setiap kali settings/schedule berubah. Pilihan in-process ini dipilih ketimbang cron OS agar jadwal tetap portabel antara lokal (XAMPP) dan deployment server.
- **Eksekusi backup (implementasi aktual)**: **Bukan** `mysqldump` via child process. Dump disusun ulang murni di JavaScript menggunakan `mysql2` (`dumpDatabaseJS` di `server/services/backup.ts`) — baris di-*escape* manual, dikelompokkan (batchSize 1000), dan di-*flush* ke file tiap 100 baris atau 45.000 byte. Konsekuensi refactor: pendekatan ini portabel (tidak butuh biner eksternal) tapi lebih lambat untuk data besar — lihat §9.
- **Kontrol konkurensi**: Flag in-memory `backupRunning` mencegah backup ganda; `POST /api/backup` mengembalikan **409** bila backup sedang berjalan. *(Catatan: flag ini hanya berlaku per-proses; multi-instance butuh lock eksternal.)*
- **Penyimpanan konfigurasi (implementasi aktual)**: Disimpan di database internal `backup_automation` dengan tiga tabel — `backup_settings` (singleton `id=1`), `backup_schedules`, dan `backup_logs` — dibuat idempoten oleh `server/db/init.ts`. Aplikasi memakai dua pool: `pool` (terikat ke `backup_automation`) dan `rootPool` (tanpa default DB, untuk query lintas-database seperti Explorer & enumerasi target backup).
- **Lokasi file backup**: Folder lokal di server (misal `/storage/backups/`), dengan struktur **satu folder per eksekusi backup**, diberi nama sesuai timestamp eksekusi (format: `{YYYY-MM-DD_HHmmss}/`). Di dalam folder tersebut berisi seluruh file `.sql` dari database yang di-backup pada eksekusi itu, dengan nama file `{nama_db}.sql`.
  - Contoh struktur:
    ```
    /storage/backups/
      ├── 2026-07-26_020000/
      │     ├── db_utama.sql
      │     └── db_logging.sql
      ├── 2026-07-27_020000/
      │     ├── db_utama.sql
      │     └── db_logging.sql
      └── 2026-07-28_020000/
            ├── db_utama.sql
            └── db_logging.sql
    ```
  - Retention policy bekerja di **level folder**, bukan di level file — saat jumlah folder melebihi batas setting user, folder paling lama (beserta seluruh isi `.sql` di dalamnya) dihapus otomatis.

---

## 9. Keputusan Terselesaikan & Agenda Refactor

> Di v1.0 bagian ini berjudul *"Open Questions"*. Karena aplikasi sudah berjalan (baseline commit `2427dbe`), pertanyaan-pertanyaan tersebut kini **sudah terjawab oleh kode**. Berikut keputusan aktual beserta catatan yang harus diperhatikan saat refactor.

### 9.1 Keputusan yang sudah tertanam di kode

| # | Pertanyaan v1.0 | Keputusan aktual (per kode) |
|---|---|---|
| 1 | Notifikasi saat backup gagal? | **Dashboard saja** untuk v1 — status sukses/gagal terlihat di *Activity Log* & kartu statistik. Notifikasi email/Telegram tetap di [Future Enhancements](#10-future-enhancements-fase-berikutnya---opsional). |
| 2 | File backup perlu di-*compress*? | **Belum** — output berupa `.sql` **mentah tanpa kompresi**. Kompresi (gzip/zip) menjadi kandidat refactor (§9.2). |
| 3 | Multiple user/role atau single admin? | **Single admin** — sudah ada login berbasis **JWT HS256** (kredensial di `backup_settings`). Multi-user/role tidak diimplementasikan. |
| 4 | Tetap lokal (XAMPP) atau di-deploy? | **Keduanya** — dirancang jalan di lokal (XAMPP) maupun di-deploy. Scheduler memakai **`node-cron` in-process** (bukan cron OS) agar portabel di kedua lingkungan. |

### 9.2 Agenda refactor (celah yang wajib ditutup)

Temuan dari audit kode ([FEATURES.md §9](FEATURES.md) & §11) yang harus ditangani refactor, diurut berdasar dampak:

- 🔴 **Gerbang auth server-side (kritis).** Saat ini **tidak ada** middleware auth di server — hanya `GET /api/auth/session` yang memverifikasi JWT. Semua endpoint lain (`settings`, `schedules`, `databases`, `backup`, `logs`, `download`, `delete-backup`) **bisa diakses tanpa sesi**; proteksi hanya di klien (`app.tsx`). Refactor **wajib** menambahkan gerbang server-side.
- 🔴 **Password admin plaintext.** `admin_password` dibandingkan langsung (default `admin123`), bukan di-*hash*. Ganti ke hashing teruji (argon2/bcrypt).
- 🟠 **`JWT_SECRET` fallback random per proses.** Bila `JWT_SECRET` tidak diset, kunci di-*generate* acak tiap start → semua sesi invalid tiap restart. Jadikan wajib & persisten; pertimbangkan library JWT teruji ketimbang implementasi manual.
- 🟠 **Fallback disk simulatif.** *Worst-case* `disk.ts` mengembalikan nilai simulasi 5 GB/100 GB → backup bisa lolos di disk penuh bila `statfs` gagal. Ganti agar gagal dengan aman.
- 🟡 **Strategi dump.** Dump murni-JS portabel tapi lambat untuk data besar; evaluasi *streaming* atau opsi `mysqldump` native yang sebenarnya.
- 🟡 **Kompresi output** `.sql` (gzip) untuk hemat disk (jawaban #2 di atas).
- 🟡 **Normalisasi bahasa UI** — halaman `backups/index.tsx` berbahasa Indonesia, sisanya Inggris; pilih satu (idealnya i18n).

Untuk daftar utang teknis lengkap & prioritas, lihat [FEATURES.md §11](FEATURES.md).

---

## 10. Future Enhancements (Fase Berikutnya - Opsional)

- Backup otomatis ke cloud storage (Google Drive/S3/Dropbox).
- Notifikasi via email/Telegram saat backup sukses/gagal.
- Fitur restore database langsung dari dashboard.
- Enkripsi file backup.
- Compress backup file (`.zip`/`.gz`).
- Multi-user role & permission untuk akses dashboard backup.

---

## 11. Success Metrics

| Metrik | Target |
|---|---|
| Tingkat keberhasilan backup otomatis | ≥ 99% berhasil sesuai jadwal |
| Downtime akibat proses backup | 0 (tidak mengganggu aplikasi utama) |
| Waktu yang dihemat dari proses manual | Signifikan (backup manual per DB tidak perlu dilakukan lagi) |
| Kegagalan retention policy (file tidak terhapus sesuai aturan) | 0 kasus |

---

## 12. Lampiran: Ringkasan Fitur Utama

- ✅ Auto backup `.sql` (harian/mingguan/tanggal spesifik)
- ✅ Pilih database spesifik atau backup semua database
- ✅ Tombol backup manual (on-demand)
- ✅ Retention policy berbasis **folder per tanggal backup** — auto-delete folder backup terlama saat melebihi batas (default 10, dapat diatur user)
- ✅ Dashboard monitoring (riwayat, status, download, log error)
- ✅ Database Explorer/Viewer (lihat daftar database, tabel, struktur — mirip phpMyAdmin, read-only)
