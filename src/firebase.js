/** Firebase bootstrap shared by the public invitation and webadmin. */
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
  deleteField,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
} from 'firebase/auth';


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

if (missing.length) {
  console.error('Konfigurasi Firebase belum lengkap:', missing.join(', '));
}

const isAdminPage = /\/webadmin(?:\/|$)/.test(window.location.pathname);
// Gunakan app bernama terpisah untuk halaman publik. Dengan begitu sesi
// anonymous tamu tidak dapat mengganti sesi admin pada origin yang sama.
const app = isAdminPage
  ? initializeApp(firebaseConfig)
  : initializeApp(firebaseConfig, 'public-invitation');
const db = getFirestore(app);
const auth = getAuth(app);

const firestoreApi = {
  collection, addDoc, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  deleteField, serverTimestamp, query, where, orderBy, limit,
};

const firebaseAuthApi = {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
};



// Persistence is configured before consumers inspect the initial user.
const authReady = setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.warn('Firebase Auth persistence tidak tersedia:', error);
  })
  .then(() => new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        console.error('Firebase Auth gagal diinisialisasi:', error);
        resolve(null);
      }
    );
  }));

window.firebaseApp = app;
window.db = db;
window.firestore = firestoreApi;
window.auth = auth;
window.firebaseAuth = firebaseAuthApi;
window.authReady = authReady;

authReady.then((user) => {
  window.dispatchEvent(new CustomEvent('firebase:ready', {
    detail: { app, db, auth, user },
  }));
});

console.log('✅ Firebase initialized (Firestore + Auth)');

export { app, db, auth, firestoreApi, firebaseAuthApi, authReady };