# Setup Aplikasi BackupDB (Lokal - Windows & Linux Server)

Panduan instalasi dan setup otomatis aplikasi **BackupDB** di lingkungan produksi menggunakan Windows Server dan Linux Server, agar aplikasi otomatis berjalan saat server menyala (*startup/boot*).

---

## Prasyarat Umum

1. **Node.js** (Versi 24 atau lebih tinggi) — [Unduh Node.js](https://nodejs.org/en/download)
2. **Database MySQL** (Sebagai target backup & penyimpanan pengaturan) — [Unduh MySQL](https://dev.mysql.com/downloads/installer/)
3. **mysqldump** (Utilitas bawaan MySQL untuk mengekspor database — biasanya terinstal bersama MySQL server/client).
4. **PM2** (Process Manager untuk Node.js) - *Sangat direkomendasikan* — [Panduan PM2](https://pm2.keymetrics.io/)

---

## Langkah 1: Persiapan Aplikasi & File `.env`

1. **Clone/Salin Project** ke direktori server tujuan (contoh: `C:\apps\backupdb` atau `/opt/backupdb`).
2. **Install Dependensi**:
   ```bash
   # Menggunakan pnpm
   pnpm install
   
   # Atau menggunakan npm
   npm install --omit=dev
   ```
3. **Build Aplikasi** untuk mode produksi:
   ```bash
   pnpm build
   # atau
   npm run build
   ```
4. **Buat File `.env`**:
   Salin `.env.example` menjadi `.env` lalu sesuaikan isinya ke database produksi:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password_produksi_anda
   MYSQLDUMP_PATH=C:/xampp/mysql/bin/mysqldump.exe  # Sesuaikan path di Windows
   BACKUP_DIR=C:/backups                           # Direktori tujuan backup
   ```
   *Catatan untuk Linux:* Ubah `MYSQLDUMP_PATH` ke `/usr/bin/mysqldump` (atau hasil dari command `which mysqldump`).

---

## Langkah 2: Setup di Windows Server (Auto-Restart)

Ada dua metode utama agar aplikasi langsung menyala saat server restart di Windows Server.

### Metode A: Menggunakan PM2 dan pm2-windows-service (Direkomendasikan)

PM2 dapat dijadikan service Windows agar otomatis berjalan di background saat boot tanpa harus ada user login.

1. **Install PM2 secara global**:
   ```cmd
   npm install -g pm2
   ```
2. **Install PM2 Windows Startup Utility** (Jalankan terminal sebagai **Administrator**):
   ```cmd
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
3. **Jalankan aplikasi** menggunakan PM2 dari direktori aplikasi:
   ```cmd
   pm2 start .output/server/index.mjs --name "backupdb"
   ```
4. **Simpan konfigurasi** agar PM2 memuat ulang aplikasi setelah restart:
   ```cmd
   pm2 save
   ```

### Metode B: Menggunakan Task Scheduler (Alternatif Tanpa PM2)

1. Buka **Task Scheduler** di Windows Server.
2. Klik **Create Basic Task**.
3. Beri nama (contoh: `BackupDB-Startup`).
4. Pada bagian **Trigger**, pilih **When the computer starts**.
5. Pada bagian **Action**, pilih **Start a program**.
6. Isi kolom program/script dengan path Node.js dan argumen aplikasi:
   * **Program/script**: `node` (atau path absolut seperti `C:\Program Files\nodejs\node.exe`)
   * **Add arguments**: `C:\path-ke-aplikasi\.output\server\index.mjs`
   * **Start in**: `C:\path-ke-aplikasi` (direktori utama aplikasi Anda)
7. Pada tab **General** di properti task:
   * Pilih opsi **Run whether user is logged on or not**.
   * Centang **Run with highest privileges**.
8. Simpan dan masukkan kredensial Administrator Windows.

---

## Langkah 3: Setup di Linux Server (Auto-Restart)

Dua metode standar industri untuk Linux (Ubuntu/Debian/CentOS/RHEL).

### Metode A: Menggunakan Systemd Service (Sangat Stabil & Direkomendasikan)

Systemd adalah pengelola sistem bawaan pada mayoritas distribusi Linux modern.

1. Buat file service baru di `/etc/systemd/system/backupdb.service`:
   ```bash
   sudo nano /etc/systemd/system/backupdb.service
   ```
2. Isi file dengan konfigurasi berikut (sesuaikan path `/opt/backupdb` dan user `ubuntu`):
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
3. Reload systemd daemon:
   ```bash
   sudo systemctl daemon-reload
   ```
4. Aktifkan service agar berjalan otomatis saat boot:
   ```bash
   sudo systemctl enable backupdb
   ```
5. Jalankan service saat ini juga:
   ```bash
   sudo systemctl start backupdb
   ```
6. Cek status service:
   ```bash
   sudo systemctl status backupdb
   ```

### Metode B: Menggunakan PM2 (Cepat & Praktis)

1. **Install PM2 secara global**:
   ```bash
   sudo npm install -g pm2
   ```
2. **Jalankan aplikasi**:
   ```bash
   pm2 start .output/server/index.mjs --name "backupdb"
   ```
3. **Generate startup script**:
   ```bash
   pm2 startup
   ```
   *Command di atas akan menghasilkan sebuah perintah konfigurasi sistem (biasanya menggunakan `sudo env PATH=...`). Copy dan jalankan perintah tersebut.*
4. **Simpan konfigurasi** proses PM2 saat ini:
   ```bash
   pm2 save
   ```

---

## Verifikasi Pengujian

Untuk memastikan auto-restart bekerja sempurna:
1. Pastikan database MySQL lokal/produksi sudah menyala.
2. Lakukan restart pada server (Windows/Linux).
3. Setelah server kembali online (tanpa melakukan login manual ke GUI/SSH jika menggunakan PM2 service / Systemd), coba akses endpoint aplikasi di browser (default port SolidStart biasanya `3000`, atau port yang Anda konfigurasikan).
4. Periksa log backup otomatis di dashboard untuk memastikan scheduler database berjalan dengan benar.
