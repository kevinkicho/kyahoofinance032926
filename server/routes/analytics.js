import { Router } from 'express';
import { getApiCounts, KNOWN_LIMITS } from '../lib/rateLimits.js';
import { readLatestCache, todayStr, CACHE_DIR } from '../lib/cache.js';
import fs from 'fs';
import path from 'path';

const router = Router();

const CACHEABLE_MARKETS = [
  'bonds','derivatives','realEstate','insurance','commodities',
  'globalMacro','equityDeepDive','crypto','credit','sentiment','calendar'
];

router.get('/', (req, res) => {
  const result = {};

  // ── 1. API Usage: external source call counts vs rate limits ──
  const { date, calls } = getApiCounts();
  result.apiUsage = {
    date,
    sources: Object.entries(KNOWN_LIMITS).map(([name, limit]) => ({
      name,
      used: calls[name] || 0,
      limit,
      pct: Math.round(((calls[name] || 0) / limit) * 100),
      remaining: limit - (calls[name] || 0),
    })),
    totalExternalCalls: Object.values(calls).reduce((s, v) => s + v, 0),
  };

  // ── 2. Endpoint metrics from the request tracker middleware ──
  const tracker = req.app.locals.endpointTracker;
  if (tracker) {
    result.endpoints = Object.entries(tracker).map(([path, m]) => ({
      path,
      calls: m.calls,
      avgMs: m.calls ? Math.round(m.totalMs / m.calls) : 0,
      maxMs: m.maxMs,
      minMs: m.minMs,
      errors: m.errors,
      errorPct: m.calls ? Math.round((m.errors / m.calls) * 100) : 0,
      lastCalled: m.lastCalled,
    }));
  } else {
    result.endpoints = [];
  }

  // ── 3. Data Freshness: cache status per market ──
  const today = todayStr();
  result.dataFreshness = {
    today,
    markets: CACHEABLE_MARKETS.map(market => {
      const latest = readLatestCache(market);
      const memCached = req.app.locals.cache?.get(`route_${market}`);
      const hasMemCache = !!memCached;
      const fetchedOn = latest?.fetchedOn || null;
      const isCurrent = fetchedOn === today;
      const ageHours = fetchedOn
        ? Math.round((Date.now() - new Date(fetchedOn + 'T00:00:00Z').getTime()) / 3600000)
        : null;
      return {
        market,
        fetchedOn,
        isCurrent,
        ageHours,
        hasFileCache: !!latest,
        hasMemCache,
      };
    }),
    currentCount: 0,
    staleCount: 0,
    noCacheCount: 0,
  };
  result.dataFreshness.currentCount = result.dataFreshness.markets.filter(m => m.isCurrent).length;
  result.dataFreshness.staleCount = result.dataFreshness.markets.filter(m => m.fetchedOn && !m.isCurrent).length;
  result.dataFreshness.noCacheCount = result.dataFreshness.markets.filter(m => !m.fetchedOn).length;

  // ── 4. Cache files: count, total size ──
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    let totalSize = 0;
    for (const f of files) {
      try { totalSize += fs.statSync(path.join(CACHE_DIR, f)).size; } catch {}
    }
    result.cacheFiles = { count: files.length, totalSizeKB: Math.round(totalSize / 1024), files: files.sort().reverse().slice(0, 20) };
  } catch {
    result.cacheFiles = { count: 0, totalSizeKB: 0, files: [] };
  }

  // ── 5. Uptime ──
  result.uptime = {
    seconds: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };

  res.json(result);
});

export default router;