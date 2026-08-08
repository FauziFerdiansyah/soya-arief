# RSVP & Comments Management Feature

## Overview
Menambahkan 2 menu baru di webadmin untuk mengelola data RSVP dan Comments dari tamu undangan.

## Menu Baru

### 1. RSVP Menu
**Icon:** `<i class="ri-pass-valid-line"></i>`

**Fitur:**
- **Statistics Cards** di atas tabel:
  - Total Tamu (semua guest)
  - Total Hadir (jumlah orang yang konfirmasi hadir)
  - Total Tidak Hadir (jumlah guest yang konfirmasi tidak hadir)
  - Total Belum Konfirmasi (guest yang belum RSVP)
- Menampilkan **SEMUA tamu** dari collection `guest` di Firestore
- Filter berdasarkan:
  - Nama tamu (search)
  - Status RSVP (Hadir/Tidak Hadir/Belum Konfirmasi)
- Sorting kolom: Nama, Status RSVP, Jumlah Hadir, Max Tamu
- Pagination dengan pilihan 10/25/50/100 data per halaman
- Detail view untuk setiap tamu (info lengkap + status RSVP)
- **Tidak ada fitur hapus/edit** (sesuai Firebase rules - tidak ada adminKey di RSVP)

**Data Source:**
Query dari collection `guest` - menampilkan SEMUA tamu (baik yang sudah RSVP maupun belum)

**Kolom Tabel:**
- Nama Tamu (dengan VIP icons)
- Status RSVP (Hadir/Tidak Hadir/Belum Konfirmasi)
- Jumlah Hadir (rsvpCount - jumlah orang yang akan hadir)
- Max Tamu (maxGuests - kapasitas maksimal)
- No HP
- Dari (source)

### 2. Comments Menu
**Icon:** `<i class="ri-chat-smile-2-line"></i>`

**Fitur:**
- Menampilkan daftar komentar dari collection `comments` di Firestore
- Filter berdasarkan:
  - Nama atau isi komentar (search)
  - Sticker yang digunakan (12 pilihan sticker)
- Sorting kolom: Nama, Sticker, Tanggal
- Pagination dengan pilihan 10/25/50/100 data per halaman
- Detail view untuk setiap comment (menampilkan full text)
- Preview sticker di tabel (30x30px) dan detail (60x60px)
- **Tidak ada fitur hapus/edit** (sesuai Firebase rules - tidak ada adminKey di comments)

**Struktur Data Comments:**
```javascript
{
  comment: string,          // Isi komentar
  createdAt: timestamp,     // Tanggal comment dibuat
  guestId: string,          // ID tamu dari collection guest
  name: string,             // Nama tamu
  sticker: string           // Nama file sticker (e.g., "stc-a-8.gif")
}
```

**Sticker Options:**
- stc-a-1.gif sampai stc-a-18.gif (18 pilihan sticker)
- Path: `../assets/images/sticker/[filename]`

## Navigasi
- Sidebar menu dengan 3 pilihan:
  1. **Buat Tamu Undangan** (existing)
  2. **RSVP** (new)
  3. **Comments** (new)
- Klik menu untuk switch antar section
- Active state ditandai dengan highlight

## Implementasi

### File yang Dimodifikasi:
1. **webadmin/index.html**
   - Menambahkan 2 menu baru di sidebar
   - Menambahkan section RSVP dan Comments
   - Menambahkan ID wrapper untuk section guests

2. **webadmin/assets/js/script.js**
   - Menambahkan menu navigation handler
   - Menambahkan fungsi RSVP management (load, filter, sort, pagination, delete)
   - Menambahkan fungsi Comments management (load, filter, sort, pagination, delete)

## Fitur Detail

### RSVP Management
- **Statistics Cards:** Menampilkan ringkasan di atas tabel
  - Total Tamu: Jumlah semua guest
  - Total Hadir: Sum dari `rsvpCount` untuk guest dengan `rsvpStatus === "yes"`
  - Total Tidak Hadir: Count guest dengan `rsvpStatus === "no"`
  - Total Belum Konfirmasi: Count guest dengan `rsvpStatus === ""` atau tidak ada
- **Load Data:** Query SEMUA guest dari Firestore collection `guest`
- **Filter:** Real-time filtering berdasarkan:
  - Nama tamu (search)
  - Status RSVP (Hadir/Tidak Hadir/Belum Konfirmasi)
- **Sort:** Click header kolom untuk sort ascending/descending
- **Detail View:** Toggle detail row untuk melihat:
  - Informasi Tamu (ID, nama, HP, Instagram, max tamu, sumber)
  - Status RSVP (status, jumlah hadir, device type, status buka, VIP status)
- **No Delete/Edit:** Sesuai Firebase rules, RSVP tidak bisa dihapus/edit dari admin (tidak ada adminKey)

### Comments Management
- **Load Data:** Query dari Firestore collection `comments` dengan order by `createdAt desc`
- **Filter:** Real-time filtering berdasarkan nama/komentar dan sticker
- **Sort:** Click header kolom untuk sort ascending/descending
- **Detail View:** Toggle detail row untuk melihat full comment text dan sticker besar
- **Sticker Preview:** Menampilkan thumbnail sticker di tabel (30x30px) dan full size (60x60px) di detail
- **No Delete/Edit:** Sesuai Firebase rules, comments tidak bisa dihapus/edit dari admin (tidak ada adminKey)

## UI/UX Features
- Responsive table dengan horizontal scroll
- Bootstrap pagination
- Loading state saat fetch data
- Empty state saat tidak ada data
- Sort icons (up/down/both) di header kolom
- Toggle detail dengan animasi slide
- Konfirmasi delete dengan SweetAlert2
- Toast notification untuk aksi berhasil/gagal

## Firebase Rules Compliance
Sesuai dengan Firebase rules yang ada:

### RSVP (dari collection `guest`)
- ✅ **Read:** Allowed (public read)
- ❌ **Delete/Edit:** Tidak ada button karena RSVP data tidak memiliki `adminKey`
- Data RSVP adalah bagian dari document `guest` yang di-update oleh user publik

### Comments (collection `comments`)
- ✅ **Read:** Allowed (public read)
- ❌ **Delete/Edit:** Tidak ada button karena comments tidak memiliki `adminKey`
- Comments di-create oleh user publik dengan field terbatas: `guestId`, `name`, `comment`, `sticker`, `createdAt`

## Notes
- Sticker path: `../assets/images/sticker/[filename]`
- Total 18 sticker tersedia (stc-a-1.gif sampai stc-a-18.gif)
- Default sort: `createdAt desc` (terbaru di atas)
- Pagination default: 10 items per page
- Filter bersifat case-insensitive
- Search di Comments mencari di field `name` dan `comment`
- **RSVP menampilkan SEMUA tamu** (baik yang sudah RSVP maupun belum)
- Statistics cards menghitung:
  - Total Hadir = sum of `rsvpCount` (jumlah orang, bukan jumlah guest)
  - Total Tidak Hadir = count of guests dengan status "no"
  - Total Belum Konfirmasi = count of guests tanpa rsvpStatus
- VIP icons ditampilkan di kolom nama tamu RSVP
