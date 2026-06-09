import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
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

// --- Cost control + RTDB snapshot system ---
// Scheduled function that runs on a fixed cron (independent of any user/browser).
// It fetches fresh data for the heaviest/slowest endpoints using the live function URL,
// then writes the responses to Firebase Realtime Database under /marketSnapshots/{marketId}.
// 
// Benefits:
// - Drastically reduces the number of *client-triggered* function invocations (the main bill driver
//   for a static GH Pages frontend).
// - Frontend can read these snapshots cheaply and instantly via RTDB REST (public read rules).
// - Scheduled invocations are predictable and limited (once per day).
// - maxInstances + timeout already limit runaway scale.
//
// The frontend (DataProvider) will prefer a recent RTDB snapshot and only fall back to the
// /api call when the snapshot is missing or stale.
//
// To enable:
//   firebase deploy --only functions,database   (after setting rules)
//   (RTDB must be enabled in the Firebase console for the project if not already.)

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const LIVE_FUNCTIONS_BASE = "https://api-4uzq3y2xva-uc.a.run.app";

// Markets we want to pre-snapshot on schedule (focus on the ones that were timing out or heavy).
const SNAPSHOT_MARKETS = [
  { id: "realEstate", path: "/api/realEstate" },
  { id: "insurance", path: "/api/insurance" },
  { id: "globalMacro", path: "/api/globalMacro" },
  { id: "commodities", path: "/api/commodities/v2" }, // alias works thanks to loader
  { id: "bonds", path: "/api/bonds" },
];

export const refreshMarketSnapshots = onSchedule("0 0 * * *", async (event) => {
  const db = admin.database();
  const now = new Date().toISOString();
  console.log(`[scheduled] refreshMarketSnapshots starting at ${now}`);

  await Promise.allSettled(
    SNAPSHOT_MARKETS.map(async ({ id, path }) => {
      try {
        const url = `${LIVE_FUNCTIONS_BASE}${path}`;
        const res = await fetch(url, { 
          headers: { "User-Agent": "scheduled-snapshot-refresher" },
          signal: AbortSignal.timeout(45000) // generous but bounded
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Write to RTDB. Frontend will read from here.
        await db.ref(`marketSnapshots/${id}`).set({
          data,
          fetchedAt: now,
          source: "scheduled",
        });
        console.log(`[scheduled] wrote snapshot for ${id}`);
      } catch (e: any) {
        console.warn(`[scheduled] failed snapshot for ${id}:`, e?.message || e);
        // still write a minimal marker so frontend knows it tried
        await db.ref(`marketSnapshots/${id}/lastError`).set({
          at: now,
          message: String(e?.message || e),
        });
      }
    })
  );

  console.log("[scheduled] refreshMarketSnapshots complete");
});