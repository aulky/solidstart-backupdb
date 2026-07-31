# BackupDB — MySQL Backup Automation Dashboard

**BackupDB** adalah dashboard web full-stack terintegrasi untuk otomatisasi pencadangan (*backup*), rotasi retensi (FIFO), eksplorasi data (*read-only Explorer*), dan pemantauan (*monitoring*) database MySQL. Dibangun berbasis **SolidStart** (Solid.js + Nitro) untuk memberikan performa ultra-cepat, antarmuka modern, dan kemudahan eksekusi tanpa dependensi biner eksternal.

---

## Fitur Utama

1. **Dashboard Monitoring Real-Time**:
   - Visualisasi tren backup (sukses/gagal) 30 hari via grafik Chart.js.
   - Metrik kapasitas disk (ruang bebas, total terpakai, jumlah folder backup).
   - Polling status eksekusi backup real-time (indikator *Running* amber pulse).
2. **Server-Side Authentication & Keamanan Ketat**:
   - Proteksi gerbang server-side (`requireAuth`) di seluruh API endpoint.
   - Token JWT berbasis standar RFC (`jose`, HS256, 24 jam) dengan cookie `HttpOnly; SameSite=Lax`.
   - Hashing password administrator menggunakan **bcrypt**.
   - Sanitasi input identifier nama DB/tabel dengan allowlist regex untuk **mencegah SQL Injection**.
   - Validasi path traversal & sanitasi filename pada endpoint download/delete.
3. **Dump Engine Murni-JS (Portabel)**:
   - Pencadangan disusun langsung di JavaScript via `mysql2` (`dumpDatabaseJS`) menggunakan `DROP TABLE`, `SHOW CREATE TABLE`, dan *batching INSERT* (1.000 baris / batch).
   - **Tanpa dependensi biner `mysqldump`** — aman dan portabel dijalankan di Windows maupun Linux.
4. **Rotasi Retensi FIFO (First-In, First-Out)**:
   - Hasil backup dikelompokkan ke dalam folder bernama timestamp: `{YYYY-MM-DD_HHmmss}/`.
   - Otomatis menghapus folder backup paling lama saat jumlah folder melebihi `retention_limit` (default: 10 folder).
5. **Manajemen Log & Diagnostik Error**:
   - Halaman `/backups` menampilkan daftar folder yang dapat di-expand/collapse.
   - Jika eksekusi backup pada database tertentu mengalami kegagalan, pesan error teknis lengkap dapat dilihat melalui modal **"View Error Log"**.
6. **Penjadwalan Fleksibel (In-Process `node-cron`)**:
   - Mendukung jadwal Harian, Mingguan (pilih hari), dan Bulanan (pilih tanggal) dengan waktu eksekusi spesifik.
   - Sinkronisasi otomatis runtime timer tanpa perlu restart server.
7. **Database Explorer (Read-Only)**:
   - Penelusuran daftar database, skema/struktur kolom tabel (tipe, null, key, default), serta preview 100 baris data data tabel.

---

## Tech Stack

- **Framework Full-Stack**: [SolidStart](https://start.solidjs.com) (Solid.js v1.9 + Nitro v3 + Vite 8)
- **Runtime**: Node.js >= 24
- **UI & Styling**: Tailwind CSS v4, [Lucide Solid](https://lucide.dev) (Icons), Chart.js
- **Database Driver**: `mysql2/promise` (Dual connection pool)
- **Autentikasi & Keamanan**: `jose` (JWT), `bcryptjs` (Password Hash), `zod` (Env Validation)
- **Scheduler**: `node-cron`

---

## 📂 Struktur Proyek & Tanggung Jawab Modul

```
solidstart-backupdb/
├── public/                     # Asset publik (favicon.ico & favicon.svg logo BackupDB)
├── server/                     # Backend Infrastructure & Core Services
│   ├── db/
│   │   ├── connection.ts       # Setup dual-pool MySQL: pool (DB backup_automation) & rootPool (lintas DB)
│   │   └── init.ts             # Auto-migration idempoten skema DB & seed admin
│   ├── middleware/
│   │   └── auth.ts             # Guard server-side (requireAuth)
│   ├── services/
│   │   ├── backup.ts           # Core dump engine (dumpDatabaseJS, runBackup, applyRetention)
│   │   ├── scheduler.ts        # Service cron job (node-cron, buildCronExpression, syncSchedules)
│   │   ├── disk.ts             # Disk space service (statfs, fail-safe)
│   │   ├── auth.ts             # Service JWT (signJwt, verifyJwt, getSessionFromCookie)
│   │   └── password.ts         # Utility bcrypt (hashPassword, verifyPassword)
│   ├── shared/
│   │   └── constants.ts        # Shared constants (SYSTEM_DBS, FOLDER_REGEX, sanitizeIdentifier)
│   ├── plugins/
│   │   └── bootstrap.ts        # Nitro startup plugin (auto DB init & schedule sync)
│   └── env.ts                  # Zod validation & .env file loader
├── src/                        # Frontend UI & API Routes (SolidStart)
│   ├── app.tsx                 # App Shell, Navigation, & Client Session Guard
│   ├── app.css                 # Design Tokens (Crimson #E11D48, Tailwind v4, custom scrollbars)
│   ├── entry-server.tsx        # SSR document header (Google Fonts: DM Sans, Poppins, Fira Code)
│   ├── lib/
│   │   ├── api.ts              # Client API helper (fetch wrapper)
│   │   └── format.ts           # Utility formatBytes, formatDate, timeAgo
│   ├── components/
│   │   ├── Nav.tsx             # Navbar utama (Header gelap, Brand, Link Navigasi, Logout Button)
│   │   ├── Login.tsx           # Form modal sign-in admin
│   │   ├── BackupChart.tsx     # Graphic line chart 30 hari
│   │   ├── BackupModal.tsx     # Modal trigger backup manual instan
│   │   ├── DatabaseSelector.tsx# Multi-select database target
│   │   ├── ScheduleForm.tsx    # Form CRUD aturan cron
│   │   ├── ErrorModal.tsx      # Modal viewer detail log error
│   │   └── ui text/            # Atomic UI (Dialog, StatCard, StatusChip, LoadingSpinner)
│   └── routes/
│       ├── index.tsx           # Dashboard Monitoring Utama
│       ├── backups/index.tsx   # Halaman Activity Logs & Inspection File Backup
│       ├── explorer/           # Database Explorer (DB list -> Table list -> Detail Structure/Data)
│       ├── settings.tsx        # Halaman Pengaturan (General, Security, Schedules)
│       ├── api/                # API Endpoints Server-Side (Nitro Routes)
│       └── [...404].tsx        # Custom 404 Page
├── .env.example                # Template variabel environment wajib
├── setup.md                    # Panduan deployment & auto-restart produksi (PM2 / Systemd / Task Scheduler)
└── README.md                   # Dokumentasi utama proyek
```

---

## Cara Menjalankan di Lingkungan Lokal (Development)

### 1. Prasyarat
- **Node.js** v24+
- **pnpm** (direkomendasikan) — `npm install -g pnpm`
- **MySQL Server** aktif (misal via XAMPP, Laragon, atau MySQL Standalone)

### 2. Salin & Konfigurasi File `.env`
Buat file `.env` di root folder proyek dengan menyalin `.env.example`:
```bash
cp .env.example .env
```

Isikan kredensial MySQL Anda dan buat `JWT_SECRET` (minimal 32 karakter):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
JWT_SECRET=C18ds/sxSwdh7loCIGrNGB9pWwuXjVTOXy9Jwp8q4qE=
BACKUP_DIR=./backups
```

> **Tips Generate JWT Secret di Terminal:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Install Dependensi
```bash
pnpm install
```

### 4. Jalankan Server Development
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

### 5. Login Pertama Kali
- **Username**: `admin`
- **Password**: `admin123`
*(Database `backup_automation` dan tabel pendukung akan otomatis dibuat saat server pertama kali dijalankan. Harap segera ganti password default di menu Settings!)*

---

## Build & Deployment Produksi (Windows & Linux Server)

Untuk panduan mendalam tentang build produksi, deployment di Windows Server dan Linux Server, serta pengaturan auto-restart saat server booting (*auto-boot* menggunakan PM2 atau Systemd), silakan baca **[setup.md](setup.md)**.

```bash
# Build aplikasi produksi
pnpm build

# Jalankan server hasil build
node .output/server/index.mjs
```

---

## Petunjuk untuk Developer Selanjutnya (Maintainer Guide)

Jika Anda ingin menambah atau memodifikasi fitur di proyek ini, perhatikan prinsip dasar berikut:

1. **Arsitektur Dual Pool (`server/db/connection.ts`)**:
   - `pool`: Terikat ke DB internal `backup_automation`. Gunakan ini untuk operasi pada tabel `backup_settings`, `backup_schedules`, dan `backup_logs`.
   - `rootPool`: Koneksi tanpa default DB. Gunakan ini untuk query lintas-database (seperti Database Explorer dan pencadangan database target).
2. **Server-Side Security Guard**:
   - Setiap kali menambahkan API endpoint baru di `src/routes/api/**`, **wajib** memanggil `const auth = await requireAuth(event.request); if (auth instanceof Response) return auth;` di baris pertama handler untuk mencegah akses tanpa autentikasi.
3. **Identifier Sanitization**:
   - Jangan pernah menyisipkan variabel nama database/tabel langsung ke string query tanpa validasi. Selalu gunakan `sanitizeIdentifier()` dari `server/shared/constants.ts`.
4. **Design System & Token CSS (`DESIGN.md`)**:
   - Selalu patuhi skema warna: Background `#F9FAFB`, Primary Crimson `#E11D48`, Focus Ring Input **Biru (`focus:ring-blue-500/20`)**.
   - Gunakan font Poppins untuk judul, DM Sans untuk body, dan Fira Code untuk identitas teknis (nama folder, SQL, path, log).
