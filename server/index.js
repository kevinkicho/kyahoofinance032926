import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import fs from 'fs';

import { cleanOldCaches, CACHE_DIR, todayStr, readLatestCache } from './lib/cache.js';
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
import globalMacroRouter from './routes/globalMacro.js';
import equityDeepDiveRouter from './routes/equityDeepDive.js';
import cryptoRouter from './routes/crypto.js';
import creditRouter from './routes/credit.js';
import sentimentRouter from './routes/sentiment.js';
import calendarRouter from './routes/calendar.js';
import fxRouter from './routes/fx.js';
import tickerRouter from './routes/ticker.js';

// ── Process-level stability handlers ──────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  console.error(err.stack);
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

const app = express();
const port = 3001;
const cache = new NodeCache({ stdTTL: 900 }); // 15 min default

app.use(cors());
app.use(express.json());

// Request logging — method, path, status, duration
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}[${req.method}]\x1b[0m ${req.originalUrl} ${status} ${ms}ms`);
  });
  next();
});

// HTTP cache headers — match in-memory TTL (15 min for market data, 5 min for health/status)
app.use('/api', (req, res, next) => {
  // Skip caching for POST (stock quotes are user-specific ticker lists)
  if (req.method !== 'GET') return next();
  const short = ['/api/health', '/api/cache/status'];
  const maxAge = short.some(p => req.path === p || req.originalUrl === p) ? 300 : 900;
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`);
  next();
});

// Share cache with all routes via app.locals
app.locals.cache = cache;

// ── Serve Vite-built frontend in production ───────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── Inline health + cache status (tiny, no route module needed) ───────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), dataDir: DATA_DIR });
});

const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit','sentiment','calendar'];
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
app.use('/api/macro', macroRouter);
app.use('/api/bonds', bondsRouter);
app.use('/api/derivatives', derivativesRouter);
app.use('/api/realEstate', realEstateRouter);
app.use('/api/insurance', insuranceRouter);
app.use('/api/commodities', commoditiesRouter);
app.use('/api/globalMacro', globalMacroRouter);
app.use('/api/equityDeepDive', equityDeepDiveRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/credit', creditRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/fx', fxRouter);
// Ticker routes: /api/summary/:ticker, /api/history/:ticker, /api/snapshot
app.use('/api', tickerRouter);

// ── SPA catch-all: serve index.html for any non-API route (production) ────────
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Express error-handling middleware ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Express] Unhandled route error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kick off snapshot index build at startup (non-blocking)
buildSnapshotIndex();

server = app.listen(port, () => {
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).length : 0;
  console.log(`Global Macro Backend running at http://localhost:${port}`);
  console.log(`  Local data cache: ${files} tickers in ${DATA_DIR}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/commodities  /api/fx  /api/summary/:t  /api/history/:t`);
});
