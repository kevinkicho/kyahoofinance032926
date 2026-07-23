/**
 * Force a live re-fetch of a market payload (?refresh=1) and optionally
 * clear related browser layout keys so denser panel defaults apply.
 *
 * Used when server-side data fixes land but the client still shows
 * hollow/stale snapshots.
 */

import { MARKET_ENDPOINTS } from './marketEndpoints';

/**
 * @param {string} marketId e.g. 'credit' | 'calendar' | 'sentiment'
 * @param {{ clearLayoutKeys?: string[] }} [opts]
 * @returns {Promise<object>}
 */
export async function refreshMarket(marketId, opts = {}) {
  const path = MARKET_ENDPOINTS[marketId];
  if (!path) throw new Error(`Unknown market id: ${marketId}`);
  const url = path.includes('?') ? `${path}&refresh=1` : `${path}?refresh=1`;
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error(`refresh ${marketId} failed: ${res.status}`);
  const data = await res.json();

  if (Array.isArray(opts.clearLayoutKeys)) {
    for (const key of opts.clearLayoutKeys) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  }
  return data;
}

/** Layout storage keys that were bumped for denser defaults. */
export const LAYOUT_KEYS = {
  sentiment: 'sentiment-layout-v5',
  calendar: 'calendar-layout-v6',
  credit: 'credit-layout-v5',
  commodities: null,
};

/**
 * One-shot: refresh every tab-critical market that often goes hollow.
 */
export async function refreshCriticalMarkets() {
  const ids = ['credit', 'sentiment', 'calendar', 'commodities'];
  const results = {};
  for (const id of ids) {
    try {
      results[id] = { ok: true, data: await refreshMarket(id) };
    } catch (e) {
      results[id] = { ok: false, error: e.message };
    }
  }
  return results;
}
