# 📚 AOS (Animate On Scroll) - Panduan Lengkap

## 🎯 Apa itu AOS?

AOS (Animate On Scroll) adalah library JavaScript yang ringan dan mudah digunakan untuk membuat animasi elemen HTML ketika elemen tersebut muncul di viewport saat user melakukan scroll. Library ini sangat populer karena mudah diimplementasikan dan memiliki performa yang baik.

## 🚀 Instalasi

### 1. Via CDN (Recommended untuk project ini)
```html
<!-- CSS -->
<link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">

<!-- JavaScript -->
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
```

### 2. Via NPM
```bash
npm install aos
```

### 3. Via Yarn
```bash
yarn add aos
```

## ⚙️ Setup Dasar

### 1. Inisialisasi AOS
```javascript
// Inisialisasi AOS setelah DOM ready
$(document).ready(function() {
    AOS.init();
});

// Atau dengan vanilla JavaScript
document.addEventListener('DOMContentLoaded', function() {
    AOS.init();
});
```

### 2. Konfigurasi Global
```javascript
AOS.init({
    // Pengaturan global
    duration: 1000,        // Durasi animasi (ms)
    easing: 'ease-in-out', // Jenis easing
    once: true,            // Animasi hanya sekali
    mirror: false,         // Animasi saat scroll ke atas
    offset: 120,           // Offset dari viewport (px)
    delay: 0,              // Delay sebelum animasi (ms)
    anchorPlacement: 'top-bottom' // Posisi anchor
});
```

## 🎨 Jenis-jenis Animasi

### 1. Fade Animations
```html
<!-- Fade In -->
<div data-aos="fade-up">Fade Up</div>
<div data-aos="fade-down">Fade Down</div>
<div data-aos="fade-left">Fade Left</div>
<div data-aos="fade-right">Fade Right</div>
<div data-aos="fade-up-right">Fade Up Right</div>
<div data-aos="fade-up-left">Fade Up Left</div>
<div data-aos="fade-down-right">Fade Down Right</div>
<div data-aos="fade-down-left">Fade Down Left</div>
```

### 2. Flip Animations
```html
<div data-aos="flip-left">Flip Left</div>
<div data-aos="flip-right">Flip Right</div>
<div data-aos="flip-up">Flip Up</div>
<div data-aos="flip-down">Flip Down</div>
```

### 3. Slide Animations
```html
<div data-aos="slide-up">Slide Up</div>
<div data-aos="slide-down">Slide Down</div>
<div data-aos="slide-left">Slide Left</div>
<div data-aos="slide-right">Slide Right</div>
```

### 4. Zoom Animations
```html
<div data-aos="zoom-in">Zoom In</div>
<div data-aos="zoom-in-up">Zoom In Up</div>
<div data-aos="zoom-in-down">Zoom In Down</div>
<div data-aos="zoom-in-left">Zoom In Left</div>
<div data-aos="zoom-in-right">Zoom In Right</div>
<div data-aos="zoom-out">Zoom Out</div>
<div data-aos="zoom-out-up">Zoom Out Up</div>
<div data-aos="zoom-out-down">Zoom Out Down</div>
<div data-aos="zoom-out-left">Zoom Out Left</div>
<div data-aos="zoom-out-right">Zoom Out Right</div>
```

## 🔧 Kustomisasi Per Elemen

### 1. Duration (Durasi)
```html
<div data-aos="fade-up" data-aos-duration="500">Cepat (500ms)</div>
<div data-aos="fade-up" data-aos-duration="1000">Normal (1000ms)</div>
<div data-aos="fade-up" data-aos-duration="2000">Lambat (2000ms)</div>
```

### 2. Delay (Penundaan)
```html
<div data-aos="fade-up" data-aos-delay="0">Tanpa delay</div>
<div data-aos="fade-up" data-aos-delay="200">Delay 200ms</div>
<div data-aos="fade-up" data-aos-delay="400">Delay 400ms</div>
<div data-aos="fade-up" data-aos-delay="600">Delay 600ms</div>
```

### 3. Easing (Percepatan)
```html
<div data-aos="fade-up" data-aos-easing="linear">Linear</div>
<div data-aos="fade-up" data-aos-easing="ease">Ease</div>
<div data-aos="fade-up" data-aos-easing="ease-in">Ease In</div>
<div data-aos="fade-up" data-aos-easing="ease-out">Ease Out</div>
<div data-aos="fade-up" data-aos-easing="ease-in-out">Ease In Out</div>
<div data-aos="fade-up" data-aos-easing="ease-in-back">Ease In Back</div>
<div data-aos="fade-up" data-aos-easing="ease-out-back">Ease Out Back</div>
<div data-aos="fade-up" data-aos-easing="ease-in-out-back">Ease In Out Back</div>
```

### 4. Offset (Jarak Trigger)
```html
<div data-aos="fade-up" data-aos-offset="50">Trigger 50px dari viewport</div>
<div data-aos="fade-up" data-aos-offset="200">Trigger 200px dari viewport</div>
```

### 5. Anchor Placement
```html
<div data-aos="fade-up" data-aos-anchor-placement="top-bottom">Top Bottom</div>
<div data-aos="fade-up" data-aos-anchor-placement="top-center">Top Center</div>
<div data-aos="fade-up" data-aos-anchor-placement="top-top">Top Top</div>
<div data-aos="fade-up" data-aos-anchor-placement="center-bottom">Center Bottom</div>
<div data-aos="fade-up" data-aos-anchor-placement="center-center">Center Center</div>
<div data-aos="fade-up" data-aos-anchor-placement="center-top">Center Top</div>
<div data-aos="fade-up" data-aos-anchor-placement="bottom-bottom">Bottom Bottom</div>
<div data-aos="fade-up" data-aos-anchor-placement="bottom-center">Bottom Center</div>
<div data-aos="fade-up" data-aos-anchor-placement="bottom-top">Bottom Top</div>
```

## 🎯 Contoh Implementasi dalam Project Wedding Web

### 1. Hero Section
```html
<section class="hero-section" data-aos="fade-left">
    <h2>Selamat Datang</h2>
    <p>Dengan penuh sukacita, kami mengundang Anda...</p>
</section>
```

### 2. Story Section dengan Staggered Animation
```html
<section class="story-section" data-aos="fade-up">
    <h3>Cerita Kami</h3>
    <p data-aos="fade-up" data-aos-delay="200">Pertemuan pertama kami...</p>
    <p data-aos="fade-up" data-aos-delay="400">Setelah 3 tahun bersama...</p>
</section>
```

### 3. Gallery dengan Zoom Effect
```html
<div class="gallery-grid">
    <div class="gallery-item" data-aos="zoom-in" data-aos-delay="100">
        <div class="placeholder-image">Foto 1</div>
    </div>
    <div class="gallery-item" data-aos="zoom-in" data-aos-delay="200">
        <div class="placeholder-image">Foto 2</div>
    </div>
    <div class="gallery-item" data-aos="zoom-in" data-aos-delay="300">
        <div class="placeholder-image">Foto 3</div>
    </div>
</div>
```

## 🔄 Method JavaScript

### 1. Refresh AOS
```javascript
// Refresh AOS setelah menambah konten dinamis
AOS.refresh();
```

### 2. Refresh Hard
```javascript
// Refresh dengan menghitung ulang semua offset dan posisi
AOS.refreshHard();
```

### 3. Disable/Enable AOS
```javascript
// Disable AOS
AOS.init({
    disable: true
});

// Disable AOS pada device tertentu
AOS.init({
    disable: 'mobile' // atau 'phone', 'tablet'
});

// Disable dengan function
AOS.init({
    disable: function() {
        return window.innerWidth < 768;
    }
});
```

## 📱 Responsive Considerations

### 1. Disable pada Mobile
```javascript
AOS.init({
    disable: 'mobile', // Disable pada mobile untuk performa
    duration: 1000,
    once: true
});
```

### 2. Conditional Animation
```javascript
AOS.init({
    disable: function() {
        var maxWidth = 768;
        return window.innerWidth < maxWidth;
    }
});
```

## ⚡ Tips Optimasi Performa

### 1. Gunakan `once: true`
```javascript
AOS.init({
    once: true // Animasi hanya sekali untuk menghemat resource
});
```

### 2. Batasi Jumlah Animasi
```html
<!-- Hindari terlalu banyak animasi dalam satu viewport -->
<div data-aos="fade-up">Element 1</div>
<div data-aos="fade-up" data-aos-delay="100">Element 2</div>
<div data-aos="fade-up" data-aos-delay="200">Element 3</div>
<!-- Maksimal 3-5 elemen per viewport -->
```

### 3. Gunakan Throttle
```javascript
AOS.init({
    throttleDelay: 99, // Throttle scroll event (default: 99ms)
    debounceDelay: 50  // Debounce resize event (default: 50ms)
});
```

## 🎨 Custom CSS untuk AOS

### 1. Custom Animation
```css
/* Custom fade animation */
[data-aos="custom-fade"] {
    opacity: 0;
    transition-property: opacity, transform;
}

[data-aos="custom-fade"].aos-animate {
    opacity: 1;
    transform: translateY(0);
}
```

### 2. Modify Existing Animation
```css
/* Modify fade-up animation */
[data-aos="fade-up"] {
    transform: translate3d(0, 100px, 0);
}

[data-aos="fade-up"].aos-animate {
    transform: translate3d(0, 0, 0);
}
```

## 🐛 Troubleshooting

### 1. Animasi Tidak Muncul
- Pastikan AOS.init() dipanggil setelah DOM ready
- Periksa apakah CSS AOS sudah di-load
- Pastikan elemen memiliki height yang cukup

### 2. Animasi Terlalu Cepat/Lambat
- Sesuaikan `duration` dan `delay`
- Gunakan `easing` yang tepat

### 3. Performa Lambat
- Gunakan `once: true`
- Disable pada mobile jika perlu
- Kurangi jumlah animasi per viewport

## 📖 Contoh Lengkap

```html
<!DOCTYPE html>
<html>
<head>
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
</head>
<body>
    <div data-aos="fade-up" 
         data-aos-duration="1000" 
         data-aos-delay="200" 
         data-aos-easing="ease-in-out"
         data-aos-once="true">
        Konten dengan animasi
    </div>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        });
    </script>
</body>
</html>
```

## 🔗 Resources

- [Official AOS GitHub](https://github.com/michalsnik/aos)
- [AOS Demo Page](https://michalsnik.github.io/aos/)
- [CDN Links](https://unpkg.com/aos@2.3.1/)

---

**💡 Tips Terakhir:**
- Gunakan animasi secara konsisten dalam satu project
- Jangan berlebihan dengan animasi - less is more
- Test pada berbagai device dan browser
- Pertimbangkan accessibility - beberapa user mungkin sensitive terhadap motion