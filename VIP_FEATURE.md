# Fitur VIP Status & Auto MaxGuests

## ✅ Fitur yang Ditambahkan

### 1. Field isVip (Boolean)
Field baru di collection `guest` untuk menandai tamu VIP.

**Struktur Data:**
```javascript
{
    // ... existing fields ...
    isVip: Boolean,  // true = VIP, false = Regular
}
```

### 2. Radio Button VIP di Form
**Form Tambah Undangan:**
- Radio button: VIP / Regular
- Default: Regular (false)
- Icon: `ri-vip-crown-line`

**Form Edit Undangan:**
- Radio button: VIP / Regular
- Auto-populate dari data existing
- Icon: `ri-vip-crown-fill`

### 3. Display Status VIP
**Di Detail Row:**
- Badge kuning dengan icon crown untuk VIP
- Badge abu-abu untuk Regular
- Format:
  - VIP: `<badge bg-warning>👑 VIP</badge>`
  - Regular: `<badge bg-secondary>Regular</badge>`

### 4. Auto-Change maxGuests
**Logika:**
- Saat user mengetik nama di form (Create/Edit)
- Jika nama mengandung karakter `"&"`
- Dan `maxGuests` masih `1`
- Maka otomatis ubah `maxGuests` menjadi `2`

**Contoh:**
```
Input: "Budi & Ani"
maxGuests: 1 → Auto change to 2

Input: "Budi"
maxGuests: 1 → Tetap 1 (tidak ada "&")

Input: "Budi & Ani & Citra"
maxGuests: 1 → Auto change to 2
maxGuests: 2 → Tetap 2 (sudah > 1)
```

## Implementasi Teknis

### HTML - Form Tambah Undangan
```html
<div class="mb-3">
  <label class="form-label">
    <i class="ri-vip-crown-line"></i> Status VIP
  </label>
  <div class="d-flex gap-3">
    <div class="form-check">
      <input class="form-check-input" type="radio" 
             name="guestVip" id="vipYes" value="true">
      <label class="form-check-label" for="vipYes">VIP</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" 
             name="guestVip" id="vipNo" value="false" checked>
      <label class="form-check-label" for="vipNo">Regular</label>
    </div>
  </div>
</div>
```

### JavaScript - Auto Change maxGuests
```javascript
$('[name="guestName"]').on("input", function() {
    const name = $(this).val();
    const maxGuestsInput = $('[name="guestCount"]');
    const currentMax = Number(maxGuestsInput.val());

    // Jika ada "&" dan maxGuests masih 1, ubah jadi 2
    if (name.includes("&") && currentMax === 1) {
        maxGuestsInput.val(2);
        console.log('✅ Auto-changed maxGuests to 2 (detected "&")');
    }
});
```

### JavaScript - Save dengan isVip
```javascript
const payload = {
    name: guestName,
    phone: phone,
    maxGuests: maxGuests,
    source: source || "",
    sourceName: sourceNote || "",
    isVip: $('[name="guestVip"]:checked').val() === "true",  // ✅
    // ... other fields
};
```

### JavaScript - Display VIP Badge
```javascript
<tr>
    <td><strong>Status VIP:</strong></td>
    <td>
        ${d.isVip 
            ? '<span class="badge bg-warning text-dark"><i class="ri-vip-crown-fill"></i> VIP</span>' 
            : '<span class="badge bg-secondary">Regular</span>'}
    </td>
</tr>
```

## Use Cases

### Use Case 1: Tambah Tamu VIP
1. Buka tab "Tambah Undangan"
2. Isi nama: "Pak Direktur"
3. Pilih radio "VIP"
4. Klik "Simpan Tamu"
5. ✅ Guest tersimpan dengan `isVip: true`

### Use Case 2: Tambah Pasangan (Auto maxGuests)
1. Buka tab "Tambah Undangan"
2. Ketik nama: "Budi"
3. maxGuests: 1 (default)
4. Lanjut ketik: "Budi & Ani"
5. ✅ maxGuests otomatis berubah jadi 2
6. Klik "Simpan Tamu"

### Use Case 3: Edit Status VIP
1. Klik tombol Edit di list
2. Modal terbuka dengan data existing
3. Radio button VIP sudah ter-check sesuai data
4. Ubah dari Regular → VIP
5. Klik "Simpan Perubahan"
6. ✅ Status VIP terupdate

### Use Case 4: Lihat Status VIP
1. Klik tombol toggle detail (arrow)
2. Detail row expand
3. Lihat section "Informasi Dasar"
4. ✅ Status VIP ditampilkan dengan badge

## Validasi & Error Handling

### Validasi Form:
- ✅ Nama wajib diisi
- ✅ maxGuests minimal 1
- ✅ Nomor HP wajib diisi
- ✅ isVip default false jika tidak dipilih

### Console Logging:
```javascript
// Saat auto-change maxGuests
console.log('✅ Auto-changed maxGuests to 2 (detected "&")');

// Saat edit guest
console.log('📝 Edit guest data:', { id, name, maxGuests, phone, source, sourceName, isVip });
```

## Styling

### Badge VIP:
- Background: `bg-warning` (kuning)
- Text: `text-dark` (hitam)
- Icon: `ri-vip-crown-fill` (crown)

### Badge Regular:
- Background: `bg-secondary` (abu-abu)
- Text: default (putih)

### Radio Button:
- Gap: `gap-3` (spacing antar radio)
- Layout: `d-flex` (horizontal)

## Testing Checklist

- [ ] Tambah guest VIP → isVip = true
- [ ] Tambah guest Regular → isVip = false
- [ ] Edit guest VIP → Regular → tersimpan
- [ ] Edit guest Regular → VIP → tersimpan
- [ ] Ketik "Budi & Ani" → maxGuests auto 2
- [ ] Ketik "Budi" → maxGuests tetap 1
- [ ] Detail row menampilkan badge VIP
- [ ] Detail row menampilkan badge Regular
- [ ] Reset form → VIP kembali ke Regular

## Firestore Rules

Tidak perlu update rules karena `isVip` adalah field biasa yang bisa diupdate oleh admin dengan `adminKey`.

Existing rules sudah cukup:
```javascript
match /guest/{guestId} {
    allow create, update: if isAdminRequest();
    // ...
}
```

## Future Enhancement Ideas

1. **Filter VIP di List:**
   - Tambah filter untuk tampilkan hanya VIP
   - Atau tampilkan VIP di top list

2. **VIP Badge di Table:**
   - Tampilkan icon crown kecil di kolom nama
   - Untuk quick identification

3. **VIP Statistics:**
   - Dashboard: Total VIP vs Regular
   - Tracking RSVP VIP vs Regular

4. **VIP Template:**
   - Template WhatsApp khusus untuk VIP
   - Lebih formal/personal

5. **Auto-detect VIP:**
   - Berdasarkan source (CPP/CPW = auto VIP)
   - Berdasarkan keyword di nama
