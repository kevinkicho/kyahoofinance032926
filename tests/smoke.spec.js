import { test, expect } from '@playwright/test';
import fs from 'fs';

// Match Vite base: root for local/App Hosting; GH Pages sets VITE_BASE_PATH.
const BASE = process.env.VITE_BASE_PATH || '/';

const MARKETS = [
  { id: 'equities',         label: 'Equities' },
  { id: 'bonds',            label: 'Bonds' },
  { id: 'fx',               label: 'FX' },
  { id: 'derivatives',      label: 'Derivatives' },
  { id: 'realEstate',       label: 'Real Estate' },
  { id: 'insurance',        label: 'Insurance' },
  { id: 'commodities',      label: 'Commodities' },
  { id: 'globalMacro',      label: 'Macro' },
  { id: 'equitiesDeepDive', label: 'Equity+' },
  { id: 'crypto',           label: 'Crypto' },
  { id: 'credit',           label: 'Credit' },
  { id: 'sentiment',        label: 'Sentiment' },
  { id: 'calendar',         label: 'Calendar' },
  { id: 'bls',              label: 'Labor' },
  { id: 'eia',              label: 'Energy' },
  { id: 'alerts',           label: 'Alerts' },
  { id: 'watchlist',        label: 'Watchlist' },
  { id: 'analytics',        label: 'Analytics' },
];

// Optional local RTDB export seed (no longer committed). When missing, smoke
// tests hit the live local API only — same path as production cache-first load.
const RTDB_EXPORT_CANDIDATES = [
  process.env.RTDB_EXPORT_PATH,
  'data/kfinance032926-default-rtdb-export.json',
  'data/rtdb-export.json',
].filter(Boolean);

function buildSnapshotPayload() {
  for (const p of RTDB_EXPORT_CANDIDATES) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const snapshots = raw.marketSnapshots || {};
      const slim = {};
      for (const [marketId, entry] of Object.entries(snapshots)) {
        if (marketId === 'cacheStatus') continue;
        const data = entry.data || (entry.latest && entry.latest.data) || null;
        if (!data) continue;
        slim[marketId] = {
          data,
          lastUpdated: entry.fetchedAt || (entry.latest && entry.latest.fetchedAt) || null,
          fetchedOn: entry.fetchedAt || (entry.latest && entry.latest.fetchedAt) || null,
          isLive: true,
          isCurrent: true,
          provenance: {},
        };
      }
      if (Object.keys(slim).length) {
        console.log(`[smoke] seeded ${Object.keys(slim).length} markets from ${p}`);
        return slim;
      }
    } catch (e) {
      console.warn(`[smoke] skip export ${p}:`, e?.message || e);
    }
  }
  console.log('[smoke] no RTDB export present — relying on live API');
  return {};
}

const SNAPSHOT_PAYLOAD = buildSnapshotPayload();

test.describe('Smoke test — all 18 market tabs render panels', () => {
  test.setTimeout(180_000);

  for (const market of MARKETS) {
    test(`${market.label} (${market.id}) — at least 1 bento panel visible`, async ({ page }) => {
      if (Object.keys(SNAPSHOT_PAYLOAD).length) {
        await page.addInitScript((payload) => {
          localStorage.setItem('hub-markets-snapshot-v1', JSON.stringify(payload));
        }, SNAPSHOT_PAYLOAD);
      }
      // Skip splash so tabs mount without waiting for full panel-health green.
      await page.addInitScript(() => {
        try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
      });

      await page.goto(`${BASE}?market=${market.id}`, { waitUntil: 'domcontentloaded' });

      await page.waitForTimeout(5000);

      const panelCount = await page.locator('.bento-panel-title-row, .bento-panel-title, [class*="bento-panel"], [data-panel-key]').count();
      console.log(`[${market.id}] bento panel elements found: ${panelCount}`);

      await expect(panelCount).toBeGreaterThanOrEqual(1);
    });
  }
});
