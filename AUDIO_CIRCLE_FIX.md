# Fix: Audio Circle Hilang Saat Scroll di Mobile & Z-Index Issue

## Masalah
1. Button audio circle (`#audioCircle`) hilang atau tidak terlihat saat user melakukan scroll di mobile phone (iOS Safari dan Android Chrome)
2. Audio circle muncul di atas welcome-section meskipun welcome-section memiliki z-index lebih tinggi (999999)

## Penyebab Utama

### Masalah 1: Hilang Saat Scroll
1. **Transform pada Body**: `body` menggunakan `transform: var(--gpu-acceleration)` yang membuat fixed positioning berubah menjadi relative terhadap parent, bukan viewport
2. **iOS Safari Bug**: iOS Safari memiliki bug dengan fixed positioning saat scroll
3. **Hardware Acceleration**: Kurangnya GPU acceleration yang tepat untuk fixed element

### Masalah 2: Z-Index Tidak Bekerja
1. **Stacking Context Berbeda**: Audio-circle berada di luar `.container`, sedangkan `.welcome-section` berada di dalam `.container`
2. **Container Properties**: `.container` menggunakan `contain: layout` yang membuat stacking context baru
3. **DOM Order**: Element yang di-render setelah (audio-circle) akan muncul di atas element sebelumnya (container) jika berada di stacking context berbeda

## Solusi yang Diterapkan

### 1. HTML Structure Fix (index.html)

**Pindahkan audio-circle ke dalam container:**

```html
<!-- SEBELUM: Audio-circle di luar container -->
<div class="container">
  <section class="welcome-section">...</section>
</div>
<button id="audioCircle">...</button>

<!-- SESUDAH: Audio-circle di dalam container -->
<div class="container">
  <section class="welcome-section">...</section>
  <button id="audioCircle">...</button>
</div>
```

Dengan memindahkan audio-circle ke dalam container, kedua element sekarang berada di **stacking context yang sama**, sehingga z-index bekerja dengan benar.

### 2. CSS Fixes (assets/css/custom.css)

#### a. Hapus Transform dari Body
```css
body {
  /* REMOVED: transform pada body karena akan break fixed positioning */
  /* transform: var(--gpu-acceleration); */
}
```

#### b. Update Z-Index Audio Circle
```css
.audio-circle {
  z-index: 999998 !important; /* Di bawah welcome-section (999999) */
}
```

#### c. Perkuat Audio Circle Styling
```css
.audio-circle {
  position: fixed !important;
  /* ... */
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  pointer-events: auto;
}
```

#### d. Mobile-Specific Fixes
```css
@media (max-width: 960px) {
  .audio-circle {
    position: fixed !important;
    bottom: 20px !important;
    left: 20px !important;
    z-index: 9999 !important;
    transform: translate3d(0, 0, 0) !important;
    -webkit-transform: translate3d(0, 0, 0) !important;
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
    will-change: auto !important;
    -webkit-overflow-scrolling: auto;
  }
}
```

#### e. iOS Safari Specific Fix
```css
@supports (-webkit-touch-callout: none) {
  .audio-circle {
    position: fixed !important;
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
  }
}
```

### 3. JavaScript Fixes (assets/js/custom.js)

Menambahkan function untuk memastikan audio circle tetap visible:

```javascript
(function fixAudioCircleOnMobile() {
  const audioCircle = document.getElementById('audioCircle');
  if (!audioCircle) return;

  function ensureAudioCircleVisible() {
    if (audioCircle) {
      // Force GPU acceleration
      audioCircle.style.transform = 'translate3d(0, 0, 0)';
      audioCircle.style.webkitTransform = 'translate3d(0, 0, 0)';
      
      // Ensure visibility
      audioCircle.style.visibility = 'visible';
      audioCircle.style.opacity = '0.8';
      
      // Ensure z-index
      audioCircle.style.zIndex = '9999';
    }
  }

  // Run on load, scroll, resize, and orientation change
  ensureAudioCircleVisible();
  window.addEventListener('scroll', throttledEnsure, { passive: true });
  window.addEventListener('resize', ensureAudioCircleVisible, { passive: true });
  window.addEventListener('orientationchange', ensureAudioCircleVisible);
})();
```

## Testing
Setelah fix ini diterapkan, test di:
- ✅ iOS Safari (iPhone)
- ✅ Android Chrome
- ✅ Desktop browsers
- ✅ Landscape dan portrait mode

## Catatan Penting
- **Jangan gunakan `transform` pada `body` atau `container`** karena akan membuat fixed positioning tidak bekerja dengan benar
- **Gunakan `translate3d(0, 0, 0)` hanya pada element yang membutuhkan GPU acceleration**, bukan pada parent
- **`!important`** diperlukan untuk override styling yang mungkin conflict
- **Stacking Context**: Element dengan `position: fixed` harus berada di stacking context yang sama agar z-index bekerja dengan benar
- **DOM Structure**: Pastikan element yang perlu di-layer dengan z-index berada di parent yang sama atau minimal di stacking context yang sama

## Penjelasan Teknis: Stacking Context

### Apa itu Stacking Context?
Stacking context adalah konsep 3D di CSS yang menentukan urutan layer element. Element dengan z-index hanya dibandingkan dengan element lain **di stacking context yang sama**.

### Properties yang Membuat Stacking Context Baru:
- `position: fixed` atau `position: absolute` dengan z-index selain auto
- `transform` dengan nilai selain none
- `opacity` kurang dari 1
- `contain: layout`, `contain: paint`, atau `contain: content`
- Dan lainnya...

### Contoh Masalah:
```html
<div class="parent-a" style="z-index: 1">
  <div class="child-a" style="z-index: 999999">A</div>
</div>
<div class="parent-b" style="z-index: 2">
  <div class="child-b" style="z-index: 1">B</div>
</div>
```

Meskipun `child-a` memiliki z-index 999999, `child-b` akan muncul di atas karena `parent-b` memiliki z-index lebih tinggi dari `parent-a`. Child element tidak bisa "keluar" dari stacking context parent-nya.

## Referensi
- [MDN: position fixed](https://developer.mozilla.org/en-US/docs/Web/CSS/position#fixed)
- [MDN: Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
- [CSS Tricks: Fixed positioning](https://css-tricks.com/fixed-positioning/)
- [iOS Safari fixed positioning issues](https://benfrain.com/ios-safari-and-position-fixed/)
