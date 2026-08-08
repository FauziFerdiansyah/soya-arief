# Phone Number Normalization

## ✅ Fitur Auto-Normalisasi Nomor HP

### Masalah
User sering input nomor HP dengan format berbeda-beda:
- `+62 895-4230-30255`
- `62 895 4230 30255`
- `0895-4230-30255`
- `895 4230 30255`

Ini menyebabkan:
- Inkonsistensi data di database
- Gagal kirim WhatsApp
- Sulit untuk validasi

### Solusi
Auto-normalisasi nomor HP sebelum disimpan ke Firebase dengan format standar: `08xxxxxxxxxx`

## Aturan Normalisasi

### 1. Hapus Semua Non-Digit
Hapus semua karakter selain angka:
- Spasi: ` `
- Dash: `-`
- Plus: `+`
- Kurung: `()`, `[]`
- Titik: `.`
- Dan symbol lainnya

### 2. Konversi Prefix
- `+62` → `0`
- `62` → `0`
- Jika tidak ada prefix → tambahkan `0`

### 3. Hasil Akhir
Format standar: `08xxxxxxxxxx`
- Awalan: `0`
- Hanya angka
- Tidak ada spasi/symbol

## Contoh Konversi

| Input | Output | Keterangan |
|-------|--------|------------|
| `+62 895-4230-30255` | `0895423030255` | Hapus +, spasi, dash; 62→0 |
| `62 895 4230 30255` | `0895423030255` | Hapus spasi; 62→0 |
| `0895-4230-30255` | `0895423030255` | Hapus dash |
| `895 4230 30255` | `0895423030255` | Hapus spasi; tambah 0 |
| `(0895) 4230-30255` | `0895423030255` | Hapus kurung, spasi, dash |
| `08.95.42.30.30.255` | `0895423030255` | Hapus titik |

## Implementasi

### Fungsi Normalisasi
```javascript
function normalizePhoneNumber(phone) {
    if (!phone) return "";

    // 1. Hapus semua karakter non-digit
    let normalized = phone.replace(/\D/g, '');

    // 2. Jika diawali 62, ubah jadi 0
    if (normalized.startsWith('62')) {
        normalized = '0' + normalized.substring(2);
    }

    // 3. Jika tidak diawali 0, tambahkan 0 di depan
    if (!normalized.startsWith('0')) {
        normalized = '0' + normalized;
    }

    console.log(`📱 Phone normalized: "${phone}" → "${normalized}"`);
    return normalized;
}
```

### Penggunaan di Form Submit
```javascript
// Create Guest
const phoneRaw = $('[name="guestPhone"]').val().trim();
const phone = normalizePhoneNumber(phoneRaw);

const payload = {
    name: guestName,
    phone: phone,  // ✅ Sudah normalized
    // ...
};
```

### Penggunaan di Edit Guest
```javascript
// Edit Guest
const phoneRaw = $('input[name="editGuestPhone"]').val().trim();

const payload = {
    name: name,
    phone: normalizePhoneNumber(phoneRaw),  // ✅ Normalized
    // ...
};
```

## Real-Time Preview

### Fitur Preview
Saat user mengetik nomor HP, sistem akan menampilkan preview hasil normalisasi di bawah input field.

**Contoh:**
```
Input: +62 895-4230-30255
Preview: ℹ️ Akan disimpan sebagai: 0895423030255
```

### Implementasi Preview
```javascript
$('[name="guestPhone"]').on("input", function() {
    const $input = $(this);
    const rawValue = $input.val();
    
    setTimeout(() => {
        if (rawValue.trim()) {
            const normalized = normalizePhoneNumber(rawValue);
            
            if (rawValue !== normalized) {
                let $preview = $input.next('.phone-preview');
                if (!$preview.length) {
                    $input.after('<small class="phone-preview text-muted d-block mt-1"></small>');
                    $preview = $input.next('.phone-preview');
                }
                $preview.html(`<i class="ri-information-line"></i> Akan disimpan sebagai: <strong>${normalized}</strong>`);
            }
        }
    }, 500);
});
```

### Timing
- Delay: 500ms setelah user berhenti mengetik
- Auto-hide jika input kosong
- Auto-hide jika format sudah benar

## User Experience

### Visual Feedback
1. **User mengetik:** `+62 895-4230-30255`
2. **Preview muncul:** "ℹ️ Akan disimpan sebagai: **0895423030255**"
3. **User klik Save**
4. **Tersimpan:** `0895423030255`

### Console Logging
```javascript
📱 Phone normalized: "+62 895-4230-30255" → "0895423030255"
```

## Validasi

### Before Normalization
```javascript
if (!phoneRaw) return alert("Nomor HP wajib diisi");
```

### After Normalization
```javascript
const phone = normalizePhoneNumber(phoneRaw);
// phone sekarang sudah clean: "08xxxxxxxxxx"
```

## Integrasi dengan WhatsApp

### Format untuk WhatsApp
Saat kirim WhatsApp, nomor dikonversi lagi:
```javascript
// From database: 0895423030255
// For WhatsApp: 62895423030255

function formatPhoneNumber(phone) {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substring(1);
    }
    return formatted;
}
```

### Flow Lengkap
1. **User Input:** `+62 895-4230-30255`
2. **Normalize:** `0895423030255` (save to DB)
3. **WhatsApp:** `62895423030255` (send to WA)

## Edge Cases

### Case 1: Nomor Tanpa Prefix
```javascript
Input: "895423030255"
Output: "0895423030255"  // ✅ Tambah 0
```

### Case 2: Nomor Sudah Benar
```javascript
Input: "0895423030255"
Output: "0895423030255"  // ✅ Tidak berubah
```

### Case 3: Nomor dengan +62
```javascript
Input: "+62895423030255"
Output: "0895423030255"  // ✅ +62 → 0
```

### Case 4: Nomor dengan 62
```javascript
Input: "62895423030255"
Output: "0895423030255"  // ✅ 62 → 0
```

### Case 5: Nomor dengan Symbol
```javascript
Input: "(0895) 4230-30255"
Output: "0895423030255"  // ✅ Hapus semua symbol
```

### Case 6: Input Kosong
```javascript
Input: ""
Output: ""  // ✅ Return empty string
```

## Testing Checklist

- [ ] Input `+62 895-4230-30255` → `0895423030255`
- [ ] Input `62 895 4230 30255` → `0895423030255`
- [ ] Input `0895-4230-30255` → `0895423030255`
- [ ] Input `895 4230 30255` → `0895423030255`
- [ ] Input `(0895) 4230-30255` → `0895423030255`
- [ ] Preview muncul saat mengetik
- [ ] Preview hilang jika format sudah benar
- [ ] Save ke Firebase dengan format benar
- [ ] Edit guest normalize phone
- [ ] WhatsApp kirim dengan format 62xxx

## Benefits

### 1. Konsistensi Data ✅
Semua nomor HP di database format sama: `08xxxxxxxxxx`

### 2. WhatsApp Integration ✅
Mudah convert ke format WhatsApp: `62xxxxxxxxxx`

### 3. User Friendly ✅
User bebas input format apapun, sistem auto-normalize

### 4. Validasi Mudah ✅
Cukup cek prefix `0` dan length

### 5. Search & Filter ✅
Mudah search karena format konsisten

## Future Enhancement

### 1. Validasi Length
```javascript
if (normalized.length < 10 || normalized.length > 13) {
    alert("Nomor HP tidak valid (10-13 digit)");
}
```

### 2. Validasi Operator
```javascript
const validPrefixes = ['0811', '0812', '0813', '0821', '0822', '0851', '0852', '0853'];
if (!validPrefixes.some(prefix => normalized.startsWith(prefix))) {
    alert("Prefix operator tidak valid");
}
```

### 3. Auto-Format Display
```javascript
// Display: 0895-4230-30255
// Store: 0895423030255
```

### 4. International Support
```javascript
// Support nomor luar negeri
// +1 234 567 8900 → 12345678900
```
