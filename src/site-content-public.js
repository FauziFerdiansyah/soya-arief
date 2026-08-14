/**
 * Terapkan konten dan foto yang diedit dari webadmin ke halaman undangan.
 *
 * Dokumen Firestore:
 *   settings/siteContent { content: { key: string }, updatedAt }
 *   settings/siteMedia   { slots, gallery, updatedAt }
 *
 * Keduanya dibaca publik. Bila belum ada atau gagal dibaca, halaman tetap
 * memakai teks dan foto bawaan yang tertulis di index.html.
 */
import { db, firestoreApi } from './firebase.js';
import {
  CONTENT_COLLECTION,
  CONTENT_DOC_ID,
  applySiteContent,
} from './site-content.js';
import {
  MEDIA_COLLECTION,
  MEDIA_DOC_ID,
  applySiteMedia,
} from './site-media.js';
import { applySiteSeo } from './site-seo.js';

/** Elemen hasil render dinamis perlu dihitung ulang oleh AOS. */
function refreshAos() {
  const run = () => window.AOS?.refreshHard?.();
  if (window.AOS) {
    window.requestAnimationFrame(run);
  } else {
    window.addEventListener('load', run, { once: true });
  }
}

async function loadSiteContent() {
  try {
    const snapshot = await firestoreApi.getDoc(
      firestoreApi.doc(db, CONTENT_COLLECTION, CONTENT_DOC_ID)
    );
    if (!snapshot.exists()) return;

    const content = snapshot.data()?.content;
    applySiteSeo(content, window.__siteMedia);

    const applied = applySiteContent(content);
    if (!applied) return;

    window.dispatchEvent(new CustomEvent('sitecontent:applied', { detail: { applied } }));
    // Tinggi welcome section dihitung dari isinya, jadi minta ulang setelah
    // teks berubah supaya layout tetap pas.
    window.dispatchEvent(new Event('resize'));
    refreshAos();
  } catch (error) {
    console.warn('Konten kustom tidak dapat dimuat, memakai teks bawaan:', error);
  }
}

/**
 * Cadangan: kalau pemuatan foto lewat REST (site-media-early.js) gagal,
 * coba sekali lagi memakai SDK yang sudah tersedia di halaman ini.
 */
async function loadSiteMediaFallback() {
  if (window.siteMediaApplied) return;

  try {
    const snapshot = await firestoreApi.getDoc(
      firestoreApi.doc(db, MEDIA_COLLECTION, MEDIA_DOC_ID)
    );
    if (!snapshot.exists()) return;

    const applied = applySiteMedia(snapshot.data());
    if (!applied) return;

    window.siteMediaApplied = true;
    // Galeri dibangun ulang, jadi lightGallery perlu memindai ulang itemnya.
    window.dispatchEvent(new CustomEvent('sitemedia:applied', { detail: { applied } }));
    refreshAos();
  } catch (error) {
    console.warn('Foto kustom tidak dapat dimuat, memakai foto bawaan:', error);
  }
}

loadSiteContent();
loadSiteMediaFallback();
