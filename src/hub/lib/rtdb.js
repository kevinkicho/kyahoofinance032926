// Plain REST — not the Firebase client SDK. Used for historical date
// playback and optional VITE_USE_RTDB_SEED demos only.
const RTDB_ROOT =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_URL)
  || 'https://kfinance032926-default-rtdb.firebaseio.com';

export const RTDB_BASE = `${String(RTDB_ROOT).replace(/\/$/, '')}/marketSnapshots`;

/**
 * Load a market snapshot from the public RTDB REST endpoint.
 * - marketId: e.g. "bonds", "analytics", "censusTrade"
 * - date: optional "YYYY-MM-DD". If omitted, loads /latest (fast current view).
 * Returns {data, fetchedAt, source: 'rtdb', ...} or null.
 */
export async function loadFromRTDB(marketId, date = null) {
  try {
    const suffix = date ? `history/${date}` : 'latest';
    const url = `${RTDB_BASE}/${marketId}/${suffix}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload && payload.data) {
      return {
        data: payload.data,
        fetchedAt: payload.fetchedAt || null,
        source: 'rtdb',
        isLive: !date,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * List available historical dates for a market from RTDB.
 * Returns sorted array of "YYYY-MM-DD" strings (most recent first).
 */
export async function listSnapshotDates(marketId) {
  try {
    const url = `${RTDB_BASE}/${marketId}/history.json?shallow=true`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const keys = await res.json();
    if (!keys || typeof keys !== 'object') return [];
    return Object.keys(keys).sort().reverse();
  } catch {
    return [];
  }
}
