import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

function parseFrontendEndpointIds() {
  const source = readRepoFile('src', 'hub', 'DataProvider.jsx');
  const block = source.match(/export const MARKET_ENDPOINTS = \{([\s\S]*?)\n\};/)?.[1] || '';
  return [...block.matchAll(/^\s*([A-Za-z0-9_]+):\s*['"]/gm)].map(match => match[1]);
}

function parseSnapshotMarketIds() {
  const source = readRepoFile('functions', 'src', 'lib', 'snapshotMarkets.ts');
  return [...source.matchAll(/\{ id: "([^"]+)"/g)].map(match => match[1]);
}

describe('endpoint registry parity', () => {
  it('scheduled RTDB snapshots include every frontend endpoint except explicit backend-only system feeds', () => {
    const frontend = parseFrontendEndpointIds();
    const snapshots = parseSnapshotMarketIds();
    const missing = frontend.filter(id => !snapshots.includes(id));

    expect(missing).toEqual([]);
  });

  it('backend-only snapshot feeds stay explicit', () => {
    const frontend = parseFrontendEndpointIds();
    const snapshots = parseSnapshotMarketIds();
    const backendOnly = snapshots.filter(id => !frontend.includes(id));

    expect(backendOnly.sort()).toEqual(['cacheStatus', 'rateLimits']);
  });
});
