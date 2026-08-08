import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// End-to-end FX route test through the agent fetch orchestrator. We mock
// the upstream fetchers + rateLimits + cache + agentFetch's AI path so the
// route handler exercises runFetchPlan with the deterministic fallback
// (no OLLAMA_API_KEY) and asserts _errors / _sources / planner surfacing.

vi.mock('../lib/fetch.js', () => ({ fetchJSON: vi.fn() }));

vi.mock('../lib/cache.js', () => ({
  readDailyCache: vi.fn(() => null),
  writeDailyCache: vi.fn(),
  readLatestCache: vi.fn(() => null),
  todayStr: vi.fn(() => '2026-08-02'),
  mergeWithPreviousCache: vi.fn((_m, data) => data),
}));

vi.mock('../lib/rateLimits.js', () => ({
  trackApiCall: vi.fn(),
  checkApiBudget: vi.fn(() => ({
    source: 'CFTC Socrata', hardBlock: false, used: 0, limit: 1000,
    pct: 0, remaining: 1000, reason: 'ok', threshold: 1000, enforce: false,
  })),
  getApiUsage: vi.fn(() => null),
  KNOWN_LIMITS: { 'CFTC Socrata': 1000 },
}));

vi.mock('../lib/fetch.js', () => ({
  fetchJSON: vi.fn(),
  getFredThrottleStatus: vi.fn(() => ({ used: 0, limit: 120, pct: 0, hot: false, waitMs: 0 })),
}));

vi.mock('../lib/upstreamCircuit.js', () => ({
  isCircuitOpen: vi.fn(() => false),
  noteUpstreamFailure: vi.fn(),
  resetCircuit: vi.fn(),
  listOpenCircuits: vi.fn(() => []),
}));

vi.mock('../lib/marketResponse.js', () => ({
  sendCachedOrDegradedSync: vi.fn((res, market, opts) => res.json({ degraded: true })),
}));

const { default: fxRouter } = await import('../routes/fx.js');
const { trackApiCall } = await import('../lib/rateLimits.js');

function getRouteHandler() {
  const layer = fxRouter.stack.find((s) => s.route?.path === '/');
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockReq() {
  return {
    query: {},
    socket: { localAddress: '127.0.0.1', localPort: 3001 },
    app: { locals: { cache: { get: vi.fn(() => null), set: vi.fn(), del: vi.fn() } } },
  };
}

function mockRes() {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() };
}

describe('FX route — agent fetch orchestrator integration', () => {
  const origKey = process.env.OLLAMA_API_KEY;
  const origFred = process.env.FRED_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OLLAMA_API_KEY; // deterministic fallback
    process.env.FRED_API_KEY = 'test-fred-key';
  });

  afterEach(() => {
    if (origKey === undefined) delete process.env.OLLAMA_API_KEY;
    else process.env.OLLAMA_API_KEY = origKey;
    if (origFred === undefined) delete process.env.FRED_API_KEY;
    else process.env.FRED_API_KEY = origFred;
  });

  it('returns a 200 with _sources.__fetchPlanner="default" when OLLAMA_API_KEY is unset', async () => {
    // The deterministic plan runs each declared source once; fetchers
    // return null/throw so we get a degraded-but-shaped response.
    const handler = getRouteHandler();
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body._sources.__fetchPlanner).toBe('default');
    // trackApiCall should have been called for the inline FRED blocks
    // (REER / rate differentials / DXY) even though the orchestrated
    // sources go through runFetchPlan's own trackApiCall.
    expect(trackApiCall).toHaveBeenCalledWith('FRED');
  });

  it('populates _errors when all upstream sources fail', async () => {
    const handler = getRouteHandler();
    const res = mockRes();
    await handler(mockReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body._errors).toBeDefined();
    // With no FRED data and no Frankfurter, the route still returns 200.
    expect(body.isLive === false || body.isCurrent === false || body.spotRates === null).toBe(true);
  });
});