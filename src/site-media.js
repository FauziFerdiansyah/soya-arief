/**
 * Foto undangan yang dapat diganti dari panel admin.
 *
 * Dokumen Firestore: settings/siteMedia
 *   {
 *     slots:   { hero: item, groom: item, bride: item },
 *     gallery: [ item, ... ],
 *     updatedAt
 *   }
 *
 * item = { url, publicId, zoom, offsetX, offsetY, rotation }
 *
 * Berkas gambarnya sendiri disimpan di Cloudinary dan dilayani lewat CDN.
 * Firestore hanya menyimpan tautan dan komposisi (zoom, posisi, rotasi)
 * supaya foto bisa disusun ulang tanpa mengunggah lagi.
 */

export const MEDIA_COLLECTION = 'settings';
export const MEDIA_DOC_ID = 'siteMedia';
export const MEDIA_GALLERY_MAX = 12;
export const MEDIA_STORAGE_ROOT = 'site-media';

/** Slot foto tunggal, dikelola dari section terkait di menu Konten Website. */
export const MEDIA_SLOTS = [
  {
    key: 'hero',
    sectionId: 'hero',
    label: 'Foto Cover Utama',
    hint: 'Tampil di kotak foto pembuka. Rasio mengikuti bingkai 265 × 350.',
    aspect: '265 / 350',
    radius: '999px',
    folder: `${MEDIA_STORAGE_ROOT}/hero`,
    // maxEdge = batas kompresi saat unggah, sourceMax = acuan lebar kerja
    // saat memotong di Cloudinary. Keduanya sama supaya tidak ada
    // pembesaran gambar yang membuat hasilnya pecah.
    maxEdge: 2400,
    sourceMax: 2400,
  },
  {
    key: 'groom',
    sectionId: 'couple',
    label: 'Foto Mempelai Pria',
    hint: 'Kotak persegi 300 × 300.',
    aspect: '1 / 1',
    radius: '50px',
    folder: `${MEDIA_STORAGE_ROOT}/groom`,
    maxEdge: 2000,
    sourceMax: 2000,
  },
  {
    key: 'bride',
    sectionId: 'couple',
    label: 'Foto Mempelai Wanita',
    hint: 'Kotak persegi 300 × 300.',
    aspect: '1 / 1',
    radius: '50px',
    folder: `${MEDIA_STORAGE_ROOT}/bride`,
    maxEdge: 2000,
    sourceMax: 2000,
  },
];

export const GALLERY_SLOT = {
  key: 'gallery',
  label: 'Galeri Foto',
  aspect: '1 / 1',
  radius: '0px',
  folder: `${MEDIA_STORAGE_ROOT}/gallery`,
  // Cukup besar untuk lightbox, tetap ringan untuk thumbnail.
  maxEdge: 1800,
  sourceMax: 1800,
};

const SLOT_BY_KEY = new Map(MEDIA_SLOTS.map((slot) => [slot.key, slot]));

export const DEFAULT_TRANSFORM = { zoom: 1, offsetX: 50, offsetY: 50, rotation: 0 };

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

/** Hanya terima URL http/https, mis. tautan unduhan Firebase Storage. */
function isSafeMediaUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeTransform(raw) {
  return {
    zoom: Number(clamp(raw?.zoom, 1, 4, DEFAULT_TRANSFORM.zoom).toFixed(3)),
    offsetX: Math.round(clamp(raw?.offsetX, 0, 100, DEFAULT_TRANSFORM.offsetX)),
    offsetY: Math.round(clamp(raw?.offsetY, 0, 100, DEFAULT_TRANSFORM.offsetY)),
    rotation: [0, 90, 180, 270].includes(Number(raw?.rotation)) ? Number(raw.rotation) : 0,
  };
}

export function sanitizeMediaItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isSafeMediaUrl(raw.url)) return null;

  const publicId = typeof raw.publicId === 'string' ? raw.publicId.slice(0, 300) : '';

  return { url: String(raw.url), publicId, ...sanitizeTransform(raw) };
}

export function sanitizeMedia(raw) {
  const slots = {};
  const source = raw?.slots && typeof raw.slots === 'object' ? raw.slots : {};

  SLOT_BY_KEY.forEach((_slot, key) => {
    const item = sanitizeMediaItem(source[key]);
    if (item) slots[key] = item;
  });

  const gallery = (Array.isArray(raw?.gallery) ? raw.gallery : [])
    .map((item) => sanitizeMediaItem(item))
    .filter(Boolean)
    .slice(0, MEDIA_GALLERY_MAX);

  return { slots, gallery };
}

/**
 * Sisipkan transformasi Cloudinary ke URL supaya gambar dilayani dalam
 * ukuran dan format optimal (WebP/AVIF otomatis, kualitas otomatis). URL
 * non-Cloudinary dikembalikan apa adanya.
 *
 * Contoh: .../image/upload/v1/foo.webp -> .../image/upload/f_auto,q_auto,w_600/v1/foo.webp
 */
export function cloudinaryUrl(url, transform) {
  if (typeof url !== 'string' || !transform) return url;

  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (at < 0) return url;

  const head = url.slice(0, at + marker.length);
  const tail = url.slice(at + marker.length);
  return `${head}${transform}/${tail}`;
}

// Ukuran kirim tiap penggunaan. dpr_auto mengikuti kepadatan layar,
// w_ membatasi lebar maksimum sesuai kotaknya.
export const DELIVERY = {
  hero: 'f_auto,q_auto,w_700,dpr_auto',
  couple: 'f_auto,q_auto,w_600,dpr_auto',
  // Kotak galeri kecil (grid 2 kolom). q_auto:eco menekan ukuran lebih agresif.
  galleryThumb: 'f_auto,q_auto:eco,w_420,c_fill,dpr_auto',
  galleryFull: 'f_auto,q_auto,w_1600',
  adminThumb: 'f_auto,q_auto:eco,w_320,dpr_auto',
};

/**
 * Pratinjau interaktif di panel admin.
 *
 * Model komposisinya: foto di-cover ke kotak dengan posisi tengah, lalu
 * jendela tampilan sebesar 1/zoom digeser oleh offset. Model yang sama
 * direproduksi oleh Cloudinary saat foto dikirim ke undangan, sehingga
 * hasilnya identik.
 *
 * Fungsi ini hanya untuk pratinjau, bukan untuk halaman undangan.
 */
export function applyMediaTransform(image, item) {
  const transform = sanitizeTransform(item);

  // Ruang bebas tiap sisi akibat zoom, dalam persen ukuran elemen.
  const slack = Math.max(0, ((transform.zoom - 1) / 2) * 100);
  const translateX = ((50 - transform.offsetX) / 50) * slack;
  const translateY = ((50 - transform.offsetY) / 50) * slack;

  image.style.objectFit = 'cover';
  image.style.objectPosition = 'center center';
  image.style.transform =
    `translate(${translateX.toFixed(3)}%, ${translateY.toFixed(3)}%)`
    + ` rotate(${transform.rotation}deg) scale(${transform.zoom})`;
  image.style.transformOrigin = 'center center';
}

/**
 * Netralkan lazy loader kustom proyek (assets/js/lazyload.js).
 *
 * Loader itu menukar src setiap <img> dengan placeholder dan menyimpan URL
 * aslinya di data-lazy, lalu memulihkannya saat gambar mendekati viewport.
 * Karena foto di sini sudah kita pasang sendiri, data-lazy disamakan dengan
 * URL final. Tanpa ini, loader tersebut bisa menimpa foto yang sudah tampil
 * dengan placeholder lamanya.
 */
function markMediaAsLoaded(image, url) {
  image.setAttribute('data-lazy', url);
  image.classList.add('lazy-loaded');
}

/** Lepaskan gaya inline supaya CSS tema (termasuk mask) berlaku utuh. */
export function clearInlineComposition(image) {
  ['objectFit', 'objectPosition', 'transform', 'transformOrigin'].forEach((prop) => {
    image.style[prop] = '';
  });
}

function aspectToRatio(aspect) {
  return String(aspect).replace(/\s+/g, '').replace('/', ':');
}

/**
 * Bangun URL Cloudinary yang sudah memuat komposisi:
 *   a_<rot>            -> rotasi
 *   c_fill,ar_<rasio>  -> setara object-fit: cover pada kotak tujuan
 *   c_crop,w_,h_,x_,y_ -> jendela tampilan sebesar 1/zoom sesuai offset
 *   f_auto,q_auto,w_   -> format & ukuran kirim
 */
export function mediaDeliveryUrl(url, {
  transform,
  aspect,
  width,
  sourceMax = 2000,
  quality = 'q_auto',
}) {
  const composition = sanitizeTransform(transform);
  const ratio = aspectToRatio(aspect);
  const steps = [];

  if (composition.rotation) steps.push(`a_${composition.rotation}`);

  if (composition.zoom > 1.001) {
    // Perlu dua tahap: samakan rasio dulu, lalu potong jendela zoom.
    // Lebar kerja mengikuti batas unggah supaya tidak ada pembesaran.
    const region = Number((1 / composition.zoom).toFixed(4));
    const x = Number(((composition.offsetX / 100) * (1 - region)).toFixed(4));
    const y = Number(((composition.offsetY / 100) * (1 - region)).toFixed(4));

    steps.push(`c_fill,g_center,ar_${ratio},w_${sourceMax}`);
    steps.push(`c_crop,w_${region},h_${region},x_${x},y_${y}`);
    steps.push(`f_auto,${quality},w_${width},c_limit`);
  } else {
    // Tanpa zoom cukup satu tahap. Rantai yang lebih pendek membuat
    // Cloudinary jauh lebih cepat menghasilkan berkas pada permintaan
    // pertama, yang belum ada di cache CDN.
    steps.push(`c_fill,g_center,ar_${ratio},w_${width}`);
    steps.push(`f_auto,${quality}`);
  }

  // Tanpa dpr_auto: lebar akhir sudah dibuat lega, jadi pengali DPR hanya
  // akan meminta ukuran di atas sumbernya dan justru memburamkan gambar.
  return cloudinaryUrl(url, steps.join('/'));
}

// Lebar kirim dibuat lega agar tetap tajam di layar beresolusi tinggi.
const SLOT_WIDTH = { hero: 1100, groom: 900, bride: 900 };

/**
 * Undangan memakai foto yang SUDAH dipotong oleh Cloudinary, lalu gaya
 * inline dibersihkan. Ini penting karena tema memasang mask dekoratif pada
 * elemen <img>; kalau img-nya di-scale lewat CSS, mask dan tata letaknya
 * ikut membesar dan bergeser.
 */
function applySlot(key, item, root) {
  const image = root.querySelector(`img[data-media="${key}"]`);
  if (!image || !item) return 0;

  const slot = SLOT_BY_KEY.get(key);

  // Placeholder tetap tampil sampai foto benar-benar selesai dimuat.
  const done = () => image.classList.remove('media-skeleton');
  image.addEventListener('load', done, { once: true });
  image.addEventListener('error', done, { once: true });

  const url = mediaDeliveryUrl(item.url, {
    transform: item,
    aspect: slot?.aspect ?? '1 / 1',
    width: SLOT_WIDTH[key] ?? 900,
    sourceMax: slot?.sourceMax,
  });

  image.src = url;
  image.loading = 'eager';
  image.decoding = 'async';
  image.removeAttribute('srcset');
  markMediaAsLoaded(image, url);
  clearInlineComposition(image);
  if (image.complete) done();
  return 1;
}

/**
 * Item galeri TIDAK memakai atribut AOS.
 *
 * CSS AOS membuat elemen ber-data-aos mulai dari opacity 0, dan elemen yang
 * dibuat setelah AOS berinisialisasi tidak pernah terdaftar sehingga bisa
 * tetap tersembunyi. Animasi masuk galeri kini ditangani AOS pada wrapper
 * (.photo-body, ada di HTML awal) plus fade-in CSS murni per item.
 */
function buildGalleryItem(item, index) {
  const wrapper = document.createElement('span');
  wrapper.className = 'gallery-item';

  // Tautan memakai versi besar; hanya diunduh saat foto dibuka di lightbox.
  const link = document.createElement('a');
  link.href = mediaDeliveryUrl(item.url, {
    transform: item,
    aspect: GALLERY_SLOT.aspect,
    width: GALLERY_SLOT.sourceMax,
    sourceMax: GALLERY_SLOT.sourceMax,
  });

  const thumbUrl = mediaDeliveryUrl(item.url, {
    transform: item,
    aspect: GALLERY_SLOT.aspect,
    width: 560,
    sourceMax: GALLERY_SLOT.sourceMax,
  });

  const image = document.createElement('img');
  image.src = thumbUrl;
  image.className = 'img-photo';
  image.alt = `Galeri foto ${index + 1}`;
  // fetchpriority="low" membuat browser menunda unduhan sangat lama, jadi
  // tidak dipakai. Semua foto dimuat eager dengan prioritas normal; hanya
  // baris pertama yang ditinggikan.
  image.loading = 'eager';
  if (index < 4) image.setAttribute('fetchpriority', 'high');
  image.decoding = 'async';
  markMediaAsLoaded(image, thumbUrl);
  // Dimensi eksplisit mencegah pergeseran tata letak saat gambar masuk.
  image.width = 560;
  image.height = 560;
  // Foto sudah dipotong oleh Cloudinary, jadi tidak perlu transformasi CSS.

  link.appendChild(image);
  wrapper.appendChild(link);
  return wrapper;
}

function applyGallery(gallery, root) {
  const container = root.querySelector('[data-media-gallery]');
  if (!container || !gallery.length) return 0;

  container.replaceChildren(...gallery.map(buildGalleryItem));
  return gallery.length;
}

/** Terapkan seluruh foto tersimpan ke DOM undangan. */
export function applySiteMedia(raw, root = document) {
  const media = sanitizeMedia(raw);
  let applied = 0;

  Object.entries(media.slots).forEach(([key, item]) => {
    applied += applySlot(key, item, root);
  });

  applied += applyGallery(media.gallery, root);
  return applied;
}
