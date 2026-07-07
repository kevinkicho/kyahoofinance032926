import { MARKET_ENDPOINTS } from '../DataProvider';

export function computeFreshnessReport(marketsState, now = new Date()) {
  const report = {};
  for (const id of Object.keys(MARKET_ENDPOINTS)) {
    const m = marketsState?.[id];
    const fetchedAt = m?.fetchedOn ? new Date(m.fetchedOn) : null;
    const diff = fetchedAt ? (now - fetchedAt) / 1000 / 60 : Infinity;
    report[id] = {
      status: diff < 15 ? 'fresh' : diff < 60 ? 'stale' : 'outdated',
      ageMinutes: Number.isFinite(diff) ? Math.round(diff) : Infinity,
      timestamp: m?.fetchedOn || 'never',
    };
  }
  return report;
}
