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

export function createInitialMarketState() {
  const state = {};
  const allIds = [...ALL_FETCH_IDS, ...Object.keys(FEDERATED_MARKETS), 'equities', 'watchlist', 'analytics'];
  const snapshot = loadSnapshot() || {};
  for (const id of allIds) {
    const snap = snapshot[id];
    const initialFetchLog = [];
    if (snap?.lastUpdated || snap?.fetchedOn) {
      initialFetchLog.push({
        time: snap.lastUpdated || snap.fetchedOn,
        url: MARKET_ENDPOINTS[id] ? `${MARKET_ENDPOINTS[id]} (Cached)` : 'Local Cache',
        status: 200,
        duration: 0,
        requestId: 'Cache',
        sources: snap.provenance?.sources || snap.data?._sources || null
      });
    }
    state[id] = {
      data: snap?.data || null,
      isLoading: false,
      isLive: snap?.isLive || false,
      lastUpdated: snap?.lastUpdated || null,
      fetchedOn: snap?.fetchedOn || null,
      isCurrent: snap?.isCurrent != null ? !!snap.isCurrent : !!snap?.isLive,
      error: null,
      fetchLog: initialFetchLog,
      refetch: null,
      provenance: snap?.provenance || {},
    };
  }
  return state;
}
