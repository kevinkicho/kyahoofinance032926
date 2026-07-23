/**
 * API routing registry parity tests.
 *
 * Guarantees shared/api-routing.json stays aligned with:
 *  - DataProvider MARKET_ENDPOINTS (via marketEndpoints.js)
 *  - marketPanels tab list
 *  - Vite proxy path list
 *  - Express-mounted route prefixes (server/index.js)
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MARKET_ENDPOINTS,
  ALL_FETCH_IDS,
  TAB_MARKET_IDS,
  getMarketFetchPlan,
  getAllRequiredApiPaths,
  getProxyPaths,
  getRoutingRegistry,
  marketIdForPath,
} from '../hub/lib/marketEndpoints';

function readRepo(...parts) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

function parseServerMounts() {
  const source = readRepo('server', 'index.js');
  return [...source.matchAll(/app\.use\(\s*['"](\/api\/[^'"]+)['"]/g)].map(m => m[1]);
}

describe('shared/api-routing.json registry', () => {
  const routing = getRoutingRegistry();

  it('has a version and non-empty tab markets', () => {
    expect(routing.version).toBeGreaterThanOrEqual(1);
    expect(TAB_MARKET_IDS.length).toBeGreaterThanOrEqual(16);
    expect(TAB_MARKET_IDS).toContain('bonds');
    expect(TAB_MARKET_IDS).toContain('crypto');
    expect(TAB_MARKET_IDS).toContain('analytics');
  });

  it('exports MARKET_ENDPOINTS for every non-federated tab market', () => {
    for (const id of TAB_MARKET_IDS) {
      if (id === 'alerts') continue; // federated client-side only
      expect(MARKET_ENDPOINTS[id], `missing endpoint for tab ${id}`).toBeTruthy();
      expect(MARKET_ENDPOINTS[id]).toMatch(/^\/api\//);
    }
  });

  it('every market primary is unique', () => {
    const primaries = Object.values(MARKET_ENDPOINTS);
    expect(new Set(primaries).size).toBe(primaries.length);
  });

  it('ALL_FETCH_IDS includes every registry market', () => {
    for (const id of Object.keys(routing.markets)) {
      expect(ALL_FETCH_IDS).toContain(id);
    }
  });

  it('getMarketFetchPlan returns primary + deps without duplicates', () => {
    const plan = getMarketFetchPlan('bonds');
    expect(plan[0]).toBe('/api/bonds');
    expect(plan).toContain('/api/treasuryTIC');
    expect(plan).toContain('/api/nyfed');
    expect(new Set(plan).size).toBe(plan.length);
  });

  it('marketIdForPath resolves primaries and aliases', () => {
    expect(marketIdForPath('/api/bonds')).toBe('bonds');
    expect(marketIdForPath('/api/commoditiesEnhanced')).toBe('commodities');
    expect(marketIdForPath('/api/commodities/v2')).toBe('commodities');
    expect(marketIdForPath('/api/treasury/tic')).toBe('treasuryTIC');
  });

  it('proxy path list covers every primary endpoint', () => {
    const proxy = new Set(getProxyPaths());
    for (const p of Object.values(MARKET_ENDPOINTS)) {
      // fed subpaths are under /api/fed prefix proxy
      if (p.startsWith('/api/fed/')) {
        expect(proxy.has('/api/fed') || proxy.has(p)).toBe(true);
        continue;
      }
      if (p.startsWith('/api/edgar/')) {
        expect(proxy.has('/api/edgar') || proxy.has(p)).toBe(true);
        continue;
      }
      expect(proxy.has(p) || [...proxy].some(x => p.startsWith(x + '/')), `proxy missing ${p}`).toBe(true);
    }
  });
});

describe('panel registry ↔ API routing coverage', () => {
  it('every marketPanels.js tab has a routing entry (except alerts)', () => {
    const panelsSrc = readRepo('src', 'data', 'marketPanels.js');
    const marketKeys = [...panelsSrc.matchAll(/^\s{2}([a-zA-Z]+):\s*\[/gm)].map(m => m[1]);
    expect(marketKeys.length).toBeGreaterThan(10);
    for (const id of marketKeys) {
      if (id === 'alerts') continue;
      expect(MARKET_ENDPOINTS[id], `marketPanels tab ${id} missing from api-routing`).toBeTruthy();
    }
  });

  it('getAllRequiredApiPaths includes health endpoints', () => {
    const paths = getAllRequiredApiPaths();
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/rate-limits');
    expect(paths.some(p => p.includes('bonds'))).toBe(true);
  });
});

describe('server mount ↔ registry parity', () => {
  it('every non-nested primary has an Express app.use mount or inline route', () => {
    const mounts = parseServerMounts();
    const indexSrc = readRepo('server', 'index.js');
    // Prefix match: /api/fed covers /api/fed/sep
    // Inline app.get routes (health, rate-limits, cache/status) also count.
    const covered = (apiPath) =>
      mounts.some(m => apiPath === m || apiPath.startsWith(m + '/')) ||
      indexSrc.includes(`'${apiPath}'`) ||
      indexSrc.includes(`"${apiPath}"`);

    const missing = [];
    for (const [id, p] of Object.entries(MARKET_ENDPOINTS)) {
      if (!covered(p)) missing.push(`${id} → ${p}`);
    }
    expect(missing, `Unmounted endpoints:\n${missing.join('\n')}`).toEqual([]);
  });

  it('panel-routing diagnostic route is mounted', () => {
    const mounts = parseServerMounts();
    expect(mounts).toContain('/api/panel-routing');
  });
});
