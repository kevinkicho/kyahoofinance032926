/**
 * Consumer (default) vs Operator (diagnostic) mode.
 *
 * Consumer: progressive splash, payload chips, no full F/D/C mount.
 * Operator: ?verify=1 splash, bridge/true-UI chips, recovery tools.
 */

import { writeUserPrefs } from './userPrefs.js';

const STORAGE_KEY = 'hub-operator-mode';

export function readOperatorMode() {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('verify') === '1' || q.get('fdc') === '1' || q.get('operator') === '1') {
      return true;
    }
    if (q.get('operator') === '0' || q.get('consumer') === '1') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOperatorMode(on) {
  if (typeof window === 'undefined') return;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hub-operator-mode', { detail: { on: !!on } }));
    // Keep userPrefs in sync for future Firestore cloud prefs
    try { writeUserPrefs({ operatorMode: !!on }); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

export function subscribeOperatorMode(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(readOperatorMode());
  window.addEventListener('hub-operator-mode', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('hub-operator-mode', handler);
    window.removeEventListener('storage', handler);
  };
}
