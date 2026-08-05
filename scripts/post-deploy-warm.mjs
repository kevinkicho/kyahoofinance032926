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

/**
 * Staged warm — fill the most user-visible + cross-market deps first so
 * progressive slices and open tabs paint without a full FRED stampede.
 *
 * STAGE1: deps that unblock many panels + core tabs (equities/bonds/fx/credit)
 * STAGE2: remaining tab markets
 * STAGE3: heavier satellites (optional; skipped if WARM_STAGE=1|2)
 */
const STAGE1 = [
  // Cross-market deps first (matches client wave order)
  'edgar', 'edgar/filing-activity', 'bea', 'worldbank', 'treasuryTIC', 'nyfed',
  'treasuryAuctions', 'ecb', 'treasuryCost', 'cftcTFF',
  // Core product tabs
  'equities', 'bonds', 'fx', 'credit',
];
const STAGE2 = [
  'derivatives', 'crypto', 'sentiment', 'calendar', 'bls', 'eia',
  'realEstate', 'insurance', 'globalMacro', 'equityDeepDive', 'commoditiesEnhanced',
];
const STAGE3 = [
  'institutional', 'census', 'censusTrade', 'fema', 'usgs', 'fdic', 'msrb',
  'eurostat', 'oecd', 'imf', 'eiaPetroleum', 'usda', 'fao', 'bisOTC',
  'fed/gdpnow', 'fed/sep', 'fed/inflation-nowcast', 'fed/news-sentiment',
  'treasuryDTS', 'universeUpdates',
];

const WARM_STAGE = Number(process.env.WARM_STAGE || 0); // 0 = all stages
const PRIORITY = WARM_STAGE === 1
  ? STAGE1
  : WARM_STAGE === 2
    ? [...STAGE1, ...STAGE2]
    : [...STAGE1, ...STAGE2, ...STAGE3];

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true, ...opts });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

/**
 * Post-deploy warm is the *write* path: force upstream rebuild so user GETs
 * can stay cache-only. Set WARM_CACHE_ONLY=1 to probe without ?refresh.
 */
async function warmGet(path) {
  const force = process.env.WARM_CACHE_ONLY !== '1';
  const sep = path.includes('?') ? '&' : '?';
  const qs = force ? `${sep}refresh=true` : '';
  const url = `${BASE.replace(/\/$/, '')}/api/${path}${qs}`;
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 200000);
    const headers = force ? { 'X-Cache-Bypass': '1' } : undefined;
    const r = await fetch(url, { signal: ctrl.signal, headers });
    clearTimeout(timer);
    const ms = Date.now() - t0;
    const text = await r.text();
    console.log(`[warm] ${path}${force ? ' (rebuild)' : ''} ${r.status} ${ms}ms bytes=${text.length}`);
    return { path, status: r.status, ms, bytes: text.length, forced: force };
  } catch (e) {
    console.warn(`[warm] ${path} FAIL ${Date.now() - t0}ms ${e?.message || e}`);
    return { path, status: 0, error: String(e?.message || e) };
  }
}

async function main() {
  console.log(`Base: ${BASE}`);
  console.log(`Service: ${SERVICE} (${REGION}/${PROJECT})`);

  if (!WARM_ONLY) {
    // Prefer routing 100% to the newest Ready revision by name.
    // `--to-latest` often fails with ALREADY_EXISTS on App Hosting tag routing.
    const list = spawnSync('gcloud', [
      'run', 'revisions', 'list',
      `--service=${SERVICE}`,
      `--region=${REGION}`,
      `--project=${PROJECT}`,
      '--format=value(metadata.name)',
      '--limit=5',
    ], { encoding: 'utf8', shell: true });
    const rev = (list.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (rev) {
      console.log(`[traffic] routing 100% → ${rev}`);
      const code = run('gcloud', [
        'run', 'services', 'update-traffic', SERVICE,
        `--region=${REGION}`,
        `--project=${PROJECT}`,
        `--to-revisions=${rev}=100`,
      ]);
      if (code !== 0) {
        console.warn('[traffic] update-traffic by revision failed; trying --to-latest');
        run('gcloud', [
          'run', 'services', 'update-traffic', SERVICE,
          `--region=${REGION}`,
          `--project=${PROJECT}`,
          '--to-latest',
        ]);
      }
    } else {
      console.warn('[traffic] could not list revisions; trying --to-latest');
      run('gcloud', [
        'run', 'services', 'update-traffic', SERVICE,
        `--region=${REGION}`,
        `--project=${PROJECT}`,
        '--to-latest',
      ]);
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

  // Staged GET wave from outside (fills whatever instance serves).
  console.log(`[warm] staged paths: ${PRIORITY.length} (WARM_STAGE=${WARM_STAGE || 'all'})`);
  const results = [];
  for (const p of PRIORITY) {
    results.push(await warmGet(p));
    // Gentle pause between stages boundaries is automatic via list order
  }

  const ok = results.filter((r) => r.status >= 200 && r.status < 400).length;
  console.log(`[done] warm ${ok}/${results.length} staged routes`);
  if (ok < Math.max(1, Math.floor(PRIORITY.length * 0.7))) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
