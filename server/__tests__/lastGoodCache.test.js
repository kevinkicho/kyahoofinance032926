/**
 * Last-good cache: serve prior disk bag when today is missing — no mock payloads.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CACHE_DIR,
  todayStr,
  writeDailyCache,
  readBestAvailableCache,
  withCacheProvenance,
  isStructurallyHollow,
} from '../lib/cache.js';

const MARKET = `test_lastgood_${Date.now()}`;

function writeDay(day, data) {
  const fp = path.join(CACHE_DIR, `${MARKET}-${day}.json`);
  fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
  return fp;
}

function cleanup() {
  try {
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (f.startsWith(`${MARKET}-`)) fs.unlinkSync(path.join(CACHE_DIR, f));
    }
  } catch { /* ignore */ }
}

describe('readBestAvailableCache / last-good', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('returns today file as current when non-hollow', async () => {
    const today = todayStr();
    const data = {
      lastUpdated: today,
      yieldCurveData: { US: { '10y': 4.2, '2y': 3.9, '3m': 5, '30y': 4.5 } },
      spreadIndicators: { t10y2y: 0.3 },
      fredYieldHistory: { dates: Array.from({ length: 20 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`), values: Array(20).fill(4) },
    };
    // bonds hollow rules need curve + spreads/hist — use generic market without hollow rules
    writeDay(today, { ...data, metrics: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } });

    const best = await readBestAvailableCache(MARKET);
    expect(best).toBeTruthy();
    expect(best.isCurrent).toBe(true);
    expect(best.isStale).toBe(false);
    expect(best.fetchedOn).toBe(today);
    expect(best.data.metrics.a).toBe(1);
  });

  it('serves prior day when today missing (stale, real bag only)', async () => {
    const prior = '2020-01-15';
    writeDay(prior, {
      lastUpdated: prior,
      quotes: { AAPL: { price: 100 } },
      metrics: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
    });

    const best = await readBestAvailableCache(MARKET);
    expect(best).toBeTruthy();
    expect(best.fetchedOn).toBe(prior);
    expect(best.isCurrent).toBe(false);
    expect(best.isStale).toBe(true);
    expect(best.source).toMatch(/prior|gcs/);
    expect(best.data.quotes.AAPL.price).toBe(100);
  });

  it('withCacheProvenance tags isStale without inventing fields', () => {
    const body = withCacheProvenance(
      { quotes: { X: 1 } },
      { fetchedOn: '2020-01-01', isCurrent: false, isStale: true, isLive: false, source: 'prior_day' },
    );
    expect(body.quotes.X).toBe(1);
    expect(body.isStale).toBe(true);
    expect(body.isCurrent).toBe(false);
    expect(body.isLive).toBe(false);
    expect(body._cacheSource).toBe('prior_day');
    expect(body.fetchedOn).toBe('2020-01-01');
  });

  it('writeDailyCache does not write mock shells', () => {
    writeDailyCache(MARKET, { lastUpdated: todayStr() });
    // tiny/empty-ish may be skipped; ensure no invented quotes appear
    const latest = fs.readdirSync(CACHE_DIR).filter((f) => f.startsWith(`${MARKET}-`));
    for (const f of latest) {
      const j = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
      expect(j.mock).toBeUndefined();
      expect(j._fake).toBeUndefined();
    }
  });
});
