import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import express, { Request, Response } from "express";
import cors from "cors";
import NodeCache from "node-cache";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const localCache = new NodeCache({ stdTTL: 900 });

app.locals.cache = {
  get: (key: string) => localCache.get(key),
  set: (key: string, val: any, ttl: number = 900) => localCache.set(key, val, ttl),
  del: (key: string) => localCache.del(key),
  flushAll: () => localCache.flushAll(),
};

app.use(cors({ origin: true }));
app.use(express.json({ limit: "256kb" }));

let routesLoaded = false;

function loadRoutes() {
  if (routesLoaded) return;
  
  const essentialRoutes = [
    'stocks', 'macro', 'bonds', 'derivatives', 'realEstate', 'insurance',
    'commodities', 'globalMacro', 'equityDeepDive', 'crypto', 'credit',
    'sentiment', 'calendar', 'fx', 'analytics', 'watchlist', 'fred',
    'bls', 'eia', 'census', 'ticker', 'bea', 'censusTrade', 'commoditiesEnhanced',
    'ecb', 'edgar', 'eiaPetroleum', 'eurostat', 'fdic', 'fed', 'fema',
    'imf', 'institutional', 'msrb', 'nyfed', 'oecd', 'treasuryAuctions',
    'treasuryDTS', 'treasuryTIC', 'usda', 'usgs', 'worldbank'
  ];

  let commoditiesEnhancedRouter: any = null;

  for (const route of essentialRoutes) {
    try {
      const module = require(path.join(__dirname, "routes", `${route}.js`));
      const router = module.default || module;
      if (route === 'ticker') {
        app.use("/api", router);
      } else if (route === 'commoditiesEnhanced') {
        commoditiesEnhancedRouter = router;
        app.use(`/api/${route}`, router);
        // Back-compat alias: many docs, comments, and older links expect /api/commodities/v2
        // for the enhanced (EIA + enriched) commodities data that the main dashboard uses.
        app.use('/api/commodities/v2', router);
      } else {
        app.use(`/api/${route}`, router);
      }
    } catch (e: any) {
      console.warn(`Route ${route} not loaded:`, e.message);
    }
  }
  
  routesLoaded = true;
}

app.use((req, res, next) => {
  loadRoutes();
  next();
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.get("/api/cache/status", (_req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  res.json({ today, status: {} });
});

app.get("/api/rate-limits", (_req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  // Return a minimal but non-empty structure so the frontend's hasNonNullData
  // and structural guards treat it as received (avoids noisy "empty data" warnings).
  // Real rate-limit provenance can be expanded later.
  res.json({
    date: today,
    sources: [],
    _note: 'stub - real implementation tracks per-endpoint calls and quotas',
  });
});

export const api = onRequest(
  {
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
  },
  app
);

/**
 * Scheduled snapshot refresher.
 *
 * This runs on a cron (Cloud Scheduler) independently of any client load.
 * Use it to:
 *   - Pre-warm the NodeCache for heavy endpoints (realEstate, insurance, globalMacro, etc.)
 *   - Fetch key market data and write structured snapshots to Firebase Realtime Database (or Firestore).
 *   - This dramatically reduces the number of client-triggered cold invocations,
 *     which is the main way to keep bills predictable and low when the app is
 *     served from static hosting (GitHub Pages).
 *
 * Example expansion (pseudo):
 *   const db = getDatabase();
 *   const snap = await fetchMarketDataSomehow('realEstate');
 *   await set(ref(db, 'snapshots/current/realEstate'), snap);
 *
 * Schedule can be adjusted in the onSchedule string (e.g. "every 10 minutes").
 * Make sure the function has the necessary IAM / secrets for any external APIs.
 */
export const refreshMarketSnapshots = onSchedule("every 15 minutes", async (event) => {
  console.log('[scheduled] refreshMarketSnapshots tick', event?.scheduleTime || new Date().toISOString());
  // TODO: implement actual priming / RTDB writes here.
  // For now this just keeps the function warm and gives you a hook.
  // You can import route handlers or duplicate minimal fetch logic from the routes/*.
  // When implemented, the frontend can be updated to read from RTDB first (via firebase SDK)
  // and only fall back to the /api calls when the snapshot is stale/missing.
});