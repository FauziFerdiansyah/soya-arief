/**
 * Muat foto undangan sedini mungkin.
 *
 * Modul ini sengaja TIDAK mengimpor Firebase SDK. Dengan memakai Firestore
 * REST API lewat fetch biasa, permintaan foto tidak perlu menunggu bundle
 * SDK (ratusan kB) selesai diunduh dan diinisialisasi. Hasilnya gambar
 * galeri mulai terunduh jauh lebih cepat, terutama di koneksi lambat.
 *
 * Dokumen settings/siteMedia dapat dibaca publik oleh firestore.rules,
 * sehingga cukup memakai API key yang memang sudah publik.
 */
import { MEDIA_DOC_ID, applySiteMedia } from './site-media.js';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;

/** Ubah satu nilai format REST Firestore menjadi nilai JavaScript biasa. */
function decodeValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue);
  return undefined;
}

function decodeFields(fields = {}) {
  const result = {};
  Object.entries(fields).forEach(([key, value]) => {
    result[key] = decodeValue(value);
  });
  return result;
}

async function loadMediaEarly() {
  if (!PROJECT_ID || !API_KEY) return;

  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}`
    + `/databases/(default)/documents/settings/${MEDIA_DOC_ID}?key=${encodeURIComponent(API_KEY)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) return; // dokumen belum ada: pakai foto bawaan

    const payload = await response.json();
    const media = decodeFields(payload?.fields);
    // Disimpan agar modul SEO dapat memakai foto hero sebagai og:image.
    window.__siteMedia = media;

    const applied = applySiteMedia(media);
    if (!applied) return;

    window.siteMediaApplied = true;
    window.dispatchEvent(new CustomEvent('sitemedia:applied', { detail: { applied } }));
    window.AOS?.refreshHard?.();
  } catch (error) {
    console.warn('Foto kustom tidak dapat dimuat, memakai foto bawaan:', error);
  }
}

// Jalankan permintaan foto lebih dulu, lalu muat Firebase + konten teks
// secara dinamis. Dengan impor dinamis, bundle SDK yang besar tidak menjadi
// dependensi statis modul ini, sehingga tidak menahan eksekusinya.
loadMediaEarly();
import('./site-content-public.js');
