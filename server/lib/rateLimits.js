// Simple in-memory API call counter per source.
// Resets daily. Tracks calls made from the server to external APIs.

const counters = {};
const dailyDate = { value: '' };

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function ensureToday() {
  const today = todayKey();
  if (dailyDate.value !== today) {
    // Reset all counters at midnight
    for (const key of Object.keys(counters)) counters[key] = 0;
    dailyDate.value = today;
  }
}

export function trackApiCall(source) {
  ensureToday();
  counters[source] = (counters[source] || 0) + 1;
}

export function getApiCounts() {
  ensureToday();
  return { date: dailyDate.value, calls: { ...counters } };
}

// Known rate limits for free tiers (requests/day)
export const KNOWN_LIMITS = {
  'Yahoo Finance': 2000,
  'FRED': 120,
  'CoinGecko': 30,
  'Alternative.me': 100,
  'CFTC Socrata': 1000,
  'DefiLlama': 300,
  'Mempool.space': 300,
  'Etherscan': 100,
  'EIA': 1000,
  'World Bank': 500,
  'EconDB': 500,
  'Treasury Fiscal Data': 1000,
  'Bybit': 600,
};
