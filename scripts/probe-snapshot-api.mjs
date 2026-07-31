/**
 * Dry-run: fetch every SNAPSHOT_MARKETS path from App Hosting (what the
 * nightly job should hit). Exit 2 if any fail.
 *
 *   node scripts/probe-snapshot-api.mjs
 *   SNAPSHOT_API_BASE=https://… node scripts/probe-snapshot-api.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.SNAPSHOT_API_BASE
  || process.env.LIVE_FUNCTIONS_BASE
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app').replace(/\/$/, '');

// Parse snapshotMarkets.ts lightly (id + path pairs)
const src = readFileSync(
  path.join(__dirname, '../functions/src/lib/snapshotMarkets.ts'),
  'utf8'
);
const markets = [...src.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*path:\s*"([^"]+)"/g)].map((m) => ({
  id: m[1],
  path: m[2],
}));

const TIMEOUT = Number(process.env.PROBE_TIMEOUT_MS || 120000);
const CONCURRENCY = Number(process.env.PROBE_CONCURRENCY || 4);

function hasUsable(data) {
  if (data == null || typeof data !== 'object') return false;
  if (Array.isArray(data)) return data.length > 0;
  const meta = new Set([
    'error', 'message', 'ok', 'isLive', 'isCurrent', 'fetchedOn', 'lastUpdated',
    'lastError', 'staleAsOf', 'source',
  ]);
  const keys = Object.keys(data).filter((k) => !k.startsWith('_') && !meta.has(k));
  if (!keys.length) return false;
  if (data.ok === false && data.error) return false;
  if (data.error && data._sources && typeof data._sources === 'object') {
    const flags = Object.values(data._sources);
    if (flags.length && flags.every((v) => v === false)) return false;
  }
  if (data.error) {
    const anySubstance = keys.some((k) => {
      const v = data[k];
      if (v == null || v === false || v === '') return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return true;
    });
    if (!anySubstance) return false;
  }
  return true;
}

async function one({ id, path: p }) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}${p}`, {
      headers: { 'User-Agent': 'probe-snapshot-api', Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }
    const ok = r.ok && hasUsable(data);
    return {
      id,
      path: p,
      ok,
      status: r.status,
      ms: Date.now() - t0,
      bytes: text.length,
      error: ok ? null : (!r.ok ? `HTTP ${r.status}` : (data?.error || 'unusable payload')),
    };
  } catch (e) {
    return {
      id,
      path: p,
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      bytes: 0,
      error: e?.message || String(e),
    };
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

const results = await pool(markets, CONCURRENCY, one);
const ok = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(`base=${BASE} markets=${markets.length}`);
for (const r of results) {
  console.log(
    `${r.ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(22)} ${String(r.status).padStart(3)} ${String(r.ms).padStart(6)}ms ${String(r.bytes).padStart(8)}b ${r.error || ''}`
  );
}
console.log(`\n${ok.length}/${results.length} ok, ${bad.length} failed`);
if (bad.length) {
  console.log('failed:', bad.map((b) => b.id).join(', '));
  process.exitCode = 2;
}
