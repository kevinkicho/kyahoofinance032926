/**
 * User preferences — localStorage now; Firestore-ready shape for later sync.
 *
 * Collection (future): userPrefs/{uid}
 * Doc fields match PrefsState below.
 */

const STORAGE_KEY = 'hub-user-prefs-v1';

/**
 * @typedef {object} PrefsState
 * @property {string} [activeMarket]
 * @property {string} [theme]  'dark'|'light'
 * @property {boolean} [operatorMode]
 * @property {string} [currency]
 * @property {number} [updatedAt]
 */

const DEFAULTS = {
  activeMarket: null,
  theme: null,
  operatorMode: false,
  currency: null,
  updatedAt: 0,
};

export function readUserPrefs() {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Shallow-merge prefs and persist.
 * @param {Partial<PrefsState>} patch
 */
export function writeUserPrefs(patch) {
  if (typeof window === 'undefined') return readUserPrefs();
  const next = {
    ...readUserPrefs(),
    ...patch,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('hub-user-prefs', { detail: next }));
  } catch (e) {
    console.warn('[userPrefs] save failed:', e?.message || e);
  }
  return next;
}

export function subscribeUserPrefs(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(readUserPrefs());
  window.addEventListener('hub-user-prefs', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('hub-user-prefs', handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * Firestore document path for future cloud sync (not written client-side yet).
 * Server can implement POST /api/user/prefs with Auth.
 */
export function firestorePrefsPath(uid) {
  return uid ? `userPrefs/${uid}` : null;
}
