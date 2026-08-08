# Fitur VIP Status V2 - 2 Kategori Terpisah

## 🔄 Perubahan dari V1 ke V2

### V1 (Lama):
- 1 field: `isVip` (Boolean)
- Radio button: VIP / Regular
- Tamu hanya bisa VIP atau Regular untuk semua kategori

### V2 (Baru):
- 2 field terpisah:
  - `isTableVip` (Boolean) - VIP Table
  - `isSouvenirVip` (Boolean) - VIP Souvenir
- 2 checkbox independen
- Tamu bisa VIP di satu kategori, regular di kategori lain

## ✅ Keuntungan V2

1. **Fleksibilitas Tinggi**
   - Tamu bisa VIP Table tapi Regular Souvenir
   - Atau VIP Undangan tapi Regular Table
   - Kombinasi bebas sesuai kebutuhan

2. **Mudah Filter & Query**
   ```javascript
   // Query hanya tamu VIP Table
   where("isTableVip", "==", true)
   
   // Query hanya tamu VIP Souvenir
   where("isSouvenirVip", "==", true)
   
   // Query tamu yang VIP di semua kategori
   where("isTableVip", "==", true)
   where("isSouvenirVip", "==", true)
   where("isUndanganVip", "==", true)
   ```

3. **Scalable**
   - Mudah menambah kategori VIP baru
   - Tidak perlu refactor data existing

4. **Reporting Lebih Detail**
   - Bisa hitung berapa tamu VIP Table
   - Berapa tamu VIP Souvenir
   - Berapa tamu VIP Undangan
   - Berapa tamu VIP di semua kategori

## 📊 Firestore Schema

```javascript
{
    // ... existing fields ...
    name: "Budi Santoso",
    phone: "+6281234567890",
    maxGuests: 2,
    
    // ✅ 2 Field VIP Terpisah (Boolean)
    isTableVip: true,      // VIP Table
    isSouvenirVip: false,  // Regular Souvenir
    
    // ... other fields ...
}
```

## 🎨 UI/UX Changes

### Form Tambah Undangan
**Sebelum (V1):**
```html
<div class="d-flex gap-3">
  <input type="radio" name="guestVip" value="true"> VIP
  <input type="radio" name="guestVip" value="false" checked> Regular
</div>
```

**Sesudah (V2):**
```html
<div class="d-flex flex-column gap-2">
  <input type="checkbox" name="guestTableVip"> 
    <i class="ri-restaurant-line"></i> VIP Table
  
  <input type="checkbox" name="guestSouvenirVip"> 
    <i class="ri-gift-line"></i> VIP Souvenir
  
  <input type="checkbox" name="guestUndanganVip"> 
    <i class="ri-mail-line"></i> VIP Undangan
</div>
```

### Display di Detail Row
**Sebelum (V1):**
```html
Status VIP: [VIP Badge] atau [Regular Badge]
```

**Sesudah (V2):**
```html
Status VIP:
  [VIP Table Badge] atau [Regular Table Badge]
  [VIP Souvenir Badge] atau [Regular Souvenir Badge]
  [VIP Undangan Badge] atau [Regular Undangan Badge]
```

## 💻 Implementasi Teknis

### 1. HTML - Form Tambah Undangan

```html
<div class="mb-3">
  <label class="form-label">
    <i class="ri-vip-crown-line"></i> Status VIP
  </label>
  <div class="d-flex flex-column gap-2">
    <div class="form-check">
      <input class="form-check-input" type="checkbox" 
             name="guestTableVip" id="tableVipYes" value="true">
      <label class="form-check-label" for="tableVipYes">
        <i class="ri-restaurant-line"></i> VIP Table
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="checkbox" 
             name="guestSouvenirVip" id="souvenirVipYes" value="true">
      <label class="form-check-label" for="souvenirVipYes">
        <i class="ri-gift-line"></i> VIP Souvenir
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="checkbox" 
             name="guestUndanganVip" id="undanganVipYes" value="true">
      <label class="form-check-label" for="undanganVipYes">
        <i class="ri-mail-line"></i> VIP Undangan
      </label>
    </div>
  </div>
</div>
```

### 2. JavaScript - Save Guest

```javascript
// ✅ Get VIP status dari 3 checkbox terpisah
const isTableVip     = $('[name="guestTableVip"]').is(':checked');
const isSouvenirVip  = $('[name="guestSouvenirVip"]').is(':checked');
const isUndanganVip  = $('[name="guestUndanganVip"]').is(':checked');

const payload = {
    name: guestName,
    phone: phone,
    maxGuests: maxGuests,
    source: source || "",
    sourceName: sourceNote || "",
    
    // ✅ 3 field VIP terpisah (boolean)
    isTableVip: isTableVip,
    isSouvenirVip: isSouvenirVip,
    isUndanganVip: isUndanganVip,
    
    // ... other fields
};
```

### 3. JavaScript - Display VIP Status

```javascript
<tr>
    <td><strong>Status VIP:</strong></td>
    <td>
        <div class="d-flex flex-column gap-1">
            ${d.isTableVip 
                ? '<span class="badge bg-warning text-dark"><i class="ri-restaurant-line"></i> VIP Table</span>' 
                : '<span class="badge bg-secondary"><i class="ri-restaurant-line"></i> Regular Table</span>'}
            ${d.isSouvenirVip 
                ? '<span class="badge bg-warning text-dark"><i class="ri-gift-line"></i> VIP Souvenir</span>' 
                : '<span class="badge bg-secondary"><i class="ri-gift-line"></i> Regular Souvenir</span>'}
            ${d.isUndanganVip 
                ? '<span class="badge bg-warning text-dark"><i class="ri-mail-line"></i> VIP Undangan</span>' 
                : '<span class="badge bg-secondary"><i class="ri-mail-line"></i> Regular Undangan</span>'}
        </div>
    </td>
</tr>
```

### 4. JavaScript - Edit Guest (Populate Form)

```javascript
$(document).on("click", ".editGuest", function () {
    const $btn = $(this);
    
    // ✅ Get 3 VIP status terpisah dari data attributes
    const isTableVip = $btn.data("istablevip");
    const isSouvenirVip = $btn.data("issouvenivip");
    const isUndanganVip = $btn.data("isundanganvip");
    
    // ✅ Set 3 VIP checkboxes
    $('input[name="editGuestTableVip"]').prop("checked", 
        isTableVip === true || isTableVip === "true");
    $('input[name="editGuestSouvenirVip"]').prop("checked", 
        isSouvenirVip === true || isSouvenirVip === "true");
    $('input[name="editGuestUndanganVip"]').prop("checked", 
        isUndanganVip === true || isUndanganVip === "true");
});
```

### 5. JavaScript - Save Edit Guest

```javascript
$("#saveEditGuest").on("click", async function () {
    const payload = {
        name: $('input[name="editGuestName"]').val().trim(),
        maxGuests: Number($('input[name="editGuestCount"]').val()),
        phone: normalizePhoneNumber(phoneRaw),
        source: $('select[name="editGuestSource"]').val(),
        sourceName: $('input[name="editGuestSourceNote"]').val().trim(),
        
        // ✅ 3 field VIP terpisah (boolean)
        isTableVip: $('input[name="editGuestTableVip"]').is(':checked'),
        isSouvenirVip: $('input[name="editGuestSouvenirVip"]').is(':checked'),
        isUndanganVip: $('input[name="editGuestUndanganVip"]').is(':checked'),
        
        updatedAt: serverTimestamp(),
        adminKey: ADMIN_KEY
    };
    
    await updateDoc(doc(window.db, "guest", id), payload);
});
```

### 6. JavaScript - Reset Form

```javascript
// ✅ Reset 3 VIP checkboxes
$('[name="guestTableVip"]').prop("checked", false);
$('[name="guestSouvenirVip"]').prop("checked", false);
$('[name="guestUndanganVip"]').prop("checked", false);
```

## 📝 Use Cases

### Use Case 1: Tamu VIP Semua Kategori
**Scenario:** Pak Direktur - VIP di semua kategori

1. Buka form "Tambah Undangan"
2. Isi nama: "Pak Direktur"
3. ✅ Check: VIP Table
4. ✅ Check: VIP Souvenir
5. ✅ Check: VIP Undangan
6. Klik "Simpan Tamu"

**Result:**
```javascript
{
    name: "Pak Direktur",
    isTableVip: true,
    isSouvenirVip: true,
    isUndanganVip: true
}
```

### Use Case 2: Tamu VIP Partial
**Scenario:** Teman Kantor - VIP Table saja, souvenir & undangan regular

1. Buka form "Tambah Undangan"
2. Isi nama: "Budi Santoso"
3. ✅ Check: VIP Table
4. ❌ Uncheck: VIP Souvenir
5. ❌ Uncheck: VIP Undangan
6. Klik "Simpan Tamu"

**Result:**
```javascript
{
    name: "Budi Santoso",
    isTableVip: true,
    isSouvenirVip: false,
    isUndanganVip: false
}
```

### Use Case 3: Edit Status VIP
**Scenario:** Upgrade tamu dari Regular ke VIP Souvenir

1. Klik tombol Edit di list
2. Modal terbuka dengan data existing
3. Checkbox VIP Souvenir saat ini: unchecked
4. ✅ Check: VIP Souvenir
5. Klik "Simpan Perubahan"

**Result:**
```javascript
{
    // ... existing data ...
    isSouvenirVip: true  // Changed from false to true
}
```

## 🎯 Contoh Kombinasi VIP

| Nama Tamu | Table | Souvenir | Undangan | Keterangan |
|-----------|-------|----------|----------|------------|
| Pak Direktur | ✅ VIP | ✅ VIP | ✅ VIP | Full VIP |
| Teman Kantor | ✅ VIP | ❌ Regular | ❌ Regular | VIP Table only |
| Keluarga Dekat | ✅ VIP | ✅ VIP | ❌ Regular | VIP Table & Souvenir |
| Tetangga | ❌ Regular | ✅ VIP | ❌ Regular | VIP Souvenir only |
| Teman Sekolah | ❌ Regular | ❌ Regular | ✅ VIP | VIP Undangan only |

## 📊 Query Examples

### Query 1: Semua Tamu VIP Table
```javascript
const vipTableGuests = await getDocs(
    query(
        collection(db, "guest"),
        where("isTableVip", "==", true)
    )
);
```

### Query 2: Tamu VIP di Semua Kategori
```javascript
const fullVipGuests = await getDocs(
    query(
        collection(db, "guest"),
        where("isTableVip", "==", true),
        where("isSouvenirVip", "==", true),
        where("isUndanganVip", "==", true)
    )
);
```

### Query 3: Tamu Regular di Semua Kategori
```javascript
const regularGuests = await getDocs(
    query(
        collection(db, "guest"),
        where("isTableVip", "==", false),
        where("isSouvenirVip", "==", false),
        where("isUndanganVip", "==", false)
    )
);
```

## 📈 Statistics & Reporting

### Count VIP per Kategori
```javascript
// Count VIP Table
const vipTableCount = guests.filter(g => g.isTableVip).length;

// Count VIP Souvenir
const vipSouvenirCount = guests.filter(g => g.isSouvenirVip).length;

// Count VIP Undangan
const vipUndanganCount = guests.filter(g => g.isUndanganVip).length;

// Count Full VIP (semua kategori)
const fullVipCount = guests.filter(g => 
    g.isTableVip && g.isSouvenirVip && g.isUndanganVip
).length;
```

### Dashboard Display
```html
<div class="stats">
    <div class="stat-card">
        <h4>VIP Table</h4>
        <p class="count">25 tamu</p>
    </div>
    <div class="stat-card">
        <h4>VIP Souvenir</h4>
        <p class="count">18 tamu</p>
    </div>
    <div class="stat-card">
        <h4>VIP Undangan</h4>
        <p class="count">30 tamu</p>
    </div>
    <div class="stat-card">
        <h4>Full VIP</h4>
        <p class="count">12 tamu</p>
    </div>
</div>
```

## 🔄 Migration dari V1 ke V2

Jika ada data existing dengan field `isVip`, perlu migration:

```javascript
// Migration script (run once)
const guests = await getDocs(collection(db, "guest"));

for (const doc of guests.docs) {
    const data = doc.data();
    
    // Jika ada field isVip lama
    if (data.hasOwnProperty('isVip')) {
        const isVip = data.isVip;
        
        // Convert ke 3 field baru
        await updateDoc(doc.ref, {
            isTableVip: isVip,      // Copy ke semua kategori
            isSouvenirVip: isVip,
            isUndanganVip: isVip,
            // Optional: hapus field lama
            // isVip: deleteField()
        });
    }
}

console.log('✅ Migration completed');
```

## ✅ Testing Checklist

- [ ] Tambah guest dengan 3 checkbox VIP → tersimpan dengan benar
- [ ] Tambah guest tanpa check VIP → default false untuk semua
- [ ] Edit guest: check VIP Table → tersimpan
- [ ] Edit guest: uncheck VIP Souvenir → tersimpan
- [ ] Display detail row menampilkan 3 badge VIP
- [ ] Display detail row menampilkan kombinasi VIP & Regular
- [ ] Reset form → semua checkbox VIP unchecked
- [ ] Data attributes di button edit → 3 field terpisah
- [ ] Console log menampilkan 3 field VIP

## 🚀 Future Enhancements

1. **Bulk Update VIP Status**
   - Select multiple guests
   - Update VIP status sekaligus

2. **VIP Templates**
   - Template WhatsApp berbeda per kategori VIP
   - "Terima kasih atas kehadiran Anda di VIP Table"

3. **VIP Analytics**
   - Chart: VIP distribution per kategori
   - Trend: VIP vs Regular over time

4. **Auto VIP Rules**
   - Auto VIP Table jika source = "CPP"
   - Auto VIP Undangan jika maxGuests > 5

5. **Export VIP List**
   - Export Excel: List VIP Table
   - Export Excel: List VIP Souvenir
   - Export Excel: List VIP Undangan

## 📚 References

- Remix Icon: https://remixicon.com/
  - `ri-restaurant-line` - Table icon
  - `ri-gift-line` - Souvenir icon
  - `ri-mail-line` - Undangan icon
  - `ri-vip-crown-line` - VIP icon

- Bootstrap 5 Badges: https://getbootstrap.com/docs/5.3/components/badge/
  - `bg-warning text-dark` - VIP badge
  - `bg-secondary` - Regular badge
