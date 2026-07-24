import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import fs from 'fs';
import crypto from 'crypto';

import { cleanOldCaches, CACHE_DIR, todayStr, readLatestCache, requestContext } from './lib/cache.js';
import { buildSnapshotIndex } from './lib/stocks.js';
import { DATA_DIR } from './lib/stocks.js';
import { getApiCounts, KNOWN_LIMITS } from './lib/rateLimits.js';

// Route modules
import stocksRouter from './routes/stocks.js';
import macroRouter from './routes/macro.js';
import bondsRouter from './routes/bonds.js';
import derivativesRouter from './routes/derivatives.js';
import realEstateRouter from './routes/realEstate.js';
import insuranceRouter from './routes/insurance.js';
import commoditiesRouter from './routes/commodities.js';
import commoditiesEnhancedRouter from './routes/commoditiesEnhanced.js';
import globalMacroRouter from './routes/globalMacro.js';
import equityDeepDiveRouter from './routes/equityDeepDive.js';
import cryptoRouter from './routes/crypto.js';
import creditRouter from './routes/credit.js';
import sentimentRouter from './routes/sentiment.js';
import calendarRouter from './routes/calendar.js';
import fxRouter from './routes/fx.js';
import tickerRouter from './routes/ticker.js';
import institutionalRouter from './routes/institutional.js';
import analyticsRouter from './routes/analytics.js';
import watchlistRouter from './routes/watchlist.js';
import fredRouter from './routes/fred.js';
import imfRouter from './routes/imf.js';
import worldbankRouter from './routes/worldbank.js';
import blsRouter from './routes/bls.js';
import eiaRouter from './routes/eia.js';
import censusRouter from './routes/census.js';
import equitiesRouter from './routes/equities.js';
// Tier-1 additional public-data sources (added 2026-05-03). Server-only —
// not yet wired to UI panels; consumed via direct /api/<source> fetches
// or future cross-market reads.
import nyfedRouter from './routes/nyfed.js';
import fdicRouter from './routes/fdic.js';
import beaRouter from './routes/bea.js';
import edgarRouter from './routes/edgar.js';
import ecbRouter from './routes/ecb.js';
import eurostatRouter from './routes/eurostat.js';
import oecdRouter from './routes/oecd.js';
import treasuryTICRouter from './routes/treasuryTIC.js';
import treasuryAuctionsRouter from './routes/treasuryAuctions.js';
import treasuryDTSRouter from './routes/treasuryDTS.js';
import fedRouter from './routes/fed.js';
import msrbRouter from './routes/msrb.js';
import femaRouter from './routes/fema.js';
import usgsRouter from './routes/usgs.js';
import usdaRouter from './routes/usda.js';
import censusTradeRouter from './routes/censusTrade.js';
import eiaPetroleumRouter from './routes/eiaPetroleum.js';
import universeUpdatesRouter from './routes/universeUpdates.js';
import adminRouter from './routes/admin.js';
import cftcTFFRouter from './routes/cftcTFF.js';
import bisOTCRouter from './routes/bisOTC.js';
import faoRouter from './routes/fao.js';
import treasuryCostRouter from './routes/treasuryCost.js';
import panelRoutingRouter from './routes/panelRouting.js';
import { startFxWebSocket } from './lib/ws.js';

// ── Process-level stability handlers ──────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Unhandled promise rejection:', reason);
});

let server;
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Clean old caches at startup
cleanOldCaches();

// Warn operators about missing API keys so silent data-degradation is visible.
// Each route degrades gracefully on its own, but without this the failure mode
// is "the dashboard quietly shows less data" rather than an actionable signal.
(function warnOnMissingKeys() {
  const REQUIRED_KEYS = {
    FRED_API_KEY: 'bonds, commodities, credit, derivatives, equityDeepDive, fx, globalMacro, insurance, macro, realEstate, sentiment — census returns 503',
    EIA_API_KEY:  'commodities (petroleum/natgas series), eia',
    BLS_API_KEY:  'bls (returns 503), globalMacro (employment series)',
  };
  const missing = Object.entries(REQUIRED_KEYS).filter(([k]) => !process.env[k]);
  if (missing.length) {
    console.warn('\x1b[33m[env] Missing API keys — affected routes will serve partial or cached data:\x1b[0m');
    for (const [key, impact] of missing) {
      console.warn(`\x1b[33m  - ${key}: ${impact}\x1b[0m`);
    }
  }
})();

const app = express();
// Cloud Run / App Hosting inject PORT (e.g. 8080). Locally default to 3001 so
// Vite's proxy target stays stable; never use 0 in production (random ports
// fail the Cloud Run health check that expects $PORT).
const port = Number.parseInt(process.env.PORT, 10) || 3001;
const host = process.env.HOST || '0.0.0.0';

const localCache = new NodeCache({ stdTTL: 900 });

// Security headers — opt-in via `SECURITY_HEADERS=1` or auto-on when
// NODE_ENV=production. Loaded dynamically so dev environments without
// `helmet` installed continue to boot. The dashboard ships as a
// trusted-network app by default; flip this on for any deployment that
// reaches beyond localhost. See KNOWN_LIMITATIONS §10.
const wantSecurity = process.env.SECURITY_HEADERS === '1' || process.env.NODE_ENV === 'production';
if (wantSecurity) {
  try {
    const { default: helmet } = await import('helmet');
    app.use(helmet({
      // contentSecurityPolicy needs allowlisting Vite's inline scripts in
      // dev; leave it permissive here and tighten per-deployment.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));
    console.log('[security] helmet middleware enabled');
  } catch (e) {
    console.warn('[security] helmet not installed — run `npm i helmet` in server/ to enable security headers. Skipping.');
  }
}

// Same-origin SPA (production) needs no CORS. Dev Vite is on :5173.
// When CORS_ORIGIN=* or production Cloud Run, reflect request origin.
const corsOrigin = process.env.CORS_ORIGIN
  || (process.env.K_SERVICE || process.env.NODE_ENV === 'production'
    ? true
    : 'http://localhost:5173');
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// ?refresh=true|1 → skip daily file cache + in-memory cache for this request
// so DataProvider live loads always hit upstream APIs.
app.use('/api', (req, res, next) => {
  const skipCache =
    req.query?.refresh === 'true' ||
    req.query?.refresh === '1' ||
    req.headers['x-cache-bypass'] === '1';
  req.skipCache = skipCache;
  requestContext.run({ skipCache }, () => next());
});

// Endpoint metrics tracker (shared with /api/analytics)
const endpointTracker = {};
app.locals.endpointTracker = endpointTracker;

// Request logging + metrics tracking
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}[${req.method}]\x1b[0m ${req.originalUrl} ${status} ${ms}ms ${req.id}`);

    // Track endpoint metrics (normalize path to avoid per-ticker explosion)
    let ep = req.path.replace(/\/[A-Z]{1,5}$/, '/:ticker').replace(/\/\d+$/, '/:id');
    if (!endpointTracker[ep]) endpointTracker[ep] = { calls: 0, totalMs: 0, maxMs: 0, minMs: Infinity, errors: 0, lastCalled: null, recentMs: [], recentErrors: [] };
    const m = endpointTracker[ep];
    m.calls++;
    m.totalMs += ms;
    m.maxMs = Math.max(m.maxMs, ms);
    m.minMs = Math.min(m.minMs, ms);
    if (status >= 400) {
      m.errors++;
      m.recentErrors.unshift({ ts: new Date().toISOString(), status, ms });
      if (m.recentErrors.length > 20) m.recentErrors.length = 20;
    }
    m.recentMs.push(ms);
    if (m.recentMs.length > 100) m.recentMs.shift();
    m.lastCalled = new Date().toISOString();
  });
  next();
});

// HTTP cache headers — match in-memory TTL (15 min for market data, 5 min for health/status).
// Live refresh requests must not be stored by browsers or intermediate caches.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.skipCache || req.query?.refresh === 'true' || req.query?.refresh === '1') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    return next();
  }
  const short = ['/api/health', '/api/cache/status'];
  const maxAge = short.some(p => req.path === p || req.originalUrl === p) ? 300 : 900;
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`);
  next();
});

// Share cache with all routes via app.locals.
// get() respects ?refresh=true (requestContext.skipCache) so custom routes
// that only call cache.get() still bypass stale memory on live reloads.
app.locals.cache = {
  get: (key) => {
    const store = requestContext.getStore();
    if (store?.skipCache) return undefined;
    return localCache.get(key);
  },
  set: (key, val, ttl) => localCache.set(key, val, ttl),
  del: (key) => localCache.del(key),
  flushAll: () => localCache.flushAll(),
};

// ── Serve Vite-built frontend in production ───────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  // Hashed build assets are immutable; index.html must revalidate so deploys
  // don't leave browsers stuck requesting old /assets/* hashes that no longer
  // exist (those would hit the SPA fallback and return text/html → MIME errors).
  const assetsDir = path.join(distPath, 'assets');
  app.use('/assets', express.static(assetsDir, {
    maxAge: '1y',
    immutable: true,
    fallthrough: true,
  }));
  // Missing hashed files → plain 404 (not index.html, not error middleware 500).
  app.use('/assets', (req, res) => {
    res.status(404).type('text/plain').send(`Not found: ${req.originalUrl}`);
  });
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('version.json')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }
    },
  }));
}

// ── Inline health + cache status (tiny, no route module needed) ───────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), dataDir: DATA_DIR });
});

// FRED series health — fails soft; used by ops + density CI.
app.get('/api/health/series', async (req, res) => {
  try {
    const { CRITICAL_FRED_SERIES } = await import('./lib/dataHygiene.js');
    const { fetchFredLatestWithDate } = await import('./lib/fred.js');
    const key = (process.env.FRED_API_KEY || '').trim();
    if (!key) {
      return res.json({ status: 'skip', reason: 'FRED_API_KEY missing', series: [] });
    }
    const results = [];
    for (const spec of CRITICAL_FRED_SERIES) {
      try {
        const latest = await fetchFredLatestWithDate(spec.id, key);
        const ageDays = latest?.date
          ? Math.floor((Date.now() - new Date(`${latest.date}T12:00:00Z`).getTime()) / 86400000)
          : null;
        const ok = latest?.value != null
          && ageDays != null
          && ageDays <= (spec.maxAgeDays ?? 90);
        results.push({
          id: spec.id,
          name: spec.name,
          markets: spec.markets,
          value: latest?.value ?? null,
          date: latest?.date ?? null,
          ageDays,
          maxAgeDays: spec.maxAgeDays,
          ok,
        });
      } catch (e) {
        results.push({
          id: spec.id,
          name: spec.name,
          markets: spec.markets,
          value: null,
          date: null,
          ageDays: null,
          maxAgeDays: spec.maxAgeDays,
          ok: false,
          error: e.message,
        });
      }
    }
    const failed = results.filter((r) => !r.ok);
    res.json({
      status: failed.length ? 'degraded' : 'ok',
      checked: results.length,
      failed: failed.length,
      series: results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Keep this list in sync with the keys actually passed to writeDailyCache
// in server/routes/*.js — the cache-status panel reads files by these names.
// Note `equityDeepDive` is singular (matches the route's writeDailyCache key
// even though the URL is /api/equityDeepDive). `commodities_enhanced` is the
// v2 commodities cache; `commodities` (legacy) is kept until the legacy
// route is retired.
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','commodities_enhanced','globalMacro','equityDeepDive','crypto','credit','sentiment','calendar','fx','imf','worldbank','bls','eia','census','institutional','nyfed','fdic','bea','edgar','ecb','eurostat','oecd','treasuryTIC','treasuryAuctions','treasuryDTS'];
app.get('/api/cache/status', (_req, res) => {
  const today = todayStr();
  const status = {};
  for (const market of CACHEABLE_MARKETS) {
    const latest = readLatestCache(market);
    status[market] = latest
      ? { fetchedOn: latest.fetchedOn, isCurrent: latest.fetchedOn === today }
      : { fetchedOn: null, isCurrent: false };
  }
  res.json({ today, status });
});

app.get('/api/rate-limits', (_req, res) => {
  const { date, calls } = getApiCounts();
  const sources = Object.entries(KNOWN_LIMITS).map(([name, limit]) => ({
    name,
    used: calls[name] || 0,
    limit,
    pct: Math.round(((calls[name] || 0) / limit) * 100),
  }));
  res.json({ date, sources });
});

// ── Mount route modules ───────────────────────────────────────────────────────
app.use('/api/stocks', stocksRouter);
app.use('/api/equities', equitiesRouter);
app.use('/api/macro', macroRouter);
app.use('/api/bonds', bondsRouter);
app.use('/api/derivatives', derivativesRouter);
app.use('/api/realEstate', realEstateRouter);
app.use('/api/insurance', insuranceRouter);
app.use('/api/commodities', commoditiesRouter);
app.use('/api/commodities/v2', commoditiesEnhancedRouter);
app.use('/api/commoditiesEnhanced', commoditiesEnhancedRouter);
app.use('/api/globalMacro', globalMacroRouter);
app.use('/api/equityDeepDive', equityDeepDiveRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/credit', creditRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/fx', fxRouter);
app.use('/api/institutional', institutionalRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/fred', fredRouter);
app.use('/api/imf', imfRouter);
app.use('/api/worldbank', worldbankRouter);
app.use('/api/bls', blsRouter);
app.use('/api/eia', eiaRouter);
app.use('/api/census', censusRouter);
// Tier-1 public-data sources
app.use('/api/nyfed', nyfedRouter);
app.use('/api/fdic', fdicRouter);
app.use('/api/bea', beaRouter);
app.use('/api/edgar', edgarRouter);
app.use('/api/ecb', ecbRouter);
app.use('/api/eurostat', eurostatRouter);
app.use('/api/oecd', oecdRouter);
app.use('/api/treasury/tic', treasuryTICRouter);
app.use('/api/treasuryTIC', treasuryTICRouter);
app.use('/api/treasury/auctions', treasuryAuctionsRouter);
app.use('/api/treasuryAuctions', treasuryAuctionsRouter);
app.use('/api/treasury/dts', treasuryDTSRouter);
app.use('/api/treasuryDTS', treasuryDTSRouter);
app.use('/api/fed', fedRouter);
app.use('/api/msrb', msrbRouter);
app.use('/api/fema', femaRouter);
app.use('/api/usgs', usgsRouter);
app.use('/api/usda', usdaRouter);
app.use('/api/census-trade', censusTradeRouter);
app.use('/api/censusTrade', censusTradeRouter);
app.use('/api/eia-petroleum', eiaPetroleumRouter);
app.use('/api/eiaPetroleum', eiaPetroleumRouter);
app.use('/api/universeUpdates', universeUpdatesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/cftcTFF', cftcTFFRouter);
app.use('/api/bisOTC', bisOTCRouter);
app.use('/api/fao', faoRouter);
app.use('/api/treasuryCost', treasuryCostRouter);
// Panel API routing registry (discovery + health probe for every tab endpoint)
app.use('/api/panel-routing', panelRoutingRouter);
// Ticker routes: /api/summary/:ticker, /api/history/:ticker, /api/snapshot
app.use('/api', tickerRouter);

// ── SPA catch-all: serve index.html for any non-API route (production) ────────
// Express 5 / path-to-regexp v8 rejects bare `*` — use a middleware fallback
// instead of app.get('*') so Cloud Run can boot.
// Never SPA-fallback asset-like paths: a missing hashed file must 404, not
// return HTML (browsers then report "MIME type text/html" for module scripts).
const ASSET_EXT = /\.(js|mjs|cjs|css|map|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|txt|webmanifest)$/i;
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    if (req.path.startsWith('/assets/') || ASSET_EXT.test(req.path)) {
      res.status(404).type('text/plain').send(`Not found: ${req.path}`);
      return;
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// ── Express error-handling middleware ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[Express] Unhandled route error [${req.id}]:`, err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kick off snapshot index build at startup (non-blocking) — never block listen.
buildSnapshotIndex().catch((e) => console.warn('[snapshot]', e?.message || e));

// Bind ASAP so Cloud Run health checks succeed (must listen on $PORT).
server = app.listen(port, host, () => {
  const actualPort = server.address()?.port ?? port;
  try {
    const portFile = path.join(__dirname, '..', '.server-port');
    fs.writeFileSync(portFile, String(actualPort));
  } catch (e) {
    // Read-only FS on some hosts — fine; only used by local Vite proxy.
    console.warn('[port-file] skip write:', e?.message || e);
  }
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).length : 0;
  console.log(`Global Macro Backend listening on http://${host}:${actualPort}`);
  console.log(`  Local data cache: ${files} tickers in ${DATA_DIR}`);
  console.log(`  dist SPA: ${fs.existsSync(distPath) ? 'yes' : 'no (API only)'}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/commodities  /api/fx  /api/summary/:t  /api/history/:t  /api/analytics`);
  try {
    startFxWebSocket(server);
  } catch (e) {
    console.warn('[WS/FX] start failed (non-fatal):', e?.message || e);
  }

  // Warm primary tab markets in the background so the first browser wave hits
  // daily disk/memory cache instead of racing cold FRED/Yahoo timeouts.
  // Staggered to stay under FRED 120/min; non-blocking for listen health.
  const WARM_MARKETS = [
    'bonds', 'derivatives', 'realEstate', 'insurance', 'commodities',
    'globalMacro', 'equityDeepDive', 'crypto', 'credit', 'sentiment',
    'calendar', 'fx', 'macro',
  ];
  setTimeout(() => {
    const base = `http://127.0.0.1:${actualPort}`;
    console.log(`[warmup] Starting background cache warm for ${WARM_MARKETS.length} markets…`);
    (async () => {
      for (const m of WARM_MARKETS) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 120000);
          const r = await fetch(`${base}/api/${m}`, { signal: ctrl.signal });
          clearTimeout(t);
          console.log(`[warmup] ${m} → ${r.status}`);
        } catch (e) {
          console.warn(`[warmup] ${m} failed:`, e?.message || e);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      console.log('[warmup] Complete');
    })().catch((e) => console.warn('[warmup] aborted:', e?.message || e));
  }, 2000);
});

server.on('error', (err) => {
  console.error('[listen] failed:', err?.message || err);
  process.exit(1);
});
