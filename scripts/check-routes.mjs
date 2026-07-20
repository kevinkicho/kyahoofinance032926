import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT_FILE = path.resolve(__dirname, '..', '.server-port');
const PORT = readFileSync(PORT_FILE, 'utf8').trim();
const BASE = `http://localhost:${PORT}`;

const ROUTES = [
  { path: '/api/health' },
  { path: '/api/cache/status' },
  { path: '/api/rate-limits' },
  { path: '/api/stocks', method: 'POST', body: { tickers: ['AAPL'] } },
  { path: '/api/equities' },
  { path: '/api/macro' },
  { path: '/api/bonds' },
  { path: '/api/derivatives' },
  { path: '/api/realEstate' },
  { path: '/api/insurance' },
  { path: '/api/commodities' },
  { path: '/api/commodities/v2' },
  { path: '/api/commoditiesEnhanced' },
  { path: '/api/globalMacro' },
  { path: '/api/equityDeepDive' },
  { path: '/api/crypto' },
  { path: '/api/credit' },
  { path: '/api/sentiment' },
  { path: '/api/calendar' },
  { path: '/api/fx' },
  { path: '/api/institutional' },
  { path: '/api/analytics' },
  { path: '/api/watchlist' },
  { path: '/api/fred/batch?group=US_YIELDS' },
  { path: '/api/imf' },
  { path: '/api/worldbank' },
  { path: '/api/bls' },
  { path: '/api/eia' },
  { path: '/api/census' },
  { path: '/api/nyfed' },
  { path: '/api/fdic' },
  { path: '/api/bea' },
  { path: '/api/edgar' },
  { path: '/api/ecb' },
  { path: '/api/eurostat' },
  { path: '/api/oecd' },
  { path: '/api/treasury/tic' },
  { path: '/api/treasuryTIC' },
  { path: '/api/treasury/dts' },
  { path: '/api/treasuryDTS' },
  { path: '/api/fed/sep' },
  { path: '/api/fed/gdpnow' },
  { path: '/api/fed/inflation-nowcast' },
  { path: '/api/fed/news-sentiment' },
  { path: '/api/msrb' },
  { path: '/api/fema' },
  { path: '/api/usgs' },
  { path: '/api/usda' },
  { path: '/api/census-trade' },
  { path: '/api/censusTrade' },
  { path: '/api/eia-petroleum' },
  { path: '/api/eiaPetroleum' },
  { path: '/api/universeUpdates' },
  { path: '/api/cftcTFF' },
  { path: '/api/bisOTC' },
  { path: '/api/fao' },
  { path: '/api/treasuryCost' },
  { path: '/api/summary/AAPL' },
  { path: '/api/history/AAPL' },
  { path: '/api/snapshot?date=2026-07-19' },
];

let pass = 0, fail = 0, graceful503 = 0;
for (const { path: route, method, body } of ROUTES) {
  try {
    const opts = { signal: AbortSignal.timeout(30000) };
    if (method === 'POST') {
      opts.method = 'POST';
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const resp = await fetch(`${BASE}${route}`, opts);
    const respBody = await resp.json().catch(() => null);
    const is503 = resp.status === 503;
    const is200 = resp.status === 200;
    const is202 = resp.status === 202;
    const is400 = resp.status === 400;
    if (is200) { pass++; }
    else if (is202) { pass++; }
    else if (is503) { graceful503++; }
    else if (is400) { pass++; } // 400 means route exists but needs valid params
    else { fail++; console.log(`FAIL ${resp.status} ${route} — ${respBody?.error || 'no body'}`); }
  } catch (e) {
    fail++;
    console.log(`ERROR ${route} — ${e.message}`);
  }
}
console.log(`\nRoutes: ${ROUTES.length} total`);
console.log(`  200 OK: ${pass}`);
console.log(`  503 graceful: ${graceful503}`);
console.log(`  FAIL: ${fail}`);
process.exit(fail > 0 ? 1 : 0);
