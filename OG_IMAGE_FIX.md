# Fix: OG Image Tidak Muncul di WhatsApp Web/Desktop

## 🐛 Masalah

Image preview tidak muncul saat URL di-share di WhatsApp Web atau WhatsApp Desktop (Windows), tapi muncul di WhatsApp Mobile (HP/MacBook).

## 🔍 Penyebab

WhatsApp Web/Desktop membutuhkan **absolute URL** (full URL dengan domain) untuk `og:image`, bukan relative path.

**Sebelum (Salah):**
```html
<meta property="og:image" content="assets/images/prewed/square.jpg">
```

**Sesudah (Benar):**
```html
<meta property="og:image" content="https://alfirafauzi.site/assets/images/prewed/square.jpg">
```

## ✅ Solusi yang Diterapkan

### 1. Update og:image dengan Absolute URL

```html
<!-- Open Graph (Facebook, WhatsApp, etc.) -->
<meta property="og:title" content="The Wedding of Alfira & Fauzi">
<meta property="og:description" content="Minggu, 23 November 2025 | Wedding Invitation">
<meta property="og:type" content="website">
<meta property="og:locale" content="id_ID">
<meta property="og:url" content="https://alfirafauzi.site/">
<meta property="og:image" content="https://alfirafauzi.site/assets/images/prewed/square.jpg">
<meta property="og:image:secure_url" content="https://alfirafauzi.site/assets/images/prewed/square.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="Alfira & Fauzi">
```

### 2. Update twitter:image dengan Absolute URL

```html
<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Wedding of Alfira & Fauzi">
<meta name="twitter:description" content="Minggu, 23 November 2025 | Wedding Invitation">
<meta name="twitter:image" content="https://alfirafauzi.site/assets/images/prewed/square.jpg">
<meta name="twitter:image:alt" content="Alfira & Fauzi">
```

### 3. Tambahan Meta Tags

- `og:url` - URL canonical website
- `og:image:secure_url` - HTTPS URL untuk image (required untuk WhatsApp)
- `og:image:type` - MIME type image
- `og:image:width` - Lebar image (recommended: 1200px)
- `og:image:height` - Tinggi image (recommended: 1200px untuk square)

## 📋 Checklist Meta Tags

### Required (Wajib):
- ✅ `og:title` - Judul
- ✅ `og:description` - Deskripsi
- ✅ `og:image` - **Absolute URL** image
- ✅ `og:url` - URL website

### Recommended (Disarankan):
- ✅ `og:type` - Tipe content (website)
- ✅ `og:locale` - Bahasa (id_ID)
- ✅ `og:image:secure_url` - HTTPS URL (penting untuk WhatsApp)
- ✅ `og:image:type` - MIME type
- ✅ `og:image:width` - Lebar image
- ✅ `og:image:height` - Tinggi image
- ✅ `og:image:alt` - Alt text

## 🖼️ Rekomendasi Image

### Ukuran Optimal:
- **Square (1:1):** 1200x1200px (untuk WhatsApp, Instagram)
- **Landscape (1.91:1):** 1200x630px (untuk Facebook, Twitter)

### Format:
- JPG atau PNG
- Max size: 8MB (WhatsApp), 5MB (Facebook)
- Min size: 200x200px

### Path:
- Gunakan **absolute URL**: `https://domain.com/path/to/image.jpg`
- Pastikan image accessible (tidak di-block robots.txt)
- Gunakan HTTPS (bukan HTTP)

## 🧪 Testing

### 1. Facebook Debugger
```
https://developers.facebook.com/tools/debug/
```
- Paste URL website
- Klik "Scrape Again" untuk refresh cache
- Check preview image

### 2. Twitter Card Validator
```
https://cards-dev.twitter.com/validator
```
- Paste URL website
- Check preview card

### 3. WhatsApp Link Preview
- Kirim URL ke chat pribadi
- Check apakah image muncul
- Test di:
  - WhatsApp Mobile (Android/iOS)
  - WhatsApp Web (Browser)
  - WhatsApp Desktop (Windows/Mac)

### 4. Manual Check
```bash
# Check meta tags
curl -s https://alfirafauzi.site/ | grep "og:image"

# Check image accessible
curl -I https://alfirafauzi.site/assets/images/prewed/square.jpg
```

## 🔄 Clear Cache

Jika image masih tidak muncul setelah update:

### 1. Clear WhatsApp Cache
- WhatsApp Web: Clear browser cache
- WhatsApp Desktop: Restart aplikasi

### 2. Clear Facebook Cache
- Gunakan Facebook Debugger
- Klik "Scrape Again"

### 3. Wait
- Cache bisa bertahan 7-30 hari
- URL baru akan langsung ter-scrape

## ⚠️ Common Issues

### Issue 1: Image Tidak Muncul di WhatsApp Web
**Cause:** Relative path
**Fix:** Gunakan absolute URL dengan HTTPS

### Issue 2: Image Muncul di Mobile tapi Tidak di Desktop
**Cause:** Missing `og:image:secure_url`
**Fix:** Tambahkan meta tag `og:image:secure_url`

### Issue 3: Image Blur atau Terpotong
**Cause:** Ukuran image tidak optimal
**Fix:** Gunakan 1200x1200px untuk square atau 1200x630px untuk landscape

### Issue 4: Image Lama Masih Muncul
**Cause:** Cache
**Fix:** Clear cache dengan Facebook Debugger atau tunggu

## 📱 Platform-Specific Notes

### WhatsApp:
- Prefer square images (1:1)
- Max size: 8MB
- Support: JPG, PNG, GIF
- Cache: ~7 hari

### Facebook:
- Prefer landscape (1.91:1)
- Recommended: 1200x630px
- Min: 200x200px
- Max: 8MB

### Twitter:
- summary_large_image: 2:1 ratio
- Recommended: 1200x600px
- Min: 300x157px
- Max: 5MB

### LinkedIn:
- Recommended: 1200x627px
- Min: 1200x627px
- Max: 5MB

## 🎯 Best Practices

1. **Always use absolute URLs** for og:image
2. **Use HTTPS** (not HTTP)
3. **Add og:image:secure_url** for WhatsApp compatibility
4. **Specify image dimensions** (width & height)
5. **Use optimal image size** (1200x1200px or 1200x630px)
6. **Compress images** untuk loading cepat
7. **Test on multiple platforms** sebelum launch
8. **Clear cache** saat update image

## 📚 References

- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [WhatsApp Link Preview Guide](https://faq.whatsapp.com/general/how-to-preview-links)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
