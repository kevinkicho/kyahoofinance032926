/**
 * Server-side tests for /api/panel-routing discovery endpoint.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routing = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', 'shared', 'api-routing.json'), 'utf8')
);

// Import after ensuring route module is loadable
const { default: panelRoutingRouter } = await import('../routes/panelRouting.js');

function getHandler(method, routePath) {
  const layer = panelRoutingRouter.stack.find(
    l => l.route && l.route.path === routePath && l.route.methods[method]
  );
  if (!layer) throw new Error(`No ${method.toUpperCase()} ${routePath} on panelRouting router`);
  return layer.route.stack[0].handle;
}

describe('GET /api/panel-routing', () => {
  it('returns the shared routing registry', async () => {
    const handler = getHandler('get', '/');
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    await handler({}, res);
    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.ok).toBe(true);
    expect(body.version).toBe(routing.version);
    expect(body.tabMarkets).toEqual(routing.tabMarkets);
    expect(body.markets.bonds.primary).toBe('/api/bonds');
    expect(body.markets.commodities.primary).toBe('/api/commoditiesEnhanced');
    expect(body.aliases['/api/commodities/v2']).toBe('/api/commoditiesEnhanced');
  });

  it('includes every tab market from the registry (except alerts federated)', () => {
    for (const id of routing.tabMarkets) {
      if (id === 'alerts') continue;
      expect(routing.markets[id], `missing market config ${id}`).toBeTruthy();
      expect(routing.markets[id].primary).toMatch(/^\/api\//);
    }
  });
});

describe('routing registry integrity', () => {
  it('deps arrays only reference known primary paths, aliases, or system routes', () => {
    const primaries = new Set(Object.values(routing.markets).map(m => m.primary));
    const aliasTargets = new Set(Object.values(routing.aliases || {}));
    const system = new Set([
      ...(routing.health || []),
      '/api/analytics',
      '/api/cache/status',
      '/api/health',
      '/api/rate-limits',
      '/api/panel-routing',
    ]);
    const known = new Set([...primaries, ...aliasTargets, ...system]);
    // Also allow subpaths of known mounts
    const okPath = (p) =>
      known.has(p) ||
      [...known].some(k => p.startsWith(k + '/')) ||
      p.startsWith('/api/fed/') ||
      p.startsWith('/api/edgar/') ||
      p.startsWith('/api/cache');

    const bad = [];
    for (const [id, cfg] of Object.entries(routing.markets)) {
      for (const d of cfg.deps || []) {
        if (!okPath(d)) bad.push(`${id} dep ${d}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('proxyPaths includes panel-routing and health', () => {
    expect(routing.proxyPaths).toContain('/api/panel-routing');
    expect(routing.proxyPaths).toContain('/api/health');
  });
});
