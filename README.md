# DSD SDS JATIM 97/98 — PWA Tahap 1

## Isi versi ini
- Pilih wilayah dan nama operator (tanpa akun pada uji coba lokal).
- Formulir pelayanan ambulans dengan format DSD SDS.
- Nomor laporan otomatis.
- Penyimpanan lokal menggunakan IndexedDB.
- Draf formulir disimpan otomatis agar tidak mudah hilang ketika halaman tertutup/ter-refresh.
- Riwayat laporan.
- Pencatatan pemasukan/pengeluaran per laporan pelayanan.
- Bagikan laporan dan ringkasan keuangan melalui WhatsApp.
- Service Worker untuk membuka app shell saat offline.

## Batasan penting
Versi ini adalah **prototipe lokal/offline tahap 1**. Belum terhubung ke Supabase, belum mengirim data ke admin pusat, belum ada autentikasi admin, dan belum ada sinkronisasi lintas perangkat. Data tersimpan di browser/perangkat yang digunakan. Jangan gunakan untuk menyimpan data pasien nyata atau data keuangan operasional sebelum database pusat, autentikasi, kebijakan akses, dan pencadangan diuji.

## Deploy ke Cloudflare Pages
Repository ini berupa HTML/CSS/JavaScript statis, bukan Worker Wrangler.
1. Cloudflare Dashboard → Workers & Pages → Create application → **Pages** → Connect to Git.
2. Pilih repository `ambulancegratispasuruan-ops/aplikasi-pwa`.
3. Production branch: `main`.
4. Framework preset: None.
5. Build command: kosongkan (tidak ada proses build).
6. Build output directory: `.` (root repository; pastikan `index.html` ada di root).
7. Root directory / Path: `/`.
8. Deploy melalui Pages.

Jangan gunakan layar konfigurasi Worker yang meminta `npx wrangler deploy` untuk paket statis ini.

## Langkah uji
1. Buka aplikasi melalui HTTPS.
2. Pilih Pasuruan dan isi nama operator.
3. Buat laporan uji dengan data fiktif.
4. Pastikan laporan muncul di Riwayat.
5. Bagikan laporan ke WhatsApp (jangan kirim data fiktif ke grup operasional).
6. Tambahkan transaksi uji dan cek ringkasan.
7. Matikan internet, tutup dan buka kembali aplikasi setelah pernah dibuka online; uji akses shell dan data lokal.

## Rencana tahap 2
- Buat proyek Supabase.
- Buat tabel wilayah, operator, laporan pelayanan, transaksi, dan audit log.
- Aktifkan Row Level Security untuk semua tabel yang terekspos.
- Tambahkan autentikasi admin pusat.
- Tambahkan antrean sinkronisasi yang aman dan idempotent.
- Dashboard admin pusat dan ekspor Google Sheets.
