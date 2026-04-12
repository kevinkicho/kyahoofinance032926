import { Router } from 'express';
import { getApiCounts, KNOWN_LIMITS } from '../lib/rateLimits.js';
import { readLatestCache, todayStr, CACHE_DIR } from '../lib/cache.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

const CACHEABLE_MARKETS = [
  'bonds','derivatives','realEstate','insurance','commodities',
  'globalMacro','equityDeepDive','crypto','credit','sentiment','calendar'
];

const ERROR_LOG_MAX = 100;
const errorLog = [];

function logError(entry) {
  errorLog.unshift(entry);
  if (errorLog.length > ERROR_LOG_MAX) errorLog.length = ERROR_LOG_MAX;
}

// Catch errors from other routes and log them
router.use((req, res, next) => {
  const origEnd = res.end.bind(res);
  let errorCaptured = false;
  res.end = function(chunk, ...args) {
    if (res.statusCode >= 400 && !errorCaptured) {
      errorCaptured = true;
      logError({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent')?.substring(0, 120),
      });
    }
    return origEnd(chunk, ...args);
  };
  next();
});

// GET /api/analytics — main dashboard data
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
      minMs: m.minMs === Infinity ? 0 : m.minMs,
      p50Ms: m.recentMs?.length ? m.recentMs.sort((a, b) => a - b)[Math.floor(m.recentMs.length / 2)] : m.calls ? Math.round(m.totalMs / m.calls) : 0,
      errors: m.errors,
      errorPct: m.calls ? Math.round((m.errors / m.calls) * 100) : 0,
      lastCalled: m.lastCalled,
      recentErrors: m.recentErrors || [],
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
      let fileSizeKB = null;
      if (latest?.data) {
        try { fileSizeKB = Math.round(Buffer.byteLength(JSON.stringify(latest.data)) / 1024); } catch {}
      }
      let keyCount = 0;
      try {
        const data = latest?.data;
        if (data && typeof data === 'object') keyCount = Object.keys(data).length;
      } catch {}
      return {
        market,
        fetchedOn,
        isCurrent,
        ageHours,
        hasFileCache: !!latest,
        hasMemCache,
        fileSizeKB,
        keyCount,
      };
    }),
    currentCount: 0,
    staleCount: 0,
    noCacheCount: 0,
  };
  result.dataFreshness.currentCount = result.dataFreshness.markets.filter(m => m.isCurrent).length;
  result.dataFreshness.staleCount = result.dataFreshness.markets.filter(m => m.fetchedOn && !m.isCurrent).length;
  result.dataFreshness.noCacheCount = result.dataFreshness.markets.filter(m => !m.fetchedOn).length;

  // ── 4. Cache files: count, total size, details ──
  try {
    const allFiles = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    const fileDetails = allFiles.sort().reverse().map(f => {
      const fp = path.join(CACHE_DIR, f);
      let size = 0;
      let modified = null;
      try {
        const stat = fs.statSync(fp);
        size = stat.size;
        modified = stat.mtime.toISOString();
      } catch {}
      return { name: f, sizeKB: Math.round(size / 1024), modified };
    });
    const totalSize = fileDetails.reduce((s, f) => s + (f.sizeKB || 0), 0);
    result.cacheFiles = { count: allFiles.length, totalSizeKB: totalSize, files: fileDetails.slice(0, 30) };
  } catch {
    result.cacheFiles = { count: 0, totalSizeKB: 0, files: [] };
  }

  // ── 5. In-memory cache stats ──
  try {
    const memCache = req.app.locals.cache;
    if (memCache) {
      const keys = memCache.keys();
      const stats = memCache.getStats();
      result.memCache = {
        keyCount: keys.length,
        keys: keys.sort().slice(0, 50),
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0,
        ksize: stats.ksize,
        vsize: stats.vsize,
      };
    } else {
      result.memCache = { keyCount: 0, keys: [], hits: 0, misses: 0, hitRate: 0 };
    }
  } catch {
    result.memCache = { keyCount: 0, keys: [], hits: 0, misses: 0, hitRate: 0 };
  }

  // ── 6. Error log ──
  result.errorLog = errorLog.slice(0, 50);

  // ── 7. Server environment ──
  result.environment = {
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    freeMemGB: Math.round(os.freemem() / 1024 / 1024 / 1024),
    hostname: os.hostname(),
    pid: process.pid,
    cwd: process.cwd(),
    env: process.env.NODE_ENV || 'development',
  };

  // ── 8. Uptime & process ──
  const mem = process.memoryUsage();
  result.uptime = {
    seconds: Math.round(process.uptime()),
    memoryMB: Math.round(mem.heapUsed / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    externalMB: Math.round(mem.external / 1024 / 1024),
    arrayBuffersMB: Math.round(mem.arrayBuffers / 1024 / 1024),
  };

  // ── 9. Data source health (quick probe) ──
  result.sourceHealth = Object.entries(KNOWN_LIMITS).map(([name, limit]) => {
    const used = calls[name] || 0;
    let status = used > 0 ? 'ok' : 'idle';
    if (used / limit > 0.8) status = 'warning';
    if (used / limit >= 1) status = 'exhausted';
    return { name, status, used, limit, pct: Math.round((used / limit) * 100) };
  });

  // ── 10. Route registration ──
  try {
    const routes = [];
    function extractRoutes(stack, prefix = '') {
      for (const layer of stack) {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          routes.push({ path: prefix + layer.route.path, methods });
        } else if (layer.name === 'router' && layer.regexp) {
          const re = layer.regexp.source.replace(/^\\\//, '').replace(/\\/g, '');
          extractRoutes(layer.handle.stack, '/' + re.replace(/\/?\?\$/, ''));
        }
      }
    }
    extractRoutes(req.app._router.stack);
    result.routes = routes;
  } catch {
    result.routes = [];
  }

  res.json(result);
});

// GET /api/analytics/cache/:market — detailed cache content for a market
router.get('/cache/:market', (req, res) => {
  const { market } = req.params;
  const latest = readLatestCache(market);
  if (!latest) return res.status(404).json({ error: `No cache for ${market}` });
  res.json({ market, fetchedOn: latest.fetchedOn, dataSize: Buffer.byteLength(JSON.stringify(latest.data)), keys: Object.keys(latest.data), sample: Object.fromEntries(Object.entries(latest.data).slice(0, 5)) });
});

// GET /api/analytics/endpoint/:path — detailed history for an endpoint
router.get('/endpoint/:path', (req, res) => {
  const tracker = req.app.locals.endpointTracker;
  const epPath = '/' + req.params.path;
  const m = tracker?.[epPath];
  if (!m) return res.status(404).json({ error: `No tracking data for ${epPath}` });
  res.json({
    path: epPath,
    calls: m.calls,
    totalMs: m.totalMs,
    avgMs: m.calls ? Math.round(m.totalMs / m.calls) : 0,
    maxMs: m.maxMs,
    minMs: m.minMs === Infinity ? 0 : m.minMs,
    p50Ms: m.recentMs?.length ? m.recentMs.sort((a, b) => a - b)[Math.floor(m.recentMs.length / 2)] : 0,
    errors: m.errors,
    recentErrors: m.recentErrors || [],
    recentMs: m.recentMs || [],
  });
});

// DELETE /api/analytics/cache/:market — clear a market's file cache
router.delete('/cache/:market', (req, res) => {
  const { market } = req.params;
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'));
  for (const f of files) {
    try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch {}
  }
  // Also clear from memory cache
  req.app.locals.cache?.del(`route_${market}`);
  res.json({ cleared: files.length, files });
});

// POST /api/analytics/reset-counters — reset all external API call counters
router.post('/reset-counters', (req, res) => {
  // The rateLimits module resets daily automatically; force reset by rewriting the date
  res.json({ message: 'Counters reset daily at midnight. Force a restart to reset immediately.' });
});

export default router;