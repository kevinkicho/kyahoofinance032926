import { MARKET_ENDPOINTS, ALL_FETCH_IDS } from '../DataProvider';

export const SNAPSHOT_KEY = 'hub-markets-snapshot-v1';

export const FEDERATED_MARKETS = {
  alerts: { endpoints: ['sentiment', 'bonds', 'credit', 'crypto', 'commodities', 'fx'] },
};

export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch { return null; }
}

export function saveSnapshot(markets) {
  try {
    const slim = {};
    for (const [id, m] of Object.entries(markets)) {
      if (m?.data) {
        slim[id] = {
          data: m.data,
          lastUpdated: m.lastUpdated,
          fetchedOn: m.fetchedOn,
          isLive: m.isLive,
          isCurrent: m.isCurrent,
          provenance: m.provenance,
        };
      }
    }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn('[snapshot] save failed:', e?.message);
  }
}

function localTodayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function createInitialMarketState() {
  const state = {};
  const allIds = [...ALL_FETCH_IDS, ...Object.keys(FEDERATED_MARKETS), 'equities', 'watchlist', 'analytics'];
  const snapshot = loadSnapshot() || {};
  const today = localTodayStr();
  for (const id of allIds) {
    const snap = snapshot[id];
    const snapDay = String(snap?.fetchedOn || snap?.lastUpdated || '').slice(0, 10);
    // Drop previous-day localStorage seeds so the UI never paints as "7/22"
    // when the server already has today's daily cache ready.
    const snapIsToday = snapDay === today;
    const usableSnap = snapIsToday ? snap : null;
    const initialFetchLog = [];
    if (usableSnap?.lastUpdated || usableSnap?.fetchedOn) {
      initialFetchLog.push({
        time: usableSnap.lastUpdated || usableSnap.fetchedOn,
        url: MARKET_ENDPOINTS[id] ? `${MARKET_ENDPOINTS[id]} (Cached)` : 'Local Cache',
        status: 200,
        duration: 0,
        requestId: 'Cache',
        sources: usableSnap.provenance?.sources || usableSnap.data?._sources || null
      });
    }
    state[id] = {
      data: usableSnap?.data || null,
      // Keep loading true until first server wave so footers don't claim
      // yesterday's snapshot is "current" while the 7/23 fetch is in flight.
      isLoading: !usableSnap?.data,
      isLive: usableSnap?.isLive || false,
      lastUpdated: usableSnap?.lastUpdated || null,
      fetchedOn: usableSnap?.fetchedOn || null,
      isCurrent: usableSnap ? (usableSnap.isCurrent != null ? !!usableSnap.isCurrent : !!usableSnap.isLive) : false,
      error: null,
      fetchLog: initialFetchLog,
      refetch: null,
      provenance: usableSnap?.provenance || {},
    };
  }
  return state;
}
