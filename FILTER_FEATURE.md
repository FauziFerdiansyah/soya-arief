# Advanced Filter Feature - Guest List

## ✨ Fitur

Filter lengkap untuk guest list dengan multiple criteria:
1. **Search by Name** - Cari berdasarkan nama tamu
2. **Filter by Source** - Filter berdasarkan undangan dari siapa
3. **VIP Table** - Filter tamu VIP Table
4. **VIP Souvenir** - Filter tamu VIP Souvenir
5. **Sudah Dilihat** - Filter tamu yang sudah membuka undangan
6. **RSVP Hadir** - Filter tamu yang sudah konfirmasi hadir
7. **Reset Button** - Reset semua filter

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Cari nama...]  [Undangan Dari ▼]  [Filters...]  [🔄] [Pag] │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Checkboxes:
- ☐ 👑 VIP Table
- ☐ 💎 VIP Souvenir
- ☐ 👁️ Sudah Dilihat
- ☐ ✓ RSVP Hadir

## 💻 Implementasi

### 1. HTML Structure

```html
<div class="row mb-3">
    <!-- Search Input -->
    <div class="col-md-3 mb-2">
        <input 
            type="text" 
            id="searchGuest" 
            class="form-control" 
            placeholder="🔍 Cari nama tamu..."
        >
    </div>

    <!-- Filter Undangan Dari -->
    <div class="col-md-2 mb-2">
        <select id="filterSource" class="form-select">
            <option value="">Semua Undangan Dari</option>
            <option value="Alfira">Alfira</option>
            <option value="Fauzi">Fauzi</option>
            <!-- ... more options ... -->
        </select>
    </div>

    <!-- Filter Checkboxes -->
    <div class="col-md-5 mb-2">
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       id="filterVipTable" value="vipTable">
                <label class="form-check-label" for="filterVipTable">
                    <i class="ri-vip-line text-warning"></i> VIP Table
                </label>
            </div>
            <!-- ... more checkboxes ... -->
        </div>
    </div>

    <!-- Reset & Pagination -->
    <div class="col-md-2 mb-2 d-flex gap-2 align-items-center">
        <button id="resetFilters" class="btn btn-sm btn-outline-secondary">
            <i class="ri-refresh-line"></i>
        </button>
        <nav>
            <ul id="paginationGuest" class="pagination pagination-sm mb-0"></ul>
        </nav>
    </div>
</div>
```

### 2. JavaScript - Filter Logic

```javascript
// ✅ Filter Function - Gabungan semua filter
function applyFilters() {
    const keyword = $("#searchGuest").val().toLowerCase();
    const sourceFilter = $("#filterSource").val();
    const vipTableFilter = $("#filterVipTable").is(":checked");
    const vipSouvenirFilter = $("#filterVipSouvenir").is(":checked");
    const openedFilter = $("#filterOpened").is(":checked");
    const rsvpFilter = $("#filterRsvp").is(":checked");

    filteredGuests = allGuests.filter(d => {
        const data = d.data;
        
        // Filter by name
        if (keyword && !data.name.toLowerCase().includes(keyword)) {
            return false;
        }

        // Filter by source (undangan dari)
        if (sourceFilter && data.source !== sourceFilter) {
            return false;
        }

        // Filter VIP Table
        if (vipTableFilter && !data.isTableVip) {
            return false;
        }

        // Filter VIP Souvenir
        if (vipSouvenirFilter && !data.isSouvenirVip) {
            return false;
        }

        // Filter Opened (sudah dilihat)
        if (openedFilter && !data.opened) {
            return false;
        }

        // Filter RSVP (sudah konfirmasi hadir)
        if (rsvpFilter && data.rsvpStatus !== "yes") {
            return false;
        }

        return true;
    });

    currentPage = 1;
    renderGuestTable(getPagedData());
    renderPagination();

    console.log(`🔍 Filter applied: ${filteredGuests.length} of ${allGuests.length} guests`);
}
```

### 3. Event Listeners

```javascript
// Search input
$("#searchGuest").on("input", applyFilters);

// Filter source dropdown
$("#filterSource").on("change", applyFilters);

// Filter checkboxes
$("#filterVipTable, #filterVipSouvenir, #filterOpened, #filterRsvp")
    .on("change", applyFilters);

// Reset filters
$("#resetFilters").on("click", function () {
    $("#searchGuest").val("");
    $("#filterSource").val("");
    $("#filterVipTable, #filterVipSouvenir, #filterOpened, #filterRsvp")
        .prop("checked", false);
    
    applyFilters();
    
    console.log("🔄 Filters reset");
});
```

## 🎯 Use Cases

### Use Case 1: Cari Tamu Spesifik
**Scenario:** Admin ingin mencari tamu bernama "Budi"

**Steps:**
1. Ketik "Budi" di search box
2. Table otomatis filter menampilkan semua tamu dengan nama mengandung "Budi"

**Result:**
```
Showing 3 of 150 guests
- Budi Santoso
- Budi Wijaya
- Ani Budiman
```

### Use Case 2: Filter VIP Table
**Scenario:** Admin ingin melihat semua tamu VIP Table

**Steps:**
1. Check checkbox "VIP Table"
2. Table otomatis filter menampilkan hanya tamu VIP Table

**Result:**
```
Showing 25 of 150 guests
All guests with 👑 icon
```

### Use Case 3: Kombinasi Filter
**Scenario:** Admin ingin melihat tamu VIP Table dari Alfira yang sudah dilihat

**Steps:**
1. Select "Alfira" di dropdown "Undangan Dari"
2. Check "VIP Table"
3. Check "Sudah Dilihat"

**Result:**
```
Showing 8 of 150 guests
- Pak Direktur 👑 (Opened: ✓)
- Bu Manager 👑 (Opened: ✓)
...
```

### Use Case 4: Filter RSVP Hadir
**Scenario:** Admin ingin tahu berapa tamu yang sudah konfirmasi hadir

**Steps:**
1. Check "RSVP Hadir"
2. Lihat jumlah hasil filter

**Result:**
```
Showing 87 of 150 guests
All guests with RSVP Status: Hadir
```

### Use Case 5: Reset Filter
**Scenario:** Admin ingin kembali melihat semua tamu

**Steps:**
1. Klik button Reset (🔄)
2. Semua filter di-clear
3. Table menampilkan semua tamu

**Result:**
```
Showing 150 of 150 guests
All filters cleared
```

## 📊 Filter Combinations

### Contoh Kombinasi Filter:

| Search | Source | VIP Table | VIP Souvenir | Opened | RSVP | Result |
|--------|--------|-----------|--------------|--------|------|--------|
| "Budi" | - | - | - | - | - | Semua tamu bernama Budi |
| - | Alfira | ✓ | - | - | - | VIP Table dari Alfira |
| - | - | ✓ | ✓ | - | - | VIP Table DAN Souvenir |
| - | - | - | - | ✓ | - | Sudah buka undangan |
| - | - | - | - | - | ✓ | Sudah RSVP hadir |
| "Pak" | - | ✓ | - | ✓ | ✓ | Nama "Pak", VIP Table, sudah buka, sudah RSVP |

## 🎨 Styling

### Filter Section
```css
.filter-section {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
}
```

### Checkbox Labels
```css
.form-check-label {
    font-size: 14px;
    cursor: pointer;
    user-select: none;
}

.form-check-label i {
    font-size: 16px;
    vertical-align: middle;
}
```

### Reset Button
```css
#resetFilters {
    border-radius: 8px;
    padding: 6px 12px;
    transition: all 0.2s ease;
}

#resetFilters:hover {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}
```

## 📱 Responsive Design

### Desktop (> 768px)
```
┌────────────┬──────────┬─────────────────────────┬────────┐
│ Search     │ Source   │ Checkboxes              │ Reset  │
└────────────┴──────────┴─────────────────────────┴────────┘
```

### Mobile (< 768px)
```
┌──────────────────────────────────────┐
│ Search                               │
├──────────────────────────────────────┤
│ Source                               │
├──────────────────────────────────────┤
│ ☐ VIP Table                          │
│ ☐ VIP Souvenir                       │
│ ☐ Sudah Dilihat                      │
│ ☐ RSVP Hadir                         │
├──────────────────────────────────────┤
│ [Reset] [Pagination]                 │
└──────────────────────────────────────┘
```

## 🔧 Customization

### Tambah Filter Baru

**1. Tambah Checkbox di HTML:**
```html
<div class="form-check">
    <input class="form-check-input" type="checkbox" 
           id="filterNewFilter" value="newFilter">
    <label class="form-check-label" for="filterNewFilter">
        <i class="ri-icon-name"></i> New Filter
    </label>
</div>
```

**2. Update JavaScript:**
```javascript
function applyFilters() {
    // ... existing filters ...
    const newFilter = $("#filterNewFilter").is(":checked");
    
    filteredGuests = allGuests.filter(d => {
        // ... existing conditions ...
        
        // New filter condition
        if (newFilter && !d.data.newField) {
            return false;
        }
        
        return true;
    });
}

// Add event listener
$("#filterNewFilter").on("change", applyFilters);

// Add to reset
$("#resetFilters").on("click", function () {
    // ... existing resets ...
    $("#filterNewFilter").prop("checked", false);
});
```

### Ubah Source Options

Edit dropdown options di HTML:
```html
<select id="filterSource" class="form-select">
    <option value="">Semua Undangan Dari</option>
    <option value="NewSource1">New Source 1</option>
    <option value="NewSource2">New Source 2</option>
</select>
```

## 🐛 Troubleshooting

### Filter Tidak Bekerja

**Problem:** Filter tidak memfilter data

**Solution:**
1. Check console untuk error
2. Pastikan event listener terpasang
3. Debug dengan console.log:

```javascript
function applyFilters() {
    console.log('Search:', $("#searchGuest").val());
    console.log('Source:', $("#filterSource").val());
    console.log('VIP Table:', $("#filterVipTable").is(":checked"));
    // ... debug other filters
}
```

### Reset Tidak Clear Filter

**Problem:** Reset button tidak clear semua filter

**Solution:**
Pastikan semua input di-reset:
```javascript
$("#resetFilters").on("click", function () {
    // Clear text input
    $("#searchGuest").val("");
    
    // Clear select
    $("#filterSource").val("");
    
    // Uncheck all checkboxes
    $("#filterVipTable, #filterVipSouvenir, #filterOpened, #filterRsvp")
        .prop("checked", false);
    
    // Apply filters
    applyFilters();
});
```

### Pagination Tidak Update

**Problem:** Pagination tidak update setelah filter

**Solution:**
Pastikan `currentPage` di-reset dan pagination di-render:
```javascript
function applyFilters() {
    // ... filter logic ...
    
    currentPage = 1; // ✅ Reset to page 1
    renderGuestTable(getPagedData());
    renderPagination(); // ✅ Re-render pagination
}
```

## 📈 Performance

### Optimization Tips:

1. **Debounce Search Input**
```javascript
let searchTimeout;
$("#searchGuest").on("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300); // Wait 300ms
});
```

2. **Cache Filter Values**
```javascript
const filterCache = {
    keyword: "",
    source: "",
    vipTable: false,
    // ... etc
};

function applyFilters() {
    // Update cache
    filterCache.keyword = $("#searchGuest").val().toLowerCase();
    // ... etc
}
```

3. **Lazy Rendering**
```javascript
// Only render visible rows (pagination)
function renderGuestTable(list) {
    // Render only current page data
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = list.slice(start, end);
    
    // Render pageData only
}
```

## ✅ Testing Checklist

- [ ] Search by name works
- [ ] Filter by source works
- [ ] VIP Table filter works
- [ ] VIP Souvenir filter works
- [ ] Opened filter works
- [ ] RSVP filter works
- [ ] Multiple filters work together (AND logic)
- [ ] Reset button clears all filters
- [ ] Pagination updates after filter
- [ ] Filter count shows correct number
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Checkboxes toggle correctly
- [ ] Dropdown selects correctly

## 🚀 Future Enhancements

1. **Filter Presets**
   - "VIP Only" button
   - "Belum Dilihat" button
   - "Belum RSVP" button

2. **Save Filter State**
   - Save to localStorage
   - Restore on page reload

3. **Export Filtered Data**
   - Export to Excel
   - Export to CSV
   - Only export filtered guests

4. **Filter Statistics**
   - Show count for each filter
   - "25 VIP Table, 18 VIP Souvenir"

5. **Advanced Search**
   - Search by phone number
   - Search by source name
   - Regex search

6. **Filter History**
   - Recent filters
   - Quick apply previous filter

7. **Bulk Actions on Filtered**
   - Send WhatsApp to filtered guests
   - Update VIP status for filtered guests
   - Delete filtered guests

## 📚 References

- Bootstrap Forms: https://getbootstrap.com/docs/5.3/forms/overview/
- Bootstrap Grid: https://getbootstrap.com/docs/5.3/layout/grid/
- jQuery Selectors: https://api.jquery.com/category/selectors/
- Array.filter(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
