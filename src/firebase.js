/**
 * Inisialisasi Firebase untuk seluruh halaman.
 *
 * Konfigurasi dibaca dari env VITE_* saat build. Bentuk global
 * (window.db / window.firestore) dipertahankan supaya kode lama di
 * public/assets/js/custom.js dan public/webadmin/assets/js/script.js
 * tidak perlu diubah strukturnya.
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(
    'Konfigurasi Firebase belum lengkap:',
    missing.join(', '),
    '- cek file .env.local atau GitHub Variables.'
  );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const firestoreApi = {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
};

window.firebaseApp = app;
window.db = db;
window.firestore = firestoreApi;

// Token tulis admin, dibaca oleh script.js di webadmin.
window.ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? '';

// Menandai Firebase siap, dipakai kode yang menunggu inisialisasi.
window.dispatchEvent(new CustomEvent('firebase:ready', { detail: { app, db } }));

console.log('✅ Firebase initialized (Vite + npm)');

export { app, db, firestoreApi };
