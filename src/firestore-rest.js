/**
 * Pembaca dokumen Firestore lewat REST API, tanpa Firebase SDK.
 *
 * Dipakai oleh jalur "early" pada halaman undangan. Dengan fetch biasa,
 * permintaan data tidak perlu menunggu bundle SDK (ratusan kB) selesai
 * diunduh, diparse, dan diinisialisasi. Semua dokumen yang dibaca di sini
 * memang dapat dibaca publik menurut firestore.rules, sehingga cukup memakai
 * API key yang sudah publik.
 */

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;

/** Ubah satu nilai format REST Firestore menjadi nilai JavaScript biasa. */
export function decodeValue(value) {
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

export function decodeFields(fields = {}) {
  const result = {};
  Object.entries(fields).forEach(([key, value]) => {
    result[key] = decodeValue(value);
  });
  return result;
}

/**
 * Baca satu dokumen dan kembalikan fieldnya sebagai objek biasa.
 * Mengembalikan null bila dokumen tidak ada atau permintaan gagal.
 *
 * @param {string[]} segments Potongan path, mis. ['guest', guestId]. Tiap
 *   potongan di-encode terpisah supaya nilai dari URL tidak dapat menyisipkan
 *   segmen path tambahan.
 */
export async function fetchDocumentFields(segments) {
  if (!PROJECT_ID || !API_KEY) return null;
  if (!Array.isArray(segments) || segments.some((segment) => !segment)) return null;

  const path = segments.map((segment) => encodeURIComponent(segment)).join('/');
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}`
    + `/databases/(default)/documents/${path}?key=${encodeURIComponent(API_KEY)}`;

  const response = await fetch(endpoint);
  if (!response.ok) return null;

  const payload = await response.json();
  return decodeFields(payload?.fields);
}
