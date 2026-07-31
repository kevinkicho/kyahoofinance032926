// Firebase client — Auth only (Google sign-in for admin refresh / analytics).
// Market data does not use the client SDK; live path is Express /api + cache.
// Historical snapshots use plain REST in hub/lib/rtdb.js (not this module).
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// apiKey must come from VITE_FIREBASE_API_KEY (local .env / CI / App Hosting)
// — never commit an AIza… value (guard:secrets).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kfinance032926.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kfinance032926',
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
