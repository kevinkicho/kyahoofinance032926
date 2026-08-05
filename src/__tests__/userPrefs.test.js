import { describe, it, expect, beforeEach } from 'vitest';
import { readUserPrefs, writeUserPrefs, firestorePrefsPath } from '../hub/lib/userPrefs.js';

describe('userPrefs', () => {
  beforeEach(() => {
    localStorage.removeItem('hub-user-prefs-v1');
  });

  it('defaults empty', () => {
    const p = readUserPrefs();
    expect(p.operatorMode).toBe(false);
    expect(p.activeMarket).toBeNull();
  });

  it('merges and persists', () => {
    writeUserPrefs({ activeMarket: 'bonds', currency: 'EUR' });
    const p = readUserPrefs();
    expect(p.activeMarket).toBe('bonds');
    expect(p.currency).toBe('EUR');
    expect(p.updatedAt).toBeGreaterThan(0);
  });

  it('firestore path helper', () => {
    expect(firestorePrefsPath('uid1')).toBe('userPrefs/uid1');
    expect(firestorePrefsPath(null)).toBeNull();
  });
});
