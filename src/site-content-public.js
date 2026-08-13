/**
 * Terapkan konten yang diedit dari webadmin ke halaman undangan.
 *
 * Dokumen Firestore: settings/siteContent { content: { key: string }, updatedAt }
 * Dibaca publik. Bila dokumen belum ada atau gagal dibaca, halaman tetap
 * memakai teks bawaan yang tertulis di index.html.
 */
import { db, firestoreApi } from './firebase.js';
import {
  CONTENT_COLLECTION,
  CONTENT_DOC_ID,
  applySiteContent,
} from './site-content.js';

async function loadSiteContent() {
  try {
    const snapshot = await firestoreApi.getDoc(
      firestoreApi.doc(db, CONTENT_COLLECTION, CONTENT_DOC_ID)
    );
    if (!snapshot.exists()) return;

    const applied = applySiteContent(snapshot.data()?.content);
    if (!applied) return;

    window.dispatchEvent(new CustomEvent('sitecontent:applied', { detail: { applied } }));
    // Tinggi welcome section dihitung dari isinya, jadi minta ulang setelah
    // teks berubah supaya layout tetap pas.
    window.dispatchEvent(new Event('resize'));

    // Daftar Turut Mengundang dibuat dinamis setelah respons Firestore.
    // Segarkan AOS supaya item baru memperoleh posisi dan animasinya.
    const refreshAos = () => window.AOS?.refreshHard?.();
    if (window.AOS) {
      window.requestAnimationFrame(refreshAos);
    } else {
      window.addEventListener('load', refreshAos, { once: true });
    }
  } catch (error) {
    console.warn('Konten kustom tidak dapat dimuat, memakai teks bawaan:', error);
  }
}

loadSiteContent();
