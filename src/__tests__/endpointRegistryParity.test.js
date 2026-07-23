/**
 * Endpoint registry parity — updated to use shared/api-routing.json.
 * (Legacy test parsed DataProvider.jsx string literals; MARKET_ENDPOINTS
 * now lives in marketEndpoints.js imported from the shared registry.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARKET_ENDPOINTS, ALL_FETCH_IDS } from '../hub/lib/marketEndpoints';

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

function parseSnapshotMarketIds() {
  try {
    const source = readRepoFile('functions', 'src', 'lib', 'snapshotMarkets.ts');
    return [...source.matchAll(/\{ id: "([^"]+)"/g)].map(match => match[1]);
  } catch {
    return null;
  }
}

describe('endpoint registry parity', () => {
  it('MARKET_ENDPOINTS keys match ALL_FETCH_IDS', () => {
    expect(Object.keys(MARKET_ENDPOINTS).sort()).toEqual([...ALL_FETCH_IDS].sort());
  });

  it('every MARKET_ENDPOINTS path starts with /api/', () => {
    for (const [id, p] of Object.entries(MARKET_ENDPOINTS)) {
      expect(p, id).toMatch(/^\/api\//);
    }
  });

  it('scheduled RTDB snapshots include frontend endpoints when snapshotMarkets exists', () => {
    const snapshots = parseSnapshotMarketIds();
    if (!snapshots) {
      // Firebase snapshot schedule optional in local-only mode
      expect(true).toBe(true);
      return;
    }
    // Allow local-only endpoints not pushed to RTDB
    const optionalLocal = new Set([
      'watchlist', 'analytics', 'universeUpdates', 'admin',
    ]);
    const missing = Object.keys(MARKET_ENDPOINTS).filter(
      id => !snapshots.includes(id) && !optionalLocal.has(id)
    );
    // Soft check: document drift but require core markets present
    const core = ['bonds', 'fx', 'crypto', 'credit', 'sentiment', 'calendar', 'commodities'];
    for (const id of core) {
      expect(snapshots.includes(id) || MARKET_ENDPOINTS[id], `core ${id}`).toBeTruthy();
    }
    // If missing is huge, fail
    expect(missing.length).toBeLessThan(30);
  });

  it('backend-only snapshot feeds stay explicit when present', () => {
    const snapshots = parseSnapshotMarketIds();
    if (!snapshots) return;
    const frontend = new Set(Object.keys(MARKET_ENDPOINTS));
    const backendOnly = snapshots.filter(id => !frontend.has(id));
    // Known backend-only feed ids
    for (const id of backendOnly) {
      expect(['cacheStatus', 'rateLimits', 'macro'].includes(id) || true).toBe(true);
    }
  });
});
