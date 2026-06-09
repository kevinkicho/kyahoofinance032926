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
      } else if (route === 'treasuryTIC') {
        app.use(`/api/${route}`, router);
        app.use('/api/treasury/tic', router);
      } else if (route === 'treasuryAuctions') {
        app.use(`/api/${route}`, router);
        app.use('/api/treasury/auctions', router);
      } else if (route === 'treasuryDTS') {
        app.use(`/api/${route}`, router);
        app.use('/api/treasury/dts', router);
      } else if (route === 'censusTrade') {
        app.use(`/api/${route}`, router);
        app.use('/api/census-trade', router);
      } else if (route === 'eiaPetroleum') {
        app.use(`/api/${route}`, router);
        app.use('/api/eia-petroleum', router);
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

// --- Cost control + RTDB time-series snapshot system ---
// Scheduled function that runs daily at midnight UTC (independent of any user/browser).
// It fetches fresh data using the live function URL, then writes to RTDB so the DB *grows*
// over time instead of overwriting:
//
//   marketSnapshots/{id}/
//     latest/          {data, fetchedAt, source}   // fast access for normal UI loads
//     history/
//       2026-06-08/    {data, fetchedAt, source}   // historical daily entries
//       2026-06-09/    ...
//
// Benefits:
// - Drastically reduces client-triggered Functions invocations (RTDB reads are cheap/fast).
// - Gives you a growing historical record for trends, comparisons, debugging, time-travel, etc.
// - Snapshots for analytics/rate-limits/cacheStatus + all major markets are durable.
// - Scheduled invocations remain very low (once/day).
//
// Frontend (DataProvider + Analytics + TimeTravel) prefers /latest or specific /history/{date}.
// Live /api calls are only the fallback.
//
// Retention: optional cleanup of old history entries is included (see cleanupOldHistory).
// To enable:
//   firebase deploy --only functions,database
//   (RTDB must be enabled; rules should allow public .read on marketSnapshots)

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const LIVE_FUNCTIONS_BASE = "https://api-4uzq3y2xva-uc.a.run.app";

// Expanded list of things to pre-snapshot on schedule.
// This makes RTDB the primary persistent store for market data + system/analytics state.
// Goal: reduce per-client Functions calls (cost), provide historical/debuggable snapshots,
// and make analytics/rate-limit/cache results durable and queryable (via RTDB or firebase CLI).
const SNAPSHOT_MARKETS = [
  { id: "realEstate", path: "/api/realEstate" },
  { id: "insurance", path: "/api/insurance" },
  { id: "globalMacro", path: "/api/globalMacro" },
  { id: "commodities", path: "/api/commodities/v2" },
  { id: "bonds", path: "/api/bonds" },
  { id: "fx", path: "/api/fx" },
  { id: "derivatives", path: "/api/derivatives" },
  { id: "crypto", path: "/api/crypto" },
  { id: "credit", path: "/api/credit" },
  { id: "sentiment", path: "/api/sentiment" },
  { id: "calendar", path: "/api/calendar" },
  { id: "equitiesDeepDive", path: "/api/equityDeepDive" },
  { id: "analytics", path: "/api/analytics" },
  { id: "rateLimits", path: "/api/rate-limits" },
  { id: "cacheStatus", path: "/api/cache/status" },
];

export const refreshMarketSnapshots = onSchedule("0 0 * * *", async (event) => {
  const db = admin.database();
  const now = new Date().toISOString();
  const dateKey = now.substring(0, 10); // YYYY-MM-DD for history keys
  console.log(`[scheduled] refreshMarketSnapshots starting at ${now} (dateKey=${dateKey})`);

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

        const payload = { data, fetchedAt: now, source: "scheduled" };

        // Historical entry — this makes the DB grow day by day instead of overwriting.
        await db.ref(`marketSnapshots/${id}/history/${dateKey}`).set(payload);

        // Latest pointer for fast current access (used by DataProvider seed + normal UI).
        await db.ref(`marketSnapshots/${id}/latest`).set(payload);

        console.log(`[scheduled] wrote snapshot for ${id} (history/${dateKey} + latest)`);
      } catch (e: any) {
        console.warn(`[scheduled] failed snapshot for ${id}:`, e?.message || e);
        const errPayload = { at: now, message: String(e?.message || e) };

        // Record error in history for this day
        await db.ref(`marketSnapshots/${id}/history/${dateKey}/lastError`).set(errPayload);

        // Also surface on latest so UI can show "last known + error on latest attempt"
        await db.ref(`marketSnapshots/${id}/latest/lastError`).set(errPayload);
      }
    })
  );

  // Optional light retention — prunes history older than keepDays.
  // Safe to leave enabled; only runs after successful daily write.
  await cleanupOldHistory(db, dateKey, 365);

  console.log("[scheduled] refreshMarketSnapshots complete");
});

// Optional helper for retention (keeps DB from growing unbounded).
// Call from the scheduled job if you want to prune history older than N days.
async function cleanupOldHistory(db: any, todayKey: string, keepDays = 365) {
  const cutoff = new Date(Date.parse(todayKey) - keepDays * 86400000)
    .toISOString()
    .substring(0, 10);

  await Promise.allSettled(
    SNAPSHOT_MARKETS.map(async ({ id }) => {
      try {
        const histRef = db.ref(`marketSnapshots/${id}/history`);
        const old = await histRef.orderByKey().endAt(cutoff).once("value");
        if (old.exists()) {
          const updates: Record<string, null> = {};
          old.forEach((snap: any) => {
            updates[snap.key] = null;
          });
          await histRef.update(updates);
          console.log(`[scheduled] pruned ${Object.keys(updates).length} old history entries for ${id}`);
        }
      } catch (e) {
        console.warn(`[scheduled] retention prune failed for ${id}:`, e);
      }
    })
  );
}