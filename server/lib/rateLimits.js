// Daily API-call counter per source. Persisted to disk so counts survive
// restarts within the same UTC day; resets automatically at the next UTC midnight.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'datacache');

const counters = {};
const dailyDate = { value: '' };
let loaded = false;
let writeTimer = null;
const WRITE_DEBOUNCE_MS = 2000;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function fileFor(date) {
  return path.join(CACHE_DIR, `rate-limits-${date}.json`);
}

function loadFromDisk(date) {
  try {
    const fp = fileFor(date);
    if (fs.existsSync(fp)) {
      const obj = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (obj && typeof obj === 'object') return obj;
    }
  } catch { /* best-effort */ }
  return {};
}

function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(fileFor(dailyDate.value), JSON.stringify(counters), 'utf8');
    } catch (e) { console.warn('[rateLimits] persist failed:', e.message); }
  }, WRITE_DEBOUNCE_MS);
  writeTimer.unref?.();
}

function ensureToday() {
  const today = todayKey();
  if (dailyDate.value !== today) {
    for (const key of Object.keys(counters)) delete counters[key];
    dailyDate.value = today;
    Object.assign(counters, loadFromDisk(today));
    loaded = true;
  } else if (!loaded) {
    Object.assign(counters, loadFromDisk(today));
    loaded = true;
  }
}

export function trackApiCall(source) {
  ensureToday();
  counters[source] = (counters[source] || 0) + 1;
  scheduleWrite();
}

export function getApiCounts() {
  ensureToday();
  return { date: dailyDate.value, calls: { ...counters } };
}

// Known rate limits for free tiers (requests/day)
export const KNOWN_LIMITS = {
  'Yahoo Finance': 2000,
  'FRED': 172800,
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
