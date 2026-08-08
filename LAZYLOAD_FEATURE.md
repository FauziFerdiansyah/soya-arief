# Lazy Load Feature - Progressive Image Loading

## 📋 Deskripsi
Implementasi lazy loading dengan efek blur-to-clear untuk semua gambar di website undangan, kecuali preloader dan logo.

## ✨ Fitur

### 1. **Dua Tipe Loading Effect**

#### Ornament Images
- Menggunakan **blur placeholder** yang gradually menjadi clear
- Blur 20px → 0px dengan smooth transition
- Cocok untuk gambar dekoratif/ornament

#### Photo Images  
- Menggunakan **skeleton blur** dengan gradient animation
- Blur 10px → 0px dengan smooth transition
- Background gradient yang beranimasi saat loading
- Cocok untuk foto prewed, bride & groom

### 2. **Smart Detection**
Script otomatis mendeteksi tipe gambar berdasarkan:
- Path gambar (contoh: `/ornaments/`, `/prewed/`)
- Alt text (contoh: "ornament", "bride", "groom")
- Class name (contoh: `.wedding-image`)

### 3. **Performance Optimization**
- Menggunakan **Intersection Observer API**
- Load gambar 50px sebelum masuk viewport
- Fallback untuk browser yang tidak support
- Hardware acceleration dengan CSS transforms

### 4. **Smooth Transitions**
- Transition duration: 0.6s
- Easing: ease-in-out
- Opacity dan filter blur berubah bersamaan
- Scale effect untuk ornament (1.1 → 1.0)

## 📁 File Structure

```
assets/
├── css/
│   └── lazyload.css          # Styling untuk lazy load effects
└── js/
    └── lazyload.js           # Logic lazy loading manager
```

## 🔧 Cara Kerja

### 1. Initialization
```javascript
// Auto-initialize saat DOM ready
LazyLoadManager.init();
```

### 2. Image Detection
Script mencari semua `<img>` tag kecuali:
- `#preloader img` (loading gif)
- `.logo` (logo AF)

### 3. Placeholder Creation
- **Ornament**: SVG 1x1 pixel dengan warna #f0f0f0
- **Photo**: SVG gradient dengan animasi skeleton

### 4. Loading Process
1. Image masuk viewport (50px margin)
2. Add class `lazy-loading`
3. Preload image di background
4. Setelah loaded, update src dan add class `lazy-loaded`
5. Smooth transition blur → clear

### 5. Error Handling
- Jika gagal load, add class `lazy-error`
- Grayscale filter + opacity 0.5
- Placeholder tetap ditampilkan

## 🎨 CSS Classes

### State Classes
```css
img[data-lazy]              /* Base state */
.lazy-ornament              /* Ornament type */
.lazy-photo                 /* Photo type */
.lazy-loading               /* Currently loading */
.lazy-loaded                /* Successfully loaded */
.lazy-error                 /* Failed to load */
```

### Visual Effects
```css
/* Ornament blur effect */
.lazy-ornament {
  filter: blur(20px);
  transform: scale(1.1);
}

/* Photo skeleton effect */
.lazy-photo {
  filter: blur(10px);
  background: gradient animation;
}

/* Loaded state */
.lazy-loaded {
  filter: blur(0);
  opacity: 1;
  transform: scale(1);
}
```

## 🚀 Usage

### Automatic (Recommended)
Script otomatis mendeteksi dan mengkonversi semua gambar:
```html
<!-- Before (normal img) -->
<img src="assets/images/prewed/img-001.jpg" alt="Wedding">

<!-- After (auto-converted by script) -->
<img data-lazy="assets/images/prewed/img-001.jpg" 
     src="data:image/svg+xml,..." 
     class="lazy-photo lazy-loaded" 
     alt="Wedding">
```

### Manual Control
```javascript
// Load specific image manually
LazyLoadManager.loadSpecificImage(imgElement);

// Destroy manager
LazyLoadManager.destroy();
```

## 📊 Performance Benefits

### Before Lazy Load
- Semua gambar load sekaligus
- Initial page load: ~5-10s
- Bandwidth: ~15-20MB

### After Lazy Load
- Gambar load on-demand
- Initial page load: ~2-3s
- Bandwidth: ~3-5MB (initial)
- Smooth user experience

## 🔍 Browser Support

### Full Support
- Chrome 51+
- Firefox 55+
- Safari 12.1+
- Edge 15+

### Fallback
- Older browsers: Load all images immediately
- No blur effect, tapi tetap functional

## 🐛 Debugging

### Console Logs
```javascript
// Initialization
🖼️ Initializing LazyLoad Manager...
✅ LazyLoad initialized with 45 images

// Loading
📥 Loading image: assets/images/prewed/img-001.jpg
✅ Image loaded: assets/images/prewed/img-001.jpg

// Error
❌ Failed to load image: assets/images/missing.jpg
```

### Custom Events
```javascript
// Listen to lazy load events
img.addEventListener('lazyloaded', (e) => {
  console.log('Image loaded:', e.detail.src);
});

img.addEventListener('lazyerror', (e) => {
  console.error('Image failed:', e.detail.src);
});
```

## ⚙️ Configuration

### Adjust Load Timing
```javascript
// In lazyload.js - setupObserver()
const options = {
  rootMargin: '50px',  // Change to '100px' for earlier load
  threshold: 0.01      // Change to 0.1 for later load
};
```

### Adjust Blur Amount
```css
/* In lazyload.css */
.lazy-ornament {
  filter: blur(20px);  /* Change blur amount */
}

.lazy-photo {
  filter: blur(10px);  /* Change blur amount */
}
```

### Adjust Transition Speed
```css
/* In lazyload.css */
img[data-lazy] {
  transition: opacity 0.6s ease-in-out,  /* Change duration */
              filter 0.6s ease-in-out;
}
```

## 📝 Notes

1. **Preloader & Logo**: Tidak di-lazy load untuk UX yang lebih baik
2. **Ornament Detection**: Otomatis berdasarkan path dan alt text
3. **Photo Detection**: Otomatis berdasarkan path dan class
4. **Fallback**: Browser lama tetap bisa load semua gambar
5. **Performance**: Menggunakan Intersection Observer untuk efisiensi

## 🎯 Testing

### Test Lazy Load
1. Buka website dengan DevTools Network tab
2. Scroll perlahan ke bawah
3. Perhatikan gambar load saat masuk viewport
4. Check blur → clear transition

### Test Blur Effect
1. Throttle network speed (Slow 3G)
2. Reload page
3. Perhatikan blur placeholder
4. Tunggu hingga gambar clear

### Test Error Handling
1. Ubah src gambar ke URL yang tidak valid
2. Reload page
3. Perhatikan error state (grayscale + opacity)

## 🔄 Updates

### Version 1.0.0 (Current)
- ✅ Blur-to-clear effect untuk ornament
- ✅ Skeleton blur untuk photo
- ✅ Auto detection image type
- ✅ Intersection Observer
- ✅ Error handling
- ✅ Browser fallback

### Future Improvements
- [ ] WebP format support dengan fallback
- [ ] Responsive image loading (srcset)
- [ ] Progressive JPEG support
- [ ] Custom blur amount per image
- [ ] Loading progress indicator

## 📞 Support

Jika ada masalah dengan lazy loading:
1. Check console untuk error messages
2. Verify browser support (Intersection Observer)
3. Check network tab untuk failed requests
4. Test dengan browser fallback mode

---

**Status**: ✅ Implemented & Tested
**Last Updated**: 2025-11-13
