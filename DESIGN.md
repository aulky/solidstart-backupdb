# BackupDB Design System

> **Tujuan dokumen:** Sistem desain nyata untuk aplikasi **BackupDB** (`automation-backupdb`), diambil langsung dari token di `src/app.css` dan pola UI di komponen `.tsx`. Dokumen ini **menggantikan** template lama "CreateSpace" (agensi kreatif) yang tidak sesuai dengan aplikasi. Untuk inventaris fitur lihat [FEATURES.md](FEATURES.md); untuk kebutuhan produk lihat [PRD.md](PRD.md).

| | |
|---|---|
| **Aplikasi** | `automation-backupdb` — MySQL Backup Automation Dashboard |
| **Baseline** | commit `2427dbe` (versi 0.1) |
| **Framework UI** | SolidStart + Tailwind CSS v4 (`@import "tailwindcss"`) |
| **Ikon** | `lucide-solid` |
| **Grafik** | Chart.js via `solid-chartjs` |
| **Design language** | Dashboard operasional: bersih, tenang, *data-first*, glassmorphism halus, satu aksen crimson. |

---

## Overview

BackupDB adalah *dashboard* operasional, bukan situs marketing. Prioritas desain adalah **keterbacaan data** dan **kejelasan status**, bukan ekspresi visual. Empat prinsip inti:

1. **Tenang di latar, tegas di aksi.** Latar abu-abu sangat terang (`#F9FAFB`) dengan teks gelap (`#111827`). Warna kuat hanya untuk aksi utama dan status — bukan untuk dekorasi.
2. **Status berbicara lewat warna.** Sukses hijau, gagal merah, berjalan/retention amber, terjadwal biru, manual ungu. Warna selalu berpasangan dengan label/ikon (aksesibilitas).
3. **Glassmorphism secukupnya.** Panel kaca (`bg-white/65` + `backdrop-blur`) dipakai untuk elemen mengambang, bukan seluruh permukaan.
4. **Gerak halus.** Transisi masuk `fadeInUp` 0.4s; hover 150ms. Tidak ada animasi teatrikal.

---

## Colors

Sumber kebenaran: `src/app.css` (`--background-rgb`, `--foreground-rgb`, `.shadow-glass`) dan kelas Tailwind yang dipakai di komponen.

### Foundation (latar & permukaan)

| Token | Nilai | Kelas / Sumber | Penggunaan |
|---|---|---|---|
| Background | `#F9FAFB` (rgb 249,250,251) | `--background-rgb`, `body` | Latar halaman |
| Foreground | `#111827` (rgb 17,24,39) | `--foreground-rgb`, `body` | Warna teks utama |
| Surface / Card | `#FFFFFF` | `bg-white` | Kartu solid, tabel |
| Surface Glass | `#FFFFFF` @ 65% | `bg-white/65 backdrop-blur-[16px]` | Panel kaca mengambang |
| Nav / Sidebar | `#111827` | `bg-gray-900` | Navigasi atas *sticky* |

### Action & Accent (aksi)

| Token | Nilai | Kelas / Sumber | Penggunaan |
|---|---|---|---|
| Primary / Crimson | `#E11D48` | `bg-[#E11D48]`, ikon brand | Tombol utama, ikon brand, aksen |
| Primary Hover | `#BE123C` (rose-700) | `hover:bg-[#BE123C]` | Hover tombol utama |
| Focus / Info | `#2563EB` (blue-600) | `focus:ring-blue-500/20` | Cincin fokus input, tautan info |

Aturan: **hanya satu** warna aksi utama (crimson) per layar untuk aksi paling penting. Crimson tidak pernah dipakai untuk teks tubuh atau latar besar.

### Status (semantik)

| Status | Warna | Kelas | Catatan |
|---|---|---|---|
| Success | Emerald `#16A34A` | `text-green-600` / `bg-green-50` | Backup berhasil |
| Failed | Rose `#DC2626` | `text-red-600` / `bg-red-50` | Backup gagal |
| Running | Amber | `text-amber-600` + `animate-pulse` | Sedang berjalan (berdenyut) |
| Retention | Amber | `bg-amber-100 text-amber-700` | Job penghapusan FIFO |
| Scheduled | Blue | `bg-blue-100 text-blue-700` | Job terjadwal (cron) |
| Manual | Purple | `bg-purple-100 text-purple-700` | Backup manual |

Setiap warna status **selalu** disertai label teks dan/atau ikon `lucide-solid` — warna tidak pernah menjadi satu-satunya pembawa makna.

---

## Typography

| Peran | Font | Sumber | Penggunaan |
|---|---|---|---|
| Body | **DM Sans** | `body { font-family: 'DM Sans', sans-serif }` | Teks default seluruh aplikasi |
| Headline | **Poppins** | Google Fonts | Judul halaman, angka besar StatCard |
| Mono | **Fira Code** | Google Fonts | Nama folder backup, SQL, path, log |

Skala teks (kelas utilitas kustom):

| Kelas | Peran |
|---|---|
| `text-h1` | Judul halaman |
| `text-h2` | Judul seksi |
| `text-h3` | Sub-judul / judul kartu |
| `text-body-lg` | Teks penekanan |
| `text-caption` | Label kecil, metadata, timestamp |

Pedoman: angka metrik (ukuran disk, jumlah backup) memakai Poppins agar menonjol; identitas teknis (nama folder `{YYYY-MM-DD_HHmmss}`, query) memakai Fira Code.

---

## Spacing

Basis **8px**. Gunakan kelipatan skala Tailwind (`2 = 8px`, `4 = 16px`, `6 = 24px`, `8 = 32px`). Padding kartu standar `p-6`; jarak antar kartu `gap-6`; padding dalam modal `p-8`.

---

## Border Radius

| Elemen | Radius | Kelas |
|---|---|---|
| Kartu | 16px | `rounded-2xl` |
| Modal / Dialog | 24px | `rounded-3xl` |
| Pill / Chip status | penuh | `rounded-full` (9999px) |
| Input / Tombol | 12px | `rounded-xl` |

---

## Elevation

| Level | Nilai | Kelas / Sumber | Penggunaan |
|---|---|---|---|
| Glass | `0 8px 32px rgba(0,0,0,0.08)` | `.shadow-glass` | Panel kaca mengambang |
| Card | `0 8px 32px rgba(0,0,0,0.03)` | `shadow-[0_8px_32px_rgba(0,0,0,0.03)]` | Kartu solid biasa |
| Modal | overlay `bg-black/40 backdrop-blur-sm` | Portal | Latar gelap di belakang dialog |

Bayangan selalu lembut dan lebar (blur besar, alpha rendah) — kesan mengambang tenang, bukan tegas.

---

## Components

### Buttons
- **Primary:** `bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl` — satu per konteks (mis. "Backup Sekarang", "Simpan").
- **Secondary:** `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50` — aksi sekunder.
- **Ghost:** `text-gray-600 hover:bg-gray-100` — aksi tersier/ikon.
- **Destructive:** `text-red-600 hover:bg-red-50` — hapus folder/jadwal (konfirmasi wajib).

### Cards
- **Plain:** `bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-6` — tabel, daftar log.
- **Glass:** `bg-white/65 backdrop-blur-[16px] border border-white/30 rounded-2xl shadow-glass` — panel mengambang (mis. ringkasan disk).

### Inputs
`bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500` — cincin fokus **biru** (bukan crimson) agar tidak tertukar dengan aksi.

### StatusChip
Pill `rounded-full` dengan pasangan `bg-{warna}-100 text-{warna}-700` sesuai tabel Status; ikon `lucide-solid` di kiri, label di kanan. `Running` menambah `animate-pulse`.

### StatCard
Kartu plain berisi ikon aksen, angka besar (Poppins), dan label caption. Dipakai untuk metrik ringkas (total backup, ukuran disk, jadwal aktif).

### Dialog / Modal
Dirender via `Portal` di atas overlay `bg-black/40 backdrop-blur-sm`. Kotak `rounded-3xl bg-white/95 p-8 shadow-glass`, lebar `max-w-lg`. Masuk dengan `animate-fade-in-up`.

### ScheduleForm
Form pengaturan cron (frekuensi, waktu, target database). Input mengikuti pola cincin fokus biru; tombol simpan primary crimson.

### DatabaseSelector
Daftar pilih database dari `rootPool` (lintas-DB). Item terpilih memakai aksen crimson tipis; menyembunyikan `SYSTEM_DBS` (`information_schema`, `mysql`, `performance_schema`, `sys`).

---

## Animation

| Nama | Definisi | Kelas |
|---|---|---|
| `fadeInUp` | opacity 0→1, `translateY(12px)`→0 | `@keyframes fadeInUp` |
| Fade-in-up | `animation: fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards` | `.animate-fade-in-up` |
| Running pulse | denyut opacity | `animate-pulse` |

Hover/transisi umum: 150ms. Elemen konten (kartu, modal, baris) masuk dengan `fadeInUp`. Tidak ada parallax, tidak ada animasi dekoratif.

---

## Scrollbars

| Target | Lebar | Thumb | Hover |
|---|---|---|---|
| `.scrollbar-thin` | 5px | `rgba(226,232,240,0.65)` | `rgba(203,213,225,0.85)` |
| `html` (global) | 10px | `rgba(226,232,240,0.6)`, border `2px solid #f9fafb` | — |

Radius thumb `9999px`. Scrollbar tipis dipakai di panel data padat (log, explorer); scrollbar global untuk halaman.

---

## Layout

- **Container:** `max-w-7xl mx-auto` untuk Dashboard, Backups, Explorer; `max-w-4xl` untuk Settings.
- **Navigasi:** bar atas gelap `bg-gray-900` *sticky*, brand **"BackupDB"** dengan kotak ikon `#E11D48`.
- **Grid:** kartu metrik `grid gap-6` responsif (`sm:grid-cols-2 lg:grid-cols-4`).
- **Padding halaman:** `px-4 sm:px-6 lg:px-8 py-8`.

---

## Do's & Don'ts

**Do**
- Gunakan crimson **hanya** untuk satu aksi utama per konteks.
- Pasangkan setiap warna status dengan ikon + label teks.
- Pakai Fira Code untuk identitas teknis (folder, path, SQL, log).
- Jaga latar tetap tenang (`#F9FAFB`); biarkan data yang menonjol.
- Gunakan glass untuk elemen mengambang, plain-card untuk tabel padat.

**Don't**
- Jangan pakai crimson untuk teks tubuh atau latar besar.
- Jangan andalkan warna saja untuk menyampaikan status.
- Jangan pakai cincin fokus crimson pada input (fokus = biru).
- Jangan tumpuk banyak lapisan kaca hingga teks sulit dibaca.
- Jangan tambahkan animasi teatrikal — ini dashboard operasional.

---

*Dokumen ini mengikuti kode aktual pada baseline commit `2427dbe`. Jika token di `src/app.css` atau pola komponen berubah saat refactor, perbarui dokumen ini agar tetap menjadi sumber kebenaran desain.*
