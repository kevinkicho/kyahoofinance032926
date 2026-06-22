import { Router } from 'express';
import { getApiCounts, KNOWN_LIMITS } from '../lib/rateLimits.js';
import { readLatestCache, todayStr, CACHE_DIR } from '../lib/cache.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

const CACHEABLE_MARKETS = [
  'bonds','derivatives','realEstate','insurance','commodities',
  'globalMacro','equityDeepDive','crypto','credit','sentiment','calendar',
  'imf','worldbank','bls','eia','census',
];
const CACHEABLE_MARKET_SET = new Set(CACHEABLE_MARKETS);

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
      const sizeKB = size > 0 ? Math.max(1, Math.round(size / 1024)) : 0;
      const sizeDisplay = size > 0 ? (size < 1024 ? `${size}B` : `${sizeKB}KB`) : '0';
      return { name: f, sizeKB, sizeDisplay, modified };
    });
    const totalSize = fileDetails.reduce((s, f) => s + (f.sizeKB || 0), 0);
    result.cacheFiles = { count: allFiles.length, totalSizeKB: totalSize, files: fileDetails.slice(0, 30) };
  } catch {
    result.cacheFiles = { count: 0, totalSizeKB: 0, files: [] };
  }

  // ── 5. In-memory cache stats ──
  try {
    const memCache = req.app.locals.cache;
    if (memCache && typeof memCache.keys === 'function') {
      let keys = [];
      let hits = 0, misses = 0;
      try { keys = memCache.keys() || []; } catch { keys = []; }
      try { const stats = memCache.getStats(); if (stats) { hits = stats.hits || 0; misses = stats.misses || 0; } } catch {}
      result.memCache = {
        keyCount: keys.length,
        keys: keys.sort().slice(0, 50),
        hits,
        misses,
        hitRate: hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0,
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
    function extractRoutes(stack, prefix) {
      if (!stack || !Array.isArray(stack)) return;
      for (const layer of stack) {
        try {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
            if (methods.length) routes.push({ path: prefix + (layer.route.path || ''), methods });
          } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
            let routerPrefix = prefix;
            try {
              if (layer.regexp) {
                const re = layer.regexp.source.replace(/^\\\/\?/, '').replace(/\\/g, '');
                routerPrefix = prefix + '/' + re.replace(/\/?\?\$/, '');
              }
            } catch {}
            extractRoutes(layer.handle.stack, routerPrefix);
          }
        } catch {}
      }
    }
    if (req.app && req.app._router && req.app._router.stack) {
      extractRoutes(req.app._router.stack, '');
    }
    result.routes = routes;
  } catch {
    result.routes = [];
  }

  result._sources = { analytics: true };
  res.json(result);
});

// GET /api/analytics/cache/:market — detailed cache content for a market
router.get('/cache/:market', (req, res) => {
  const { market } = req.params;
  if (!CACHEABLE_MARKET_SET.has(market)) {
    return res.status(400).json({ error: 'Unknown market' });
  }
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

// GET /api/analytics/correlations — simultaneous anomalies across markets
router.get('/correlations', (req, res) => {
  const alerts = req.app.locals.currentAlerts || [];
  const markets = [...new Set(alerts.map(a => a.market))];
  const matrix = [];

  markets.forEach(m1 => {
    const row = markets.map(m2 => {
      const m1Alerts = alerts.filter(a => a.market === m1);
      const m2Alerts = alerts.filter(a => a.market === m2);
      const simultaneous = m1Alerts.filter(a1 => m2Alerts.some(a2 => a1.timestamp === a2.timestamp));
      return { m1, m2, count: simultaneous.length };
    });
    matrix.push(row);
  });

  res.json({ markets, matrix });
});

// DELETE /api/analytics/cache/:market — clear a market's file cache
router.delete('/cache/:market', (req, res) => {
  const { market } = req.params;
  if (!CACHEABLE_MARKET_SET.has(market)) {
    return res.status(400).json({ error: 'Unknown market' });
  }
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

// GET /api/analytics/panel-trace/:market — trace each panel's data pipeline
// Fetches the live API response for the market, inspects each field, and
// returns a structured trace showing field presence, data shape, _sources
// flags, and error info. Used by the Analytics Panel Trace Inspector.
router.get('/panel-trace/:market', async (req, res) => {
  const { market } = req.params;
  const MARKET_ENDPOINTS = {
    bonds: '/api/bonds', fx: '/api/fx', crypto: '/api/crypto',
    equities: '/api/equities', derivatives: '/api/derivatives',
    realEstate: '/api/realEstate', insurance: '/api/insurance',
    commodities: '/api/commoditiesEnhanced', globalMacro: '/api/globalMacro',
    credit: '/api/credit', sentiment: '/api/sentiment', calendar: '/api/calendar',
    equityDeepDive: '/api/equityDeepDive',
  };
  const endpoint = MARKET_ENDPOINTS[market];
  if (!endpoint) {
    return res.status(400).json({ error: `No endpoint for market "${market}"` });
  }

  // Resolve the base URL from socket (not Host header — SSRF-safe)
  const addr = req.socket?.localAddress;
  const port = req.socket?.localPort;
  const base = (addr && port)
    ? `http://${addr.includes(':') ? `[${addr}]` : addr}:${port}`
    : `http://localhost:${process.env.PORT || 3001}`;

  const traceStart = Date.now();
  try {
    const url = `${base}${endpoint}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'panel-trace-prober' },
      signal: AbortSignal.timeout(60000),
    });
    const fetchMs = Date.now() - traceStart;
    const status = r.status;
    const data = await r.json().catch(() => null);

    if (!data) {
      return res.json({
        market, endpoint, status, fetchMs,
        error: `Failed to parse JSON response (HTTP ${status})`,
        panels: [],
      });
    }

    // Inspect each top-level field and return a structured trace
    const sources = data._sources || {};
    const fields = Object.keys(data).filter(k => !k.startsWith('_'));
    const panels = fields.map(field => {
      const value = data[field];
      let shape = 'null';
      let count = 0;
      let sample = null;

      if (value === null) {
        shape = 'null';
      } else if (Array.isArray(value)) {
        shape = 'array';
        count = value.length;
        sample = value[0] ? JSON.stringify(value[0]).substring(0, 120) : null;
      } else if (typeof value === 'object') {
        const keys = Object.keys(value);
        shape = 'object';
        count = keys.length;
        // Check for nested arrays (typical chart data: { dates: [...], values: [...] })
        const nestedArrays = keys.filter(k => Array.isArray(value[k]));
        if (nestedArrays.length > 0) {
          shape = 'object_with_arrays';
          sample = nestedArrays.map(k => `${k}[${value[k].length}]`).join(', ');
        } else {
          sample = keys.slice(0, 6).join(', ');
        }
      } else {
        shape = typeof value;
        count = 1;
        sample = String(value).substring(0, 120);
      }

      // Find matching _sources key (fuzzy match)
      const sourceKey = Object.keys(sources).find(k =>
        k.toLowerCase().includes(field.toLowerCase().replace('History','').replace('Data','')) ||
        field.toLowerCase().includes(k.toLowerCase().replace(/\s*\(.*\)/,'').split(' ')[0].toLowerCase())
      );
      const sourceValue = sourceKey ? sources[sourceKey] : undefined;

      return {
        field,
        shape,
        count,
        sample,
        sourceKey: sourceKey || null,
        sourceValue: sourceValue !== undefined ? sourceValue : null,
        isNull: value === null,
        hasData: value !== null && (shape === 'array' ? count > 0 : shape === 'object' || shape === 'object_with_arrays' ? count > 0 : true),
      };
    });

    res.json({
      market,
      endpoint,
      status,
      fetchMs,
      isLive: data.isLive,
      isCurrent: data.isCurrent,
      fetchedOn: data.fetchedOn,
      lastUpdated: data.lastUpdated,
      totalFields: fields.length,
      nullFields: panels.filter(p => p.isNull).map(p => p.field),
      populatedFields: panels.filter(p => !p.isNull).length,
      sources,
      panels,
    });
  } catch (e) {
    res.json({
      market, endpoint,
      status: 0,
      fetchMs: Date.now() - traceStart,
      error: e.message,
      panels: [],
    });
  }
});

export default router;