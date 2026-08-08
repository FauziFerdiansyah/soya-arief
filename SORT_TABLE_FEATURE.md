# Table Sort Feature - Ascending/Descending

## ✨ Fitur

Sort table columns dengan klik pada header:
- **Nama Tamu** - Sort alphabetically (A-Z / Z-A)
- **Jumlah** - Sort by number (1-9 / 9-1)
- **Undangan Dari** - Sort alphabetically (A-Z / Z-A)
- **Dilihat** - Sort by status (Belum/Sudah)

## 🎨 Visual Indicators

### Default State (No Sort)
```
Nama Tamu ⇅
```
Icon: `ri-arrow-up-down-line` (opacity 50%)

### Ascending Sort
```
Nama Tamu ↑
```
Icon: `ri-arrow-up-line` (blue, opacity 100%)

### Descending Sort
```
Nama Tamu ↓
```
Icon: `ri-arrow-down-line` (blue, opacity 100%)

## 💻 Implementasi

### 1. HTML - Sortable Headers

```html
<thead>
    <tr>
        <th width="50" class="text-center"><i class="ri-eye-line"></i></th>
        
        <!-- Sortable: Nama Tamu -->
        <th class="sortable" data-sort="name">
            <span>Nama Tamu</span>
            <i class="ri-arrow-up-down-line sort-icon"></i>
        </th>
        
        <!-- Sortable: Jumlah -->
        <th class="sortable" data-sort="maxGuests">
            <span>Jumlah</span>
            <i class="ri-arrow-up-down-line sort-icon"></i>
        </th>
        
        <!-- Non-sortable: No HP -->
        <th>No HP</th>
        
        <!-- Sortable: Undangan Dari -->
        <th class="sortable" data-sort="source">
            <span>Undangan Dari</span>
            <i class="ri-arrow-up-down-line sort-icon"></i>
        </th>
        
        <th>Keterangan</th>
        
        <!-- Sortable: Dilihat -->
        <th class="sortable" data-sort="opened">
            <span>Dilihat</span>
            <i class="ri-arrow-up-down-line sort-icon"></i>
        </th>
        
        <th width="200" class="text-center">Aksi</th>
    </tr>
</thead>
```

**Key Points:**
- Class `sortable` untuk column yang bisa di-sort
- Attribute `data-sort` dengan nama field di data
- Icon `ri-arrow-up-down-line` sebagai default

### 2. JavaScript - Sort State

```javascript
// ✅ Sort state
let sortColumn = "createdAt"; // Default sort by created date
let sortDirection = "desc";   // desc = newest first
```

### 3. JavaScript - Sort Function

```javascript
// ✅ Sort function
function sortGuests(column) {
    // Toggle direction if same column, otherwise default to asc
    if (sortColumn === column) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = column;
        sortDirection = "asc";
    }

    // Sort filteredGuests
    filteredGuests.sort((a, b) => {
        let aVal = a.data[column];
        let bVal = b.data[column];

        // Handle different data types
        if (column === "name" || column === "source") {
            // String comparison
            aVal = (aVal || "").toLowerCase();
            bVal = (bVal || "").toLowerCase();
        } else if (column === "maxGuests") {
            // Number comparison
            aVal = aVal || 0;
            bVal = bVal || 0;
        } else if (column === "opened") {
            // Boolean comparison
            aVal = aVal ? 1 : 0;
            bVal = bVal ? 1 : 0;
        }

        // Compare
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    // Update UI
    updateSortIcons();
    currentPage = 1;
    renderGuestTable(getPagedData());
    renderPagination();

    console.log(`📊 Sorted by ${column} (${sortDirection})`);
}
```

### 4. JavaScript - Update Sort Icons

```javascript
// ✅ Update sort icons in table header
function updateSortIcons() {
    // Reset all icons
    $(".sortable .sort-icon")
        .removeClass("ri-arrow-up-line ri-arrow-down-line")
        .addClass("ri-arrow-up-down-line");
    
    // Update active column icon
    const activeIcon = $(`.sortable[data-sort="${sortColumn}"] .sort-icon`);
    activeIcon.removeClass("ri-arrow-up-down-line");
    
    if (sortDirection === "asc") {
        activeIcon.addClass("ri-arrow-up-line");
    } else {
        activeIcon.addClass("ri-arrow-down-line");
    }
}
```

### 5. JavaScript - Event Listener

```javascript
// ✅ Sort table columns
$(document).on("click", ".sortable", function () {
    const column = $(this).data("sort");
    sortGuests(column);
});
```

### 6. CSS - Sortable Styling

```css
.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
    position: relative;
}

.sortable:hover {
    background-color: rgba(0, 123, 255, 0.1);
}

.sortable .sort-icon {
    font-size: 14px;
    margin-left: 5px;
    opacity: 0.5;
    transition: opacity 0.2s ease, color 0.2s ease;
}

.sortable:hover .sort-icon {
    opacity: 1;
}

/* Active sort column */
.sortable .ri-arrow-up-line,
.sortable .ri-arrow-down-line {
    opacity: 1;
    color: var(--primary-color);
}
```

## 🎯 Use Cases

### Use Case 1: Sort by Name (A-Z)
**Scenario:** Admin ingin melihat tamu berurutan dari A-Z

**Steps:**
1. Klik header "Nama Tamu"
2. Icon berubah menjadi ↑ (ascending)
3. Table di-sort A-Z

**Result:**
```
Nama Tamu ↑
-----------
Ani Wijaya
Budi Santoso
Citra Dewi
...
```

### Use Case 2: Sort by Name (Z-A)
**Scenario:** Admin ingin melihat tamu berurutan dari Z-A

**Steps:**
1. Klik header "Nama Tamu" lagi
2. Icon berubah menjadi ↓ (descending)
3. Table di-sort Z-A

**Result:**
```
Nama Tamu ↓
-----------
Zaki Rahman
Yuni Kartika
Wati Sari
...
```

### Use Case 3: Sort by Jumlah Tamu
**Scenario:** Admin ingin melihat tamu dengan jumlah terbanyak

**Steps:**
1. Klik header "Jumlah"
2. Icon berubah menjadi ↑ (ascending: 1-9)
3. Klik lagi untuk descending (9-1)

**Result:**
```
Jumlah ↓
--------
5 Tamu
4 Tamu
3 Tamu
2 Tamu
1 Tamu
```

### Use Case 4: Sort by Status Dilihat
**Scenario:** Admin ingin melihat tamu yang sudah dilihat di atas

**Steps:**
1. Klik header "Dilihat"
2. Icon berubah menjadi ↑
3. Belum dilihat di atas, sudah dilihat di bawah
4. Klik lagi untuk reverse

**Result:**
```
Dilihat ↓
---------
✓ Sudah
✓ Sudah
✗ Belum
✗ Belum
```

### Use Case 5: Kombinasi Sort + Filter
**Scenario:** Admin filter VIP Table, lalu sort by name

**Steps:**
1. Check filter "VIP Table"
2. Klik header "Nama Tamu"
3. Table menampilkan VIP Table saja, sorted A-Z

**Result:**
```
Filtered: 25 VIP Table guests
Sorted: A-Z

Nama Tamu ↑
-----------
Ani (VIP Table)
Budi (VIP Table)
Citra (VIP Table)
...
```

## 📊 Sort Behavior

### Toggle Logic:
```
Click 1: ASC  (↑)
Click 2: DESC (↓)
Click 3: ASC  (↑)
...
```

### Different Column:
```
Current: Nama ↑
Click "Jumlah": Jumlah ↑ (default ASC)
```

### Data Type Handling:

| Column | Data Type | Sort Logic |
|--------|-----------|------------|
| Nama Tamu | String | Alphabetical (case-insensitive) |
| Jumlah | Number | Numeric (0-9) |
| Undangan Dari | String | Alphabetical (case-insensitive) |
| Dilihat | Boolean | false (Belum) → true (Sudah) |

### Null/Empty Handling:
- Empty strings → Treated as ""
- Null values → Treated as 0 or ""
- Undefined → Treated as 0 or ""

## 🎨 Visual States

### 1. Default (No Sort)
```css
.sort-icon {
    opacity: 0.5;
    color: inherit;
}
```

### 2. Hover
```css
.sortable:hover {
    background-color: rgba(0, 123, 255, 0.1);
}

.sortable:hover .sort-icon {
    opacity: 1;
}
```

### 3. Active (Sorted)
```css
.sortable .ri-arrow-up-line,
.sortable .ri-arrow-down-line {
    opacity: 1;
    color: var(--primary-color); /* Blue */
}
```

### 4. Click Animation
```css
.sortable:active .sort-icon {
    transform: scale(1.2);
}
```

## 🔧 Customization

### Tambah Column Sortable Baru

**1. Update HTML:**
```html
<th class="sortable" data-sort="newField">
    New Column 
    <i class="ri-arrow-up-down-line sort-icon"></i>
</th>
```

**2. Update Sort Function (jika perlu custom logic):**
```javascript
function sortGuests(column) {
    // ... existing code ...
    
    filteredGuests.sort((a, b) => {
        let aVal = a.data[column];
        let bVal = b.data[column];

        // Add custom handling for new field
        if (column === "newField") {
            // Custom comparison logic
            aVal = customTransform(aVal);
            bVal = customTransform(bVal);
        }
        
        // ... rest of code ...
    });
}
```

### Ubah Default Sort

```javascript
// Default sort by name (A-Z)
let sortColumn = "name";
let sortDirection = "asc";

// Default sort by newest first
let sortColumn = "createdAt";
let sortDirection = "desc";
```

### Ubah Sort Icons

```html
<!-- Ganti dengan icon lain -->
<i class="ri-sort-asc"></i>  <!-- Ascending -->
<i class="ri-sort-desc"></i> <!-- Descending -->
```

## 🐛 Troubleshooting

### Sort Tidak Bekerja

**Problem:** Klik header tidak sort table

**Solution:**
1. Check console untuk error
2. Pastikan event listener terpasang:
```javascript
$(document).on("click", ".sortable", function () {
    console.log("Sort clicked:", $(this).data("sort"));
});
```

### Icon Tidak Update

**Problem:** Icon tidak berubah setelah sort

**Solution:**
Pastikan `updateSortIcons()` dipanggil:
```javascript
function sortGuests(column) {
    // ... sort logic ...
    updateSortIcons(); // ✅ Call this
}
```

### Sort Tidak Akurat

**Problem:** Sort order tidak sesuai

**Solution:**
Check data type handling:
```javascript
// Debug sort values
filteredGuests.sort((a, b) => {
    let aVal = a.data[column];
    let bVal = b.data[column];
    
    console.log(`Comparing: ${aVal} vs ${bVal}`);
    
    // ... comparison logic ...
});
```

### Sort Reset Setelah Filter

**Problem:** Sort hilang setelah apply filter

**Solution:**
Re-apply sort setelah filter:
```javascript
function applyFilters() {
    // ... filter logic ...
    
    // Re-apply current sort
    if (sortColumn) {
        sortGuests(sortColumn);
    }
}
```

## 📈 Performance

### Optimization Tips:

1. **Sort Only Filtered Data**
```javascript
// ✅ Good: Sort filteredGuests (smaller dataset)
filteredGuests.sort(...);

// ❌ Bad: Sort allGuests (larger dataset)
allGuests.sort(...);
```

2. **Debounce Sort on Rapid Clicks**
```javascript
let sortTimeout;
$(document).on("click", ".sortable", function () {
    clearTimeout(sortTimeout);
    sortTimeout = setTimeout(() => {
        sortGuests($(this).data("sort"));
    }, 100);
});
```

3. **Cache Sort Results**
```javascript
const sortCache = {};

function sortGuests(column) {
    const cacheKey = `${column}_${sortDirection}`;
    
    if (sortCache[cacheKey]) {
        filteredGuests = sortCache[cacheKey];
    } else {
        // Perform sort
        filteredGuests.sort(...);
        sortCache[cacheKey] = [...filteredGuests];
    }
}
```

## ✅ Testing Checklist

- [ ] Click "Nama Tamu" → Sort A-Z
- [ ] Click "Nama Tamu" again → Sort Z-A
- [ ] Click "Jumlah" → Sort 1-9
- [ ] Click "Jumlah" again → Sort 9-1
- [ ] Click "Undangan Dari" → Sort A-Z
- [ ] Click "Dilihat" → Sort Belum/Sudah
- [ ] Icon changes to ↑ on ASC
- [ ] Icon changes to ↓ on DESC
- [ ] Active column icon is blue
- [ ] Inactive columns icon is gray
- [ ] Hover shows highlight
- [ ] Sort works with filters
- [ ] Pagination resets to page 1
- [ ] Console log shows sort info
- [ ] No errors in console

## 🚀 Future Enhancements

1. **Multi-Column Sort**
   - Sort by name, then by jumlah
   - Shift+Click for secondary sort

2. **Remember Sort State**
   - Save to localStorage
   - Restore on page reload

3. **Sort Indicator in Header**
   - Show "Sorted by: Nama (A-Z)"
   - Clear sort button

4. **Custom Sort Orders**
   - Drag to reorder rows
   - Save custom order

5. **Sort Animation**
   - Smooth transition when sorting
   - Highlight moved rows

6. **Export Sorted Data**
   - Export to Excel in current sort order
   - Maintain sort in export

## 📚 References

- Array.sort(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- Remix Icon: https://remixicon.com/
- Bootstrap Tables: https://getbootstrap.com/docs/5.3/content/tables/
- jQuery Events: https://api.jquery.com/category/events/
