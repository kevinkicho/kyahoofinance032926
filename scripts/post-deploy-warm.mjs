/**
 * Post-deploy: point Cloud Run traffic at latest revision (optional) and warm
 * priority market APIs so the first real users hit disk/memory cache.
 *
 * Usage:
 *   node scripts/post-deploy-warm.mjs
 *   SHOT_BASE_URL=https://… node scripts/post-deploy-warm.mjs
 *   WARM_ONLY=1 node scripts/post-deploy-warm.mjs          # skip gcloud traffic
 *   TRAFFIC_ONLY=1 node scripts/post-deploy-warm.mjs       # skip warm
 *
 * Requires: gcloud auth (for traffic), network access to the hosted URL.
 */
import { spawnSync } from 'child_process';

const BASE = process.env.SHOT_BASE_URL
  || process.env.HOSTED_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const PROJECT = process.env.GCLOUD_PROJECT || 'kfinance032926';
const REGION = process.env.GCLOUD_REGION || 'us-central1';
const SERVICE = process.env.CLOUD_RUN_SERVICE || 'kyahoofinance032926';
const WARM_TOKEN = process.env.WARM_TOKEN || '';
const WARM_ONLY = process.env.WARM_ONLY === '1' || process.argv.includes('--warm-only');
const TRAFFIC_ONLY = process.env.TRAFFIC_ONLY === '1' || process.argv.includes('--traffic-only');

const PRIORITY = [
  'bonds', 'realEstate', 'insurance', 'credit', 'fx', 'globalMacro',
  'derivatives', 'crypto', 'sentiment', 'calendar', 'bls', 'eia',
];

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true, ...opts });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

async function warmGet(path) {
  const url = `${BASE.replace(/\/$/, '')}/api/${path}`;
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 200000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const ms = Date.now() - t0;
    const text = await r.text();
    console.log(`[warm] ${path} ${r.status} ${ms}ms bytes=${text.length}`);
    return { path, status: r.status, ms, bytes: text.length };
  } catch (e) {
    console.warn(`[warm] ${path} FAIL ${Date.now() - t0}ms ${e?.message || e}`);
    return { path, status: 0, error: String(e?.message || e) };
  }
}

async function main() {
  console.log(`Base: ${BASE}`);
  console.log(`Service: ${SERVICE} (${REGION}/${PROJECT})`);

  if (!WARM_ONLY) {
    // Prefer --to-latest; fall back to naming latest revision if needed.
    const code = run('gcloud', [
      'run', 'services', 'update-traffic', SERVICE,
      `--region=${REGION}`,
      `--project=${PROJECT}`,
      '--to-latest',
    ]);
    if (code !== 0) {
      console.warn('[traffic] update-traffic --to-latest failed (may already be latest or ALREADY_EXISTS)');
    }
  }

  if (TRAFFIC_ONLY) {
    console.log('[done] traffic only');
    return;
  }

  // Prefer server-side warm endpoint if available (same instance fills disk).
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (WARM_TOKEN) headers['x-warm-token'] = WARM_TOKEN;
    const r = await fetch(`${BASE.replace(/\/$/, '')}/api/warm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: PRIORITY }),
    });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      console.log('[warm] POST /api/warm accepted:', j);
    } else {
      console.warn(`[warm] POST /api/warm → ${r.status}; falling back to GET wave`);
    }
  } catch (e) {
    console.warn('[warm] POST /api/warm failed:', e?.message || e);
  }

  // Always also GET priority paths from outside (fills whatever instance serves).
  const results = [];
  for (const p of PRIORITY) {
    results.push(await warmGet(p));
  }

  const ok = results.filter((r) => r.status >= 200 && r.status < 400).length;
  console.log(`[done] warm ${ok}/${results.length} priority routes`);
  if (ok < results.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
