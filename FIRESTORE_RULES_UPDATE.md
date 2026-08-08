# Update Firestore Rules untuk Chat Invitation & Guest Tracking

## Masalah
1. Template chat invitation tidak bisa disimpan karena Firestore rules tidak mengizinkan create/update.
2. Guest tracking untuk WhatsApp (lastSent, sendCount) perlu ditambahkan ke allowed fields.

## Solusi

### Opsi 1: Update Firestore Rules (Recommended)

#### 1. Update rules untuk `chatInvitation`:

```javascript
match /chatInvitation/{docId} {
    // Semua boleh read (guest & admin)
    allow read: if true;
    
    // Admin bisa create & update
    allow create, update: if isAdminRequest();
    
    // Tidak boleh delete
    allow delete: if false;
}
```

#### 2. Update rules untuk `guest` (tambahkan lastSent dan sendCount):

```javascript
match /guest/{guestId} {
    // User publik: hanya update tracking
    allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly([
        "opened",
        "openedAt",
        "lastOpenedAt",
        "openCount",
        "deviceType",
        "updatedAt",
        "rsvpStatus",
        "rsvpCount",
        "lastSent",      // ✅ Tambahkan ini
        "sendCount"      // ✅ Tambahkan ini
    ]);
    
    // Admin create/update
    allow create, update: if isAdminRequest();
    
    // Admin delete
    allow delete: if isAdminDocument();
}
```

**Langkah-langkah:**
1. Buka Firebase Console
2. Pilih project: `wedding-web-alfira-fauzi`
3. Klik "Firestore Database" di menu kiri
4. Klik tab "Rules"
5. Ubah bagian `match /chatInvitation/{docId}` sesuai kode di atas
6. Klik "Publish"

### Opsi 2: Buat Document Manual (Jika tidak bisa update rules)

Jika tidak bisa update rules, buat document manual di Firestore:

1. Buka Firebase Console → Firestore Database
2. Klik "Start collection"
3. Collection ID: `chatInvitation`
4. Document ID: `defaultTemplate`
5. Tambahkan fields:
   - `template` (string): Copy paste template default
   - `adminKey` (string): `F4uziGant3n9`
   - `updatedAt` (timestamp): (biarkan kosong, akan auto-fill)

**Template Default:**
```
Kepada Yth. [Nama Tamu]

Assalamu'alaikum Warahmatullahi Wabarakatuh

Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

💍 Alfira & Fauzi
📅 Minggu, 23 November 2025

Detail acara dan konfirmasi kehadiran dapat diakses melalui tautan berikut:
🔗 [Link Undangan]

Merupakan kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Wassalamu'alaikum Warahmatullahi Wabarakatuh

Kami yang berbahagia,
Alfira & Fauzi
```

## Verifikasi

Setelah update rules atau buat document manual:

1. Buka admin panel
2. Klik tab "Form Invitation"
3. Edit template
4. Klik "Simpan Template"
5. Seharusnya muncul notifikasi "Template berhasil disimpan!"

## Kode yang Sudah Diperbaiki

✅ Sudah menambahkan `adminKey` saat save template
✅ Sudah handle case document belum ada
✅ Sudah ada fallback ke default template
