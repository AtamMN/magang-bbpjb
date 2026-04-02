# Magang BBPJB

Aplikasi ini dibuat sebagai baseline baru di folder `magang-bbpjb` dengan standar:

- Next.js 16 + App Router
- TypeScript strict mode
- Tailwind CSS 4
- UI style dominan Sedasa
- Kerangka logic Presensi untuk auth, routing dashboard, scan QR, dan attendance RTDB

## Struktur Utama

- `src/app` - halaman dan route API
- `src/components` - komponen UI, dashboard shell, role guard
- `src/lib/contexts` - Auth provider
- `src/lib/firebase` - firebase client/admin + attendance service
- `src/hooks` - user info hooks
- `src/types` - type definitions

## Halaman yang Sudah Disiapkan

- `/` - landing
- `/login` - login (Firebase mode + demo fallback)
- `/dashboard` - ringkasan dashboard
- `/dashboard/presensi` - tabel presensi scaffold
- `/dashboard/akun` - profil akun
- `/scanQR` - halaman scan QR + dinas luar
- `/unauthorized` - akses ditolak

## API Route Skeleton

- `POST /api/register`
- `POST /api/admin/update-email`
- `POST /api/admin/update-password`

## Environment

Salin `.env.example` ke `.env.local` lalu isi semua value Firebase.

Jika env belum diisi, aplikasi tetap dapat dipreview melalui **demo mode** pada halaman login.

## Catatan Integrasi Lanjutan

- Kontrak function attendance mengikuti pola Presensi:
  - `checkTodayAttendance(userId)`
  - `saveAttendance(userId, userName, userEmail, type, keterangan)`
  - `formatTimestampWIB(timestamp)`
- QR valid yang dipakai saat ini:
  - `PRESENSI_2025`
  - `KELUAR_2025`
- Role resolver sudah menyiapkan koleksi:
  - `accounts/sadmins`
  - `accounts/admins`
  - `accounts/users`
  - `accounts/interns`
  - `accounts/mentors`

## Menjalankan Project

```bash
npm install
npm run dev
```

Jika Node.js/NPM belum tersedia di mesin, install terlebih dahulu lalu jalankan perintah di atas.
