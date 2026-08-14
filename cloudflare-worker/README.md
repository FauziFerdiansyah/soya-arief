# Cloudflare Worker Kalender

Worker ini membaca dokumen publik Firestore `settings/siteContent`, membuat ICS, lalu mengirimkannya sebagai file kalender dengan pengingat satu hari.

## Deploy lewat Dashboard Cloudflare

1. Masuk ke https://dash.cloudflare.com/ lalu buka **Workers & Pages**.
2. Pilih **Create** → **Worker** (atau **Start with Hello World**).
3. Beri nama `soya-arief-calendar`, lalu deploy Worker awal.
4. Buka **Edit code**, hapus kode contoh, lalu salin seluruh isi `worker.js`.
5. Pilih **Save and deploy**.
6. Buka endpoint production:
   `https://soya-arief-calendar.fetruzie2.workers.dev/soya-arief-wedding.ics`
7. File `soya-arief-wedding.ics` harus terunduh dan berisi data acara terbaru.

Variabel tidak wajib karena project ID dan cache memiliki fallback. Bila ingin mengaturnya di Dashboard, tambahkan:

- `FIREBASE_PROJECT_ID` = `wedding-arief-soya`
- `CACHE_SECONDS` = `60`

Setelah URL berhasil, isi `VITE_CALENDAR_WORKER_URL` pada `.env.local` dan GitHub Actions variable dengan URL lengkap pada langkah 6, lalu build/deploy website kembali.
