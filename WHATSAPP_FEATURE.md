# Fitur WhatsApp Direct Send dari List Undangan

## ✅ Fitur yang Ditambahkan

### 1. Tombol WhatsApp di List Undangan
- Tombol hijau dengan icon WhatsApp di samping tombol "Copy Link"
- Langsung kirim undangan tanpa perlu buka tab Form Invitation
- Terintegrasi dengan template dari collection `chatInvitation`

### 2. Tracking Pengiriman WhatsApp
Setiap kali tombol WhatsApp diklik, sistem akan:
- **Update `lastSent`**: Timestamp terakhir undangan dikirim
- **Increment `sendCount`**: Jumlah total pengiriman bertambah 1
- **Update `updatedAt`**: Timestamp update terakhir

### 3. Informasi Tracking di Detail Row
Di inline detail setiap guest, ditambahkan section baru:
- **Tracking WhatsApp**
  - Terakhir Dikirim: Tanggal & waktu terakhir kirim
  - Jumlah Kirim: Total berapa kali dikirim + badge status
    - Badge "Sudah Dikirim" (biru) jika sendCount > 0
    - Badge "Belum Dikirim" (abu-abu) jika sendCount = 0

## Cara Penggunaan

### Kirim dari List Undangan:
1. Buka tab "List Undangan"
2. Klik tombol WhatsApp (hijau) di kolom aksi
3. WhatsApp Web akan terbuka dengan pesan siap kirim
4. Tracking otomatis terupdate

### Kirim dari Form Invitation:
1. Buka tab "Form Invitation"
2. Pilih tamu dari dropdown
3. Preview pesan akan muncul
4. Klik "Kirim via WhatsApp"
5. Tracking otomatis terupdate

## Struktur Data Firestore

### Collection: `guest`
Fields baru yang ditambahkan:
```javascript
{
    // ... existing fields ...
    lastSent: Timestamp,      // Terakhir dikirim via WhatsApp
    sendCount: Number,        // Total jumlah pengiriman
}
```

### Collection: `chatInvitation`
```javascript
{
    template: String,         // Template pesan
    adminKey: String,         // "F4uziGant3n9"
    updatedAt: Timestamp
}
```

## Placeholder Template

Template mendukung 2 placeholder:
- `[Nama Tamu]` → Diganti dengan nama tamu
- `[Link Undangan]` → Diganti dengan URL undangan + guest ID

Contoh:
```
Kepada Yth. [Nama Tamu]

Detail acara dapat diakses melalui:
🔗 [Link Undangan]
```

Hasil:
```
Kepada Yth. Budi Santoso

Detail acara dapat diakses melalui:
🔗 http://127.0.0.1:5500/?g=abc123xyz
```

## Format Nomor WhatsApp

Sistem otomatis format nomor:
- `0812345678` → `62812345678`
- `812345678` → `62812345678`
- `62812345678` → `62812345678` (tidak berubah)

## Fitur Keamanan

1. **Validasi Nomor**: Cek nomor HP ada sebelum kirim
2. **Disable Button**: Button disabled saat proses kirim
3. **Error Handling**: Tampilkan error jika gagal
4. **Admin Key**: Semua update ke Firestore pakai adminKey

## Update Firestore Rules

Tambahkan `lastSent` dan `sendCount` ke allowed fields di rules:

```javascript
match /guest/{guestId} {
    allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly([
        "opened",
        "openedAt",
        "lastOpenedAt",
        "openCount",
        "deviceType",
        "updatedAt",
        "rsvpStatus",
        "rsvpCount",
        "lastSent",      // ✅ Tambahkan
        "sendCount"      // ✅ Tambahkan
    ]);
    
    allow create, update: if isAdminRequest();
    allow delete: if isAdminDocument();
}
```

## Notifikasi & Feedback

### Success:
- SweetAlert: "WhatsApp Dibuka - Pesan untuk [Nama] siap dikirim!"
- Auto-reload list setelah 1 detik untuk update tracking

### Error:
- Nomor tidak ada: "Tamu ini belum memiliki nomor WhatsApp"
- Gagal kirim: "Gagal membuka WhatsApp. Coba lagi."

## Console Logging

Untuk debugging, sistem log:
- `✅ WhatsApp opened for: [nama], [nomor]`
- `✅ Send tracking updated: { guestId, sendCount }`
- `❌ Error sending WhatsApp: [error]`
- `❌ Error updating send tracking: [error]`

## Testing

1. Pastikan template sudah ada di Firestore
2. Pastikan guest punya nomor HP
3. Klik tombol WhatsApp
4. Cek WhatsApp Web terbuka dengan pesan benar
5. Cek detail row → sendCount bertambah
6. Cek detail row → lastSent terupdate

## Troubleshooting

### WhatsApp tidak terbuka:
- Cek popup blocker browser
- Cek nomor HP format benar
- Cek console untuk error

### Tracking tidak update:
- Cek Firestore rules sudah update
- Cek adminKey benar
- Cek console untuk error permission

### Template tidak muncul:
- Cek collection `chatInvitation` ada
- Cek document ID: `defaultTemplate`
- Cek field `template` ada isinya
