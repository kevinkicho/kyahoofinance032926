import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "firebase-admin";
import express, { Request, Response } from "express";
import cors from "cors";
import NodeCache from "node-cache";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DIAGNOSTIC_MARKETS, SNAPSHOT_MARKETS } from "./lib/snapshotMarkets.js";

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

// Canonical live market API is Firebase App Hosting (server/). Functions no longer
// load a duplicate copy of server/routes — those drifted and caused stale behavior.
// Public `api` is a thin reverse-proxy for legacy clients only.
const APP_HOSTING_BASE_DEFAULT =
  "https://kyahoofinance032926--kfinance032926.us-central1.hosted.app";

function appHostingBase(): string {
  return (
    process.env.LIVE_FUNCTIONS_BASE ||
    process.env.SNAPSHOT_API_BASE ||
    process.env.APP_HOSTING_BASE ||
    APP_HOSTING_BASE_DEFAULT
  ).replace(/\/$/, "");
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    role: "functions-proxy",
    upstream: appHostingBase(),
    note: "Market data is served by App Hosting; this endpoint is Functions liveness only.",
  });
});

/** Proxy any remaining /api/* traffic to App Hosting so legacy clients stay correct. */
app.use("/api", async (req: Request, res: Response) => {
  const base = appHostingBase();
  const pathAndQuery = req.originalUrl || req.url || "/api";
  const target = `${base}${pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`}`;
  try {
    const headers: Record<string, string> = {
      accept: req.get("accept") || "application/json",
      "user-agent": req.get("user-agent") || "kyahoo-functions-proxy",
    };
    const auth = req.get("authorization");
    if (auth) headers.authorization = auth;
    const warm = req.get("x-warm-token");
    if (warm) headers["x-warm-token"] = warm;
    const method = (req.method || "GET").toUpperCase();
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(120000),
    };
    if (method !== "GET" && method !== "HEAD" && req.body != null) {
      headers["content-type"] = req.get("content-type") || "application/json";
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }
    const upstream = await fetch(target, init);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.setHeader("x-proxied-from", "app-hosting");
    res.send(buf);
  } catch (e: any) {
    console.warn("[functions-proxy] failed:", target, e?.message || e);
    res.status(502).json({
      ok: false,
      error: "app_hosting_proxy_failed",
      message: e?.message || String(e),
      upstream: base,
    });
  }
});

export const api = onRequest(
  {
    cors: true,
    invoker: "public",
    memory: "256MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 5,
    // No market-data secrets required — proxy only. Snapshots use App Hosting HTTP.
  },
  app
);

// --- Cost control + RTDB time-series snapshot system ---
// Scheduled function that runs daily at midnight UTC (independent of any user/browser).
// It fetches fresh data from App Hosting, then writes to RTDB so the DB *grows*
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

// Prefer explicit service-account JSON (local gitignored key or secret env),
// then Application Default Credentials on Cloud Functions / Cloud Run.
if (!admin.apps || admin.apps.length === 0) {
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    "https://kfinance032926-default-rtdb.firebaseio.com";

  let credential: ReturnType<typeof admin.credential.cert> | undefined;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credential = admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      );
    } else {
      const keyPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (keyPath && fs.existsSync(keyPath)) {
        const parsed = JSON.parse(fs.readFileSync(keyPath, "utf8"));
        credential = admin.credential.cert(parsed);
        console.log(`[firebase-admin] using key file: ${path.basename(keyPath)}`);
      }
    }
  } catch (e: any) {
    console.warn("[firebase-admin] service account load failed:", e?.message || e);
  }

  admin.initializeApp(
    credential
      ? { credential, databaseURL }
      : { databaseURL } // ADC on GCP
  );
}

// Canonical live API for snapshots: App Hosting (warm disk/GCS cache).
// Override with LIVE_FUNCTIONS_BASE / SNAPSHOT_API_BASE only for emergencies.
const APP_HOSTING_BASE =
  "https://kyahoofinance032926--kfinance032926.us-central1.hosted.app";
const LIVE_API_BASE = (
  process.env.LIVE_FUNCTIONS_BASE ||
  process.env.SNAPSHOT_API_BASE ||
  APP_HOSTING_BASE
).replace(/\/$/, "");

const RTDB_KEY_INVALID_CHARS = /[.#$/[\]]/g;
const SNAPSHOT_FETCH_ATTEMPTS = Number(process.env.SNAPSHOT_FETCH_ATTEMPTS || 3);
const SNAPSHOT_FETCH_TIMEOUT_MS = Number(process.env.SNAPSHOT_FETCH_TIMEOUT_MS || 180000);
const SNAPSHOT_CONCURRENCY = Number(process.env.SNAPSHOT_CONCURRENCY || 3);

function sanitizeForRTDB(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeForRTDB);
  if (!value || typeof value !== "object") return value === undefined ? null : value;

  const out: Record<string, any> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey).replace(RTDB_KEY_INVALID_CHARS, "_");
    out[key] = sanitizeForRTDB(rawValue);
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reject empty / error-only shells so we never stamp hollow "success". */
function hasUsableSnapshotPayload(data: any): boolean {
  if (data == null) return false;
  if (typeof data !== "object") return true;
  if (Array.isArray(data)) return data.length > 0;
  const meta = new Set([
    "error", "message", "ok", "isLive", "isCurrent", "fetchedOn", "lastUpdated",
    "lastError", "staleAsOf", "source",
  ]);
  const keys = Object.keys(data).filter((k) => !k.startsWith("_") && !meta.has(k));
  if (keys.length === 0) return false;
  if (data.ok === false && data.error) return false;
  // Config/API failure shells: error set and every _sources flag false
  if (data.error && data._sources && typeof data._sources === "object") {
    const flags = Object.values(data._sources);
    if (flags.length && flags.every((v) => v === false)) return false;
  }
  // All data keys null/empty with an error
  if (data.error) {
    const anySubstance = keys.some((k) => {
      const v = data[k];
      if (v == null || v === false || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v).length > 0;
      return true;
    });
    if (!anySubstance) return false;
  }
  return true;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchMarketJson(path: string): Promise<any> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= SNAPSHOT_FETCH_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${LIVE_API_BASE}${path}`, {
        headers: {
          "User-Agent": "scheduled-snapshot-refresher",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(SNAPSHOT_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!hasUsableSnapshotPayload(data)) {
        throw new Error(
          data?.error
            ? `unusable payload: ${String(data.error).slice(0, 120)}`
            : "unusable empty payload"
        );
      }
      console.log(
        `[scheduled] fetch ok ${path} attempt=${attempt} ${Date.now() - t0}ms`
      );
      return data;
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e?.message || e));
      console.warn(
        `[scheduled] fetch fail ${path} attempt=${attempt}/${SNAPSHOT_FETCH_ATTEMPTS}: ${lastErr.message}`
      );
      if (attempt < SNAPSHOT_FETCH_ATTEMPTS) {
        await sleep(1500 * attempt * attempt);
      }
    }
  }
  throw lastErr || new Error(`fetch failed for ${path}`);
}

export const refreshMarketSnapshots = onSchedule(
  {
    schedule: "0 0 * * *",
    // ~50 markets × retries; App Hosting is warm but FRED waves can still be slow.
    timeoutSeconds: 1800,
    memory: "1GiB",
  },
  async () => {
  const db = admin.database();
  const now = new Date().toISOString();
  const dateKey = now.substring(0, 10); // YYYY-MM-DD for history keys
  console.log(
    `[scheduled] refreshMarketSnapshots starting at ${now} (dateKey=${dateKey}) base=${LIVE_API_BASE}`
  );

  // Pre-warm App Hosting so first heavy markets hit disk/GCS cache.
  try {
    const warmupRes = await fetch(`${LIVE_API_BASE}/api/health`, {
      signal: AbortSignal.timeout(30000),
    });
    console.log(`[scheduled] pre-warm health: ${warmupRes.status}`);
  } catch (e: any) {
    console.warn(`[scheduled] pre-warm health failed (non-fatal):`, e?.message || e);
  }
  try {
    const warmPaths = SNAPSHOT_MARKETS.slice(0, 16).map((m) =>
      m.path.replace(/^\/api\//, "")
    );
    const warmRes = await fetch(`${LIVE_API_BASE}/api/warm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "scheduled-snapshot-refresher",
        ...(process.env.WARM_TOKEN ? { "x-warm-token": process.env.WARM_TOKEN } : {}),
      },
      body: JSON.stringify({ paths: warmPaths }),
      signal: AbortSignal.timeout(30000),
    });
    console.log(`[scheduled] pre-warm /api/warm: ${warmRes.status}`);
    // Give background warm a head start on priority routes.
    await sleep(8000);
  } catch (e: any) {
    console.warn(`[scheduled] pre-warm /api/warm failed (non-fatal):`, e?.message || e);
  }

  type SnapResult = { id: string; ok: boolean; optional?: boolean; error?: string };

  async function snapshotOne(market: {
    id: string;
    path: string;
    optional?: boolean;
  }): Promise<SnapResult> {
    const { id, path, optional } = market;
    try {
      let data = await fetchMarketJson(path);

      // universeUpdates is a *rolling* Finnhub IPO window. Nightly jobs used to
      // overwrite RTDB latest wholesale, so names that fell out of the 45-day
      // calendar (e.g. SPCX after 2026-07-27) vanished from the equities heatmap
      // injection path. Merge prior discoveries for 90 days so the sidecar is
      // sticky until names are promoted into stockUniverse.js.
      if (id === "universeUpdates" && data && typeof data === "object") {
        try {
          const prevSnap = await db.ref(`marketSnapshots/${id}/latest`).once("value");
          const prevUpdates = prevSnap.val()?.data?.updates;
          const fresh = Array.isArray(data.updates) ? data.updates : [];
          if (Array.isArray(prevUpdates) && prevUpdates.length) {
            const byName = new Map<string, any>();
            const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
            const nowMs = Date.now();
            for (const u of prevUpdates) {
              const name = u?.name ? String(u.name).toUpperCase() : "";
              if (!name) continue;
              const discovered = Date.parse(u.discoveryDate || u.discoverydate || "");
              if (Number.isFinite(discovered) && nowMs - discovered > maxAgeMs) continue;
              byName.set(name, { ...u, name });
            }
            for (const u of fresh) {
              const name = u?.name ? String(u.name).toUpperCase() : "";
              if (!name) continue;
              byName.set(name, { ...u, name }); // fresh quote wins
            }
            data = {
              ...data,
              updates: Array.from(byName.values()),
              _mergedPriorDiscoveries: true,
              _priorCount: prevUpdates.length,
              _freshCount: fresh.length,
            };
            console.log(
              `[scheduled] universeUpdates merge: fresh=${fresh.length} prior=${prevUpdates.length} → ${byName.size}`
            );
          }
        } catch (mergeErr: any) {
          console.warn(
            `[scheduled] universeUpdates prior-merge failed (using fresh only):`,
            mergeErr?.message || mergeErr
          );
        }
      }

      const payload = sanitizeForRTDB({
        data,
        fetchedAt: now,
        source: "scheduled",
        apiBase: LIVE_API_BASE,
      });
      await db.ref(`marketSnapshots/${id}/history/${dateKey}`).set(payload);
      await db.ref(`marketSnapshots/${id}/latest`).set(payload);
      console.log(`[scheduled] wrote snapshot for ${id} (history/${dateKey} + latest)`);
      return { id, ok: true, optional };
    } catch (e: any) {
      const message = String(e?.message || e);
      console.warn(`[scheduled] failed snapshot for ${id}:`, message);
      const errPayload = { at: now, message, apiBase: LIVE_API_BASE };

      // Keep last-good data; never leave latest as error-only if we had data.
      try {
        const latestSnap = await db.ref(`marketSnapshots/${id}/latest`).once("value");
        const latestPayload = latestSnap.val();
        if (latestPayload?.data) {
          const fallbackPayload = sanitizeForRTDB({
            ...latestPayload,
            fetchedAt: latestPayload.fetchedAt || now,
            source: "scheduled-stale-fallback",
            staleAsOf: now,
            lastError: errPayload,
          });
          await db.ref(`marketSnapshots/${id}/history/${dateKey}`).set(fallbackPayload);
          await db.ref(`marketSnapshots/${id}/latest`).set(fallbackPayload);
        } else {
          await db.ref(`marketSnapshots/${id}/history/${dateKey}/lastError`).set(errPayload);
          await db.ref(`marketSnapshots/${id}/latest/lastError`).set(errPayload);
        }
      } catch (fallbackErr: any) {
        console.warn(
          `[scheduled] failed stale fallback for ${id}:`,
          fallbackErr?.message || fallbackErr
        );
        await db.ref(`marketSnapshots/${id}/history/${dateKey}/lastError`).set(errPayload);
        await db.ref(`marketSnapshots/${id}/latest/lastError`).set(errPayload);
      }
      return { id, ok: false, optional: !!optional, error: message };
    }
  }

  // Pass 1: all markets
  let results = await mapWithConcurrency(
    SNAPSHOT_MARKETS,
    SNAPSHOT_CONCURRENCY,
    snapshotOne
  );

  // Pass 2: only failures (fresh attempts — often succeeds after cache warm)
  const failedFirst = results.filter((r) => !r.ok).map((r) => r.id);
  if (failedFirst.length) {
    console.warn(
      `[scheduled] pass1 failures (${failedFirst.length}): ${failedFirst.join(", ")} — retrying`
    );
    await sleep(5000);
    const retryMarkets = SNAPSHOT_MARKETS.filter((m) => failedFirst.includes(m.id));
    const retryResults = await mapWithConcurrency(
      retryMarkets,
      Math.max(1, Math.min(2, SNAPSHOT_CONCURRENCY)),
      snapshotOne
    );
    const byId = new Map(results.map((r) => [r.id, r]));
    for (const r of retryResults) byId.set(r.id, r);
    results = SNAPSHOT_MARKETS.map((m) => byId.get(m.id)!);
  }

  const okIds = results.filter((r) => r.ok).map((r) => r.id);
  const hardFailIds = results.filter((r) => !r.ok && !r.optional).map((r) => r.id);
  const softFailIds = results.filter((r) => !r.ok && r.optional).map((r) => r.id);
  const summary = {
    at: now,
    dateKey,
    apiBase: LIVE_API_BASE,
    total: results.length,
    ok: okIds.length,
    failed: hardFailIds.length,
    optionalFailed: softFailIds.length,
    failedIds: hardFailIds,
    optionalFailedIds: softFailIds,
    errors: results
      .filter((r) => !r.ok)
      .map((r) => ({ id: r.id, optional: !!r.optional, error: r.error })),
  };
  await db.ref(`marketSnapshots/_meta/lastRun`).set(summary);
  console.log(
    `[scheduled] snapshot summary: ${summary.ok}/${summary.total} ok` +
      (hardFailIds.length ? ` failed=[${hardFailIds.join(", ")}]` : "") +
      (softFailIds.length ? ` optionalFailed=[${softFailIds.join(", ")}]` : "")
  );

  // Run daily diagnostics to check health and save report to RTDB
  try {
    await runDailyDiagnostics(db, dateKey, now);
  } catch (diagErr) {
    console.error("[scheduled] runDailyDiagnostics failed:", diagErr);
  }

  // Optional light retention — prunes history older than keepDays.
  await cleanupOldHistory(db, dateKey, 365);

  if (hardFailIds.length) {
    // Fail the Cloud Scheduler run so it is visible / can auto-retry.
    throw new Error(
      `refreshMarketSnapshots incomplete: ${hardFailIds.length} required market(s) failed (${hardFailIds.slice(0, 12).join(", ")}${hardFailIds.length > 12 ? "…" : ""})`
    );
  }

  console.log(
    "[scheduled] refreshMarketSnapshots complete — all required markets succeeded" +
      (softFailIds.length ? ` (optional misses: ${softFailIds.join(", ")})` : "")
  );
});

// Run structural checks on all endpoints and save report to RTDB
async function runDailyDiagnostics(db: any, dateKey: string, now: string) {
  console.log(`[scheduled] running daily diagnostics at ${now}`);
  const { getValidationWarning, validateMarketData } = await import("./lib/validation.js");

  const targets = DIAGNOSTIC_MARKETS;

  const results: Record<string, any> = {};
  let healthyCount = 0;
  let warningCount = 0;
  let unhealthyCount = 0;

  await mapWithConcurrency(targets, 8, async ({ id }) => {
    const start = Date.now();
    try {
      const snap = await db.ref(`marketSnapshots/${id}/history/${dateKey}`).once('value');
      const duration = Date.now() - start;
      const payload = snap.val();
      const data = payload?.data;
      const lastError = payload?.lastError?.message || null;

      if (!data) {
        results[id] = {
          status: 'unhealthy',
          error: lastError || 'No snapshot data for diagnostics date',
          duration,
          lastChecked: now
        };
        unhealthyCount++;
        return;
      }

      const validation = validateMarketData(id, data);

      if (validation.ok) {
        results[id] = {
          status: lastError ? 'warning' : 'healthy',
          ...(lastError ? { error: `Snapshot kept previous data; latest refresh error: ${lastError}` } : {}),
          duration,
          lastChecked: now
        };
        if (lastError) warningCount++;
        else healthyCount++;
      } else {
        const warning = getValidationWarning(id, data);
        if (warning) {
          results[id] = {
            status: 'warning',
            error: warning,
            duration,
            lastChecked: now
          };
          warningCount++;
        } else {
          results[id] = {
            status: 'unhealthy',
            error: validation.error || 'Failed structural guard',
            duration,
            lastChecked: now
          };
          unhealthyCount++;
        }
      }
    } catch (e: any) {
      results[id] = {
        status: 'unhealthy',
        error: e?.message || 'Fetch failed',
        duration: Date.now() - start,
        lastChecked: now
      };
      unhealthyCount++;
    }
  });

  const report = {
    timestamp: now,
    overallStatus: unhealthyCount > 0 ? 'unhealthy' : (warningCount > 0 ? 'warning' : 'healthy'),
    summary: {
      total: targets.length,
      healthy: healthyCount,
      warning: warningCount,
      unhealthy: unhealthyCount
    },
    markets: results
  };

  await db.ref(`apiHealthReport/history/${dateKey}`).set(report);
  await db.ref(`apiHealthReport/latest`).set(report);
  console.log(`[scheduled] wrote diagnostics report to RTDB (overallStatus=${report.overallStatus})`);
}

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
