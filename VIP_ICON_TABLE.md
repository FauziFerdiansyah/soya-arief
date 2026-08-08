# VIP Icon di Table Guest List

## ✨ Fitur

Menampilkan icon VIP di kolom nama pada table guest list dengan tooltip untuk membedakan status VIP.

## 🎨 Visual

### Icon VIP Table
- **Icon:** `ri-vip-line` 👑
- **Color:** `text-warning` (kuning)
- **Tooltip:** "VIP Table"
- **Posisi:** Setelah nama guest

### Icon VIP Souvenir
- **Icon:** `ri-vip-diamond-line` 💎
- **Color:** `text-warning` (kuning)
- **Tooltip:** "VIP Souvenir"
- **Posisi:** Setelah icon VIP Table (jika ada)

## 📊 Contoh Display

### Guest dengan VIP Table
```
Budi Santoso 👑
```
*Hover: "VIP Table"*

### Guest dengan VIP Souvenir
```
Ani Wijaya 💎
```
*Hover: "VIP Souvenir"*

### Guest dengan VIP Table & Souvenir
```
Pak Direktur 👑 💎
```
*Hover icon 1: "VIP Table"*
*Hover icon 2: "VIP Souvenir"*

### Guest Regular (Tanpa VIP)
```
Teman Sekolah
```
*Tidak ada icon*

## 💻 Implementasi

### 1. HTML Template (JavaScript)

```javascript
<td>
    ${d.name || "-"}
    ${d.isTableVip ? '<i class="ri-vip-line text-warning ms-1" data-bs-toggle="tooltip" title="VIP Table"></i>' : ''}
    ${d.isSouvenirVip ? '<i class="ri-vip-diamond-line text-warning ms-1" data-bs-toggle="tooltip" title="VIP Souvenir"></i>' : ''}
</td>
```

**Penjelasan:**
- `ms-1`: Margin start (kiri) 0.25rem untuk spacing
- `text-warning`: Bootstrap class untuk warna kuning
- `data-bs-toggle="tooltip"`: Trigger Bootstrap tooltip
- `title="..."`: Text yang muncul di tooltip

### 2. Initialize Bootstrap Tooltip

```javascript
function renderGuestTable(list) {
    // ... render table rows ...
    
    // ✅ Initialize Bootstrap tooltips for VIP icons
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
        new bootstrap.Tooltip(tooltipTriggerEl)
    );
}
```

**Penjelasan:**
- Dipanggil setiap kali table di-render
- Mencari semua element dengan `data-bs-toggle="tooltip"`
- Inisialisasi Bootstrap Tooltip untuk setiap element

## 🎯 Use Cases

### Use Case 1: Quick Identification
**Scenario:** Admin ingin cepat melihat tamu mana yang VIP

**Benefit:**
- Tidak perlu klik detail row
- Icon langsung terlihat di table
- Warna kuning mencolok

### Use Case 2: Differentiate VIP Types
**Scenario:** Admin ingin tahu tamu VIP Table atau VIP Souvenir

**Benefit:**
- Icon berbeda untuk setiap tipe
- Tooltip menjelaskan tipe VIP
- Bisa kombinasi keduanya

### Use Case 3: Sorting & Filtering
**Scenario:** Admin ingin fokus ke tamu VIP saja

**Benefit:**
- Visual cue yang jelas
- Mudah scan table
- Tidak perlu buka detail satu-satu

## 🎨 Styling

### Icon Spacing
```css
.ms-1 {
    margin-left: 0.25rem;
}
```

### Icon Color
```css
.text-warning {
    color: #ffc107 !important; /* Bootstrap warning color */
}
```

### Tooltip Styling
Bootstrap default tooltip styling:
- Background: Dark gray/black
- Text: White
- Arrow: Pointing to element
- Animation: Fade in/out

## 📱 Responsive

### Desktop
- Icon size: Default (inherit from parent)
- Tooltip: Muncul on hover
- Spacing: `ms-1` (0.25rem)

### Mobile
- Icon size: Same as desktop
- Tooltip: Muncul on tap/touch
- Spacing: Same as desktop

## 🔧 Customization

### Ubah Warna Icon
```javascript
// Dari text-warning (kuning) ke text-danger (merah)
'<i class="ri-vip-line text-danger ms-1" ...></i>'
```

### Ubah Icon
```javascript
// VIP Table: ri-vip-line → ri-vip-crown-line
'<i class="ri-vip-crown-line text-warning ms-1" ...></i>'

// VIP Souvenir: ri-vip-diamond-line → ri-gift-line
'<i class="ri-gift-line text-warning ms-1" ...></i>'
```

### Ubah Tooltip Text
```javascript
// Dari "VIP Table" ke "Table VIP"
title="Table VIP"

// Dari "VIP Souvenir" ke "Souvenir Spesial"
title="Souvenir Spesial"
```

### Ubah Posisi Icon
```javascript
// Icon di depan nama (sebelum)
${d.isTableVip ? '<i class="ri-vip-line text-warning me-1" ...></i>' : ''}
${d.name || "-"}

// Icon di bawah nama (new line)
${d.name || "-"}
<br>
${d.isTableVip ? '<i class="ri-vip-line text-warning" ...></i>' : ''}
```

## 🐛 Troubleshooting

### Tooltip Tidak Muncul

**Problem:** Tooltip tidak muncul saat hover

**Solution:**
1. Pastikan Bootstrap JS sudah di-load
2. Pastikan tooltip di-initialize setelah DOM ready
3. Check console untuk error

```javascript
// Debug: Check if Bootstrap is loaded
console.log(typeof bootstrap !== 'undefined' ? '✅ Bootstrap loaded' : '❌ Bootstrap not loaded');

// Debug: Check tooltip initialization
console.log('Tooltip elements:', document.querySelectorAll('[data-bs-toggle="tooltip"]').length);
```

### Icon Tidak Muncul

**Problem:** Icon VIP tidak muncul meskipun data `isTableVip` = true

**Solution:**
1. Check data di console: `console.log(d.isTableVip, d.isSouvenirVip)`
2. Pastikan Remix Icon CSS sudah di-load
3. Check network tab untuk icon font

### Icon Terlalu Besar/Kecil

**Problem:** Icon size tidak sesuai

**Solution:**
```javascript
// Tambah class untuk control size
'<i class="ri-vip-line text-warning ms-1 fs-6" ...></i>'

// fs-6 = font-size: 1rem
// fs-5 = font-size: 1.25rem
// fs-4 = font-size: 1.5rem
```

## 📚 References

### Remix Icon
- VIP Line: https://remixicon.com/ → Search "vip line"
- VIP Diamond: https://remixicon.com/ → Search "vip diamond"

### Bootstrap Tooltip
- Docs: https://getbootstrap.com/docs/5.3/components/tooltips/
- API: `new bootstrap.Tooltip(element, options)`

### Bootstrap Utilities
- Spacing: https://getbootstrap.com/docs/5.3/utilities/spacing/
- Colors: https://getbootstrap.com/docs/5.3/utilities/colors/

## ✅ Testing Checklist

- [ ] Icon VIP Table muncul untuk guest dengan `isTableVip: true`
- [ ] Icon VIP Souvenir muncul untuk guest dengan `isSouvenirVip: true`
- [ ] Kedua icon muncul untuk guest dengan keduanya true
- [ ] Tidak ada icon untuk guest regular (keduanya false)
- [ ] Tooltip "VIP Table" muncul saat hover icon crown
- [ ] Tooltip "VIP Souvenir" muncul saat hover icon diamond
- [ ] Icon spacing (ms-1) terlihat rapi
- [ ] Warna kuning (text-warning) terlihat jelas
- [ ] Tooltip muncul di mobile saat tap
- [ ] Tidak ada error di console

## 🚀 Future Enhancements

1. **Animated Icons**
   - Tambah animation saat hover
   - Pulse effect untuk VIP

2. **Custom Tooltip Style**
   - Warna tooltip sesuai tipe VIP
   - Icon di dalam tooltip

3. **Filter by VIP**
   - Button filter "Show VIP Only"
   - Highlight VIP rows

4. **VIP Badge**
   - Badge di samping nama
   - Lebih prominent dari icon

5. **VIP Count**
   - Counter di header table
   - "Showing 5 VIP guests"
