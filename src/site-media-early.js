/**
 * Muat foto, teks, dan preferensi tamu sedini mungkin.
 *
 * Modul ini sengaja TIDAK mengimpor Firebase SDK. Dengan memakai Firestore
 * REST API lewat fetch biasa, permintaannya tidak perlu menunggu bundle SDK
 * (ratusan kB) selesai diunduh dan diinisialisasi. Hasilnya foto galeri,
 * teks undangan, dan section "Turut Mengundang" tampil jauh lebih cepat,
 * terutama di koneksi dan CPU ponsel yang lambat.
 *
 * Ketiga dokumen di bawah dapat dibaca publik oleh firestore.rules.
 * Jalur SDK di site-content-public.js tetap dipertahankan sebagai cadangan
 * bila permintaan REST gagal, dan untuk hal yang butuh SDK seperti tracking.
 */
import { MEDIA_DOC_ID, applySiteMedia } from './site-media.js';
import { CONTENT_COLLECTION, CONTENT_DOC_ID, applySiteContent } from './site-content.js';
import { fetchDocumentFields } from './firestore-rest.js';

function guestIdFromUrl() {
  return new URLSearchParams(window.location.search).get('g');
}

async function loadMediaEarly() {
  try {
    const media = await fetchDocumentFields(['settings', MEDIA_DOC_ID]);
    if (!media) return; // dokumen belum ada: pakai foto bawaan

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

/**
 * Teks undangan, termasuk daftar nama "Turut Mengundang". SEO dan data acara
 * tetap ditangani jalur SDK karena keduanya butuh foto yang mungkin belum
 * selesai dimuat saat fungsi ini berjalan.
 */
async function loadContentEarly() {
  try {
    const fields = await fetchDocumentFields([CONTENT_COLLECTION, CONTENT_DOC_ID]);
    if (!fields?.content) return; // belum pernah disimpan: pakai teks markup

    const applied = applySiteContent(fields.content);
    if (!applied) return;

    window.siteContentApplied = true;
    window.dispatchEvent(new CustomEvent('sitecontent:applied', { detail: { applied } }));
    window.AOS?.refreshHard?.();
  } catch (error) {
    console.warn('Teks kustom tidak dapat dimuat, memakai teks bawaan:', error);
  }
}

/**
 * Preferensi tampilan tamu. Hanya dipakai untuk memutuskan section opsional,
 * jadi kegagalannya tidak mengganggu apa pun: custom.js tetap membaca dokumen
 * tamu yang sama lewat SDK untuk nama, RSVP, dan tracking.
 */
async function loadGuestEarly() {
  const guestId = guestIdFromUrl();
  if (!guestId) return;

  try {
    const guest = await fetchDocumentFields(['guest', guestId]);
    if (!guest) return;

    const preferences = {
      showInviters: guest.showInviters === true,
      musicTrack: guest.musicTrack === 'minang' ? 'minang' : 'default',
    };

    // custom.js bisa dieksekusi sebelum atau sesudah fetch ini selesai, jadi
    // hasilnya ditinggalkan di global sekaligus disiarkan sebagai event.
    window.__guestEarly = preferences;
    window.dispatchEvent(new CustomEvent('guest:early', { detail: preferences }));
  } catch (error) {
    console.warn('Preferensi tamu belum dapat dibaca lebih awal:', error);
  }
}

// Ketiganya berjalan paralel, lalu Firebase + jalur SDK dimuat dinamis supaya
// bundle SDK yang besar tidak menjadi dependensi statis modul ini.
loadMediaEarly();
loadContentEarly();
loadGuestEarly();
import('./site-content-public.js');
