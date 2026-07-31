# Setup Aplikasi BackupDB (Lokal - Windows & Linux Server)

Panduan instalasi dan setup otomatis aplikasi **BackupDB** di lingkungan produksi menggunakan Windows Server dan Linux Server, agar aplikasi otomatis berjalan saat server menyala (*startup/boot*).

---

## Prasyarat Umum

1. **Node.js** (Versi 24 atau lebih tinggi) — [Unduh Node.js](https://nodejs.org/en/download)
2. **Database MySQL** (Sebagai target backup & penyimpanan pengaturan) — [Unduh MySQL](https://dev.mysql.com/downloads/installer/)
3. **pnpm** (Package manager direkomendasikan) — `npm install -g pnpm`
4. **PM2** atau **Systemd** (Process Manager untuk auto-restart di server produksi)

---

## Langkah 1: Persiapan Aplikasi & File `.env`

1. **Clone / Salin Project** ke direktori server tujuan (contoh: `C:\apps\backupdb` atau `/opt/backupdb`).

2. **Install Dependensi**:
   ```bash
   pnpm install
   ```

3. **Generate `JWT_SECRET`**:
   `JWT_SECRET` wajib diisi minimal 32 karakter untuk keamanan sesi admin. Buat kunci acak dengan menjalankan perintah ini di terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   *Salin string acak yang dihasilkan untuk diisikan ke file `.env`.*

4. **Buat File `.env`**:
   Salin `.env.example` menjadi `.env` lalu isi nilainya:
   ```bash
   cp .env.example .env
   ```

   Sesuaikan isi file `.env`:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password_mysql_produksi_anda
   JWT_SECRET=hasil_generate_string_acak_minimal_32_karakter
   BACKUP_DIR=./backups
   ```

5. **Build Aplikasi Production**:
   ```bash
   pnpm build
   ```
   *Perintah ini akan memverifikasi TypeScript dan menghasilkan output build produksi di folder `.output/`.*

---

## Langkah 2: Setup di Windows Server (Auto-Restart)

### Metode A: Menggunakan PM2 (Sangat Direkomendasikan)

1. **Install PM2 secara global**:
   ```cmd
   npm install -g pm2
   ```

2. **Install PM2 Windows Startup Utility** (Jalankan terminal sebagai **Administrator**):
   ```cmd
   npm install -g pm2-windows-startup
   pm2-startup install
   ```

3. **Jalankan aplikasi** dari root folder proyek:
   ```cmd
   pm2 start .output/server/index.mjs --name "backupdb"
   ```

4. **Simpan konfigurasi** agar PM2 otomatis memuat ulang aplikasi setelah restart server:
   ```cmd
   pm2 save
   ```
   
---

### Metode B: Menggunakan Task Scheduler (Alternatif Tanpa PM2)

1. Buka **Task Scheduler** di Windows Server.
2. Klik **Create Basic Task** → Beri nama (contoh: `BackupDB-Startup`).
3. Trigger: Pilih **When the computer starts**.
4. Action: Pilih **Start a program**.
5. Konfigurasi Action:
   * **Program/script**: `node` (atau path absolut `C:\Program Files\nodejs\node.exe`)
   * **Add arguments**: `C:\path-ke-aplikasi\.output\server\index.mjs`
   * **Start in**: `C:\path-ke-aplikasi` (direktori utama aplikasi Anda)
6. Di tab **General**:
   * Pilih **Run whether user is logged on or not**.
   * Centang **Run with highest privileges**.
7. Simpan dan masukkan kredensial Administrator Windows.

---

## Langkah 3: Setup di Linux Server (Auto-Restart)

### Metode A: Menggunakan Systemd Service (Rekomendasi Produksi)

1. Buat file service `/etc/systemd/system/backupdb.service`:
   ```bash
   sudo nano /etc/systemd/system/backupdb.service
   ```

2. Isi dengan konfigurasi berikut (sesuaikan `User` dan `WorkingDirectory`):
   ```ini
   [Unit]
   Description=BackupDB Automation Application
   After=network.target mysql.service

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/opt/backupdb
   ExecStart=/usr/bin/node .output/server/index.mjs
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

3. Aktifkan dan jalankan service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable backupdb
   sudo systemctl start backupdb
   ```

4. Cek status service:
   ```bash
   sudo systemctl status backupdb
   ```

---

### Metode B: Menggunakan PM2

1. **Install PM2 secara global**:
   ```bash
   sudo npm install -g pm2
   ```

2. **Jalankan aplikasi**:
   ```bash
   pm2 start .output/server/index.mjs --name "backupdb"
   ```

3. **Set Startup & Simpan**:
   ```bash
   pm2 startup
   # (Jalankan perintah sudo env PATH=... yang ditampilkan oleh PM2)
   pm2 save
   ```

---

## Langkah 4: Verifikasi & Login Pertama

1. Pastikan server MySQL berjalan.
2. Akses aplikasi melalui browser di port aplikasi (default SolidStart: `http://localhost:3000` atau port yang Anda tentukan).
3. Database `backup_automation` dan tabel pendukung akan **otomatis dibuat** saat aplikasi pertama kali menyala.
4. **Login Pertama kali**:
   * **Username:** `admin`
   * **Password:** `admin123`
5. Masuk ke menu **Settings** → **Admin Security** untuk segera mengganti password default dengan password baru demi keamanan.
