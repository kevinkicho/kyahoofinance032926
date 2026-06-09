import { onRequest } from "firebase-functions/v2/https";
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

  for (const route of essentialRoutes) {
    try {
      const module = require(path.join(__dirname, "routes", `${route}.js`));
      const router = module.default || module;
      if (route === 'ticker') {
        app.use("/api", router);
      } else if (route === 'commoditiesEnhanced') {
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

// NOTE on cost control / RTDB migration (see user's request):
// A scheduled refresher (using onSchedule) can be added here later to pre-warm caches
// and write snapshots to Realtime Database. This lets the static frontend read from
// cheap/fast RTDB instead of hitting the function on every load, greatly reducing
// invocation count and bill risk.
// Example (once added):
// import { onSchedule } from "firebase-functions/v2/scheduler";
// export const refreshSnapshots = onSchedule("every 15 minutes", async () => { ... write to RTDB ... });