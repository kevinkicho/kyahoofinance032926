// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Web app config for project kfinance032926 (App Hosting / client SDK).
// apiKey must come from VITE_FIREBASE_API_KEY (local .env / CI vars / App Hosting
// secrets) — never commit an AIza… value (guard:secrets).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kfinance032926.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://kfinance032926-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kfinance032926',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kfinance032926.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '989678779159',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:989678779159:web:2ef6f19ec34b5d99281552',
};

let auth = null;
let googleProvider = null;

if (firebaseConfig.apiKey) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (e) {
    console.warn('[Firebase] Client initialization failed:', e.message);
  }
}

export { auth, googleProvider, signInWithPopup, signOut };
