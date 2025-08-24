# NEMAFI BE

Backend API untuk aplikasi nemafi.

## Prasyarat

- Node.js (versi 18 atau lebih baru direkomendasikan)
- npm atau yarn
- PostgreSQL

## Langkah Instalasi

1. **Clone repository**
   ```bash
   git clone https://github.com/janbu12/nemafi-be.git
   cd nemafi-be
   ```

2. **Install dependencies**
   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Copy file environment**
   ```bash
   cp .env.example .env
   ```
   Edit file `.env` sesuai konfigurasi database lokal Anda.

4. **Prisma Setup**
   - Pastikan PostgreSQL berjalan.
   - Buat database sesuai dengan `DATABASE_URL` di file `.env`.
   - Jalankan migrasi (jika menggunakan Prisma):
     ```bash
     npx prisma generate
     npx prisma migrate dev --name init
     ```

5. **Jalankan aplikasi**
   ```bash
   npm run dev
   # atau
   yarn dev
   ```

6. **Akses API**
   - API dapat diakses di `http://localhost:3000/api` (atau port yang Anda set di `.env`).

## Skrip Penting

- `npm run dev` — Menjalankan server dalam mode development.
- `npm run build` — Build aplikasi untuk production.
- `npm start` — Menjalankan server hasil build.

## Struktur Folder

- `src/` — Source code utama
- `.env` — Konfigurasi environment
- `prisma/` — Skema dan migrasi database (jika ada)

## Catatan

- Pastikan environment variable sudah benar sebelum menjalankan aplikasi.
- Untuk pengembangan lebih lanjut, cek dokumentasi pada setiap folder/module.

