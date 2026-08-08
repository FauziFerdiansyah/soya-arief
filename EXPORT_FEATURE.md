# Export Guest to Excel Feature

## Overview
Fitur untuk mengekspor semua data tamu dari Firebase ke file Excel (.xlsx).

## Lokasi
- **Menu:** List Undangan tab
- **Button:** "Export Excel" (biru) di sebelah kiri button "Import Data"
- **Icon:** `ri-download-2-line`

## Fitur

### Export to Excel
- Download semua data guest dari Firebase ke file Excel
- Format file: `.xlsx` (Excel 2007+)
- Nama file otomatis dengan timestamp: `Guest_List_YYYY-MM-DDTHH-MM-SS.xlsx`
- **2 Sheet dalam 1 file:**
  - **Sheet 1: "Import Format"** - Format sederhana untuk re-import (8 kolom)
  - **Sheet 2: "Full Details"** - Data lengkap dengan semua detail (18 kolom)

### Sheet 1: Import Format (8 Kolom)

Format sederhana yang bisa langsung di-import kembali ke sistem.

| Kolom | Sumber Data | Keterangan |
|-------|-------------|------------|
| Nama Tamu | name | Nama lengkap tamu |
| Jumlah Tamu | maxGuests | Kapasitas maksimal tamu |
| Nomor Handphone | phone | Nomor HP (format normalized) |
| Instagram | instagram | Username tanpa @ |
| Tamu Undangan Dari | source | CPP/CPW/Ayah/Bunda/dll |
| Keterangan Undangan Dari | sourceName | Keterangan tambahan |
| Table | isTableVip | "VIP" atau "Reguler" |
| Souvenir | isSouvenirVip | "VIP" atau "Reguler" |

**Contoh Data:**
```
Mas Budi & Istri | 2 | 62 857-7146-8268 | budisantoso | CPP | Mifx | Reguler | VIP
```

### Sheet 2: Full Details (18 Kolom)

Data lengkap dengan semua tracking dan metadata.

| Kolom | Sumber Data | Keterangan |
|-------|-------------|------------|
| ID Guest | doc.id | Document ID dari Firebase |
| Nama Tamu | name | Nama lengkap tamu |
| Jumlah Tamu | maxGuests | Kapasitas maksimal tamu |
| Nomor Handphone | phone | Nomor HP (format normalized) |
| Instagram | instagram | Username dengan @ di depan |
| Tamu Undangan Dari | source | CPP/CPW/Ayah/Bunda/dll |
| Keterangan Undangan Dari | sourceName | Keterangan tambahan |
| Table | isTableVip | "VIP" atau "Reguler" |
| Souvenir | isSouvenirVip | "VIP" atau "Reguler" |
| Status Buka | opened | "Sudah" atau "Belum" |
| Jumlah Buka | openCount | Berapa kali dibuka |
| Status RSVP | rsvpStatus | "Hadir"/"Tidak Hadir"/"Belum Konfirmasi" |
| Jumlah Hadir | rsvpCount | Jumlah orang yang akan hadir |
| Device Type | deviceType | "mobile"/"desktop" |
| Terakhir Dikirim WA | lastSent | Timestamp terakhir kirim WhatsApp |
| Jumlah Kirim WA | sendCount | Berapa kali dikirim via WhatsApp |
| Dibuat | createdAt | Timestamp dibuat |
| Diupdate | updatedAt | Timestamp terakhir update |

## Cara Penggunaan

1. Buka webadmin
2. Pastikan di tab "List Undangan"
3. Klik button **"Export Excel"** (biru)
4. Tunggu proses export (button akan menampilkan "Exporting...")
5. File Excel akan otomatis terdownload
6. Notifikasi sukses akan muncul dengan jumlah data yang di-export

## Fitur Teknis

### Auto-sizing Columns
- Lebar kolom otomatis menyesuaikan dengan panjang konten
- Maximum width: 50 karakter
- Padding: +2 karakter untuk readability

### Sorting
- Data di-export sesuai urutan di Firebase: `createdAt desc` (terbaru di atas)

### Format Data
- Tanggal: Format Indonesia (DD MMM YYYY, HH:MM)
- Boolean: Dikonversi ke text ("Sudah"/"Belum", "VIP"/"Reguler")
- Empty values: Ditampilkan sebagai string kosong ""

### Loading State
- Button disabled saat proses export
- Icon berubah menjadi loading spinner
- Text berubah menjadi "Exporting..."

### Error Handling
- Jika tidak ada data: Warning "Tidak Ada Data"
- Jika terjadi error: Error message dengan SweetAlert2
- Button akan kembali normal setelah selesai/error

## Dependencies
- **SheetJS (xlsx.js)**: Library untuk generate Excel file
- Sudah di-include di `index.html`: `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`

## Use Cases

### 1. Backup Data
Export semua data tamu untuk backup offline

### 2. Re-import Data
- Gunakan **Sheet 1 (Import Format)** untuk edit data di Excel
- Import kembali ke sistem menggunakan fitur Import
- Format sudah sesuai dengan template import

### 3. Analisis Data
Gunakan **Sheet 2 (Full Details)** untuk analisis:
- Pivot table
- Filtering
- Charting
- Reporting
- Tracking RSVP dan WhatsApp

### 4. Sharing Data
- **Sheet 1**: Share ke vendor/keluarga (data sederhana)
- **Sheet 2**: Share ke tim internal (data lengkap dengan tracking)

### 5. Print List
Print daftar tamu dari Sheet 1 untuk keperluan checklist di acara

## Notes
- Export tidak memerlukan konfirmasi (langsung download)
- File size tergantung jumlah data (biasanya < 1MB untuk ratusan tamu)
- Compatible dengan Excel 2007+, Google Sheets, LibreOffice Calc
- Data di-export sesuai dengan data real-time di Firebase
- Tidak ada limit jumlah data yang bisa di-export
- **2 Sheet dalam 1 file** untuk kemudahan penggunaan:
  - Sheet 1 untuk import/edit sederhana
  - Sheet 2 untuk analisis lengkap
- Instagram di Sheet 1 tanpa @, di Sheet 2 dengan @ (sesuai kebutuhan masing-masing)
- Kedua sheet memiliki auto-sized columns untuk readability
