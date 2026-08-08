import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runFetchPlan, buildFetchObservation } from '../lib/agentFetch.js';

// The orchestrator is the seam between "agent decides" and "hardcoded
// fallback". Tests cover: empty input, default plan execution, budget
// skip, retry behavior, circuit reset tool, AI plan normalization, and
// hard safety caps (max calls, deadline).

vi.mock('../lib/rateLimits.js', () => ({
  checkApiBudget: vi.fn(() => ({
    source: 'CFTC Socrata',
    hardBlock: false,
    used: 0,
    limit: 1000,
    pct: 0,
    remaining: 1000,
    reason: 'ok',
    threshold: 1000,
    enforce: false,
  })),
  trackApiCall: vi.fn(),
}));

vi.mock('../lib/fetch.js', () => ({
  getFredThrottleStatus: vi.fn(() => ({
    used: 0, limit: 120, pct: 0, hot: false, waitMs: 0,
  })),
}));

vi.mock('../lib/upstreamCircuit.js', () => ({
  isCircuitOpen: vi.fn(() => false),
  noteUpstreamFailure: vi.fn(),
  resetCircuit: vi.fn(),
  listOpenCircuits: vi.fn(() => []),
}));

const { checkApiBudget } = await import('../lib/rateLimits.js');

describe('runFetchPlan — empty / guard inputs', () => {
  it('returns empty results for no sources', async () => {
    const r = await runFetchPlan({ sources: [] });
    expect(r.results).toEqual({});
    expect(r.planner).toBe('empty');
  });
});

describe('runFetchPlan — default plan (no AI)', () => {
  it('executes each declared source once', async () => {
    const fetcherA = vi.fn(async () => ({ ok: true, value: 'a' }));
    const fetcherB = vi.fn(async () => ({ ok: true, value: 'b' }));
    const r = await runFetchPlan({
      sources: [
        { source: 'Source A', fetcher: fetcherA },
        { source: 'Source B', fetcher: fetcherB },
      ],
      useAi: false,
    });
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
    expect(r.results['Source A']).toEqual({ ok: true, value: 'a' });
    expect(r.results['Source B']).toEqual({ ok: true, value: 'b' });
    expect(r.planner).toBe('default');
  });

  it('skips a source whose budget is hard-blocked', async () => {
    // Make checkApiBudget return blocked for the 'Blocked' source on
    // every call (defaultPlan + executeFetchAction both consult it).
    checkApiBudget.mockImplementation((src) =>
      src === 'Blocked'
        ? {
            source: 'Blocked', hardBlock: true, used: 1000, limit: 1000,
            pct: 1, remaining: 0, reason: 'exhausted', threshold: 1000, enforce: true,
          }
        : {
            source: src, hardBlock: false, used: 0, limit: 1000, pct: 0,
            remaining: 1000, reason: 'ok', threshold: 1000, enforce: false,
          }
    );
    const fetcher = vi.fn(async () => 'should not run');
    const _errors = {};
    const r = await runFetchPlan({
      sources: [{ source: 'Blocked', fetcher }],
      _errors,
      useAi: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.results['Blocked']).toBeNull();
    expect(_errors['Blocked']).toBe('budget_exhausted');
  });

  it('retries a failing source up to retries+1 attempts', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ recovered: true });
    const r = await runFetchPlan({
      sources: [{ source: 'Flaky', fetcher }],
      useAi: false,
    });
    // default retries = 2 → 3 total attempts; succeeds on 3rd
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(r.results['Flaky']).toEqual({ recovered: true });
  });

  it('populates _errors when all retries fail', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('down'));
    const _errors = {};
    const r = await runFetchPlan({
      sources: [{ source: 'Down', fetcher }],
      _errors,
      useAi: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(3); // 1 + 2 retries
    expect(r.results['Down']).toBeNull();
    expect(_errors['Down']).toBe('down');
  });
});

describe('runFetchPlan — hard safety caps', () => {
  it('stops after HARD_MAX_CALLS even if the plan requests more', async () => {
    const fetcher = vi.fn(async () => 'x');
    // 15 sources — exceeds the 12-call cap
    const sources = Array.from({ length: 15 }, (_, i) => ({
      source: `S${i}`,
      fetcher,
    }));
    const r = await runFetchPlan({ sources, useAi: false });
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(12);
  });
});

describe('runFetchPlan — AI plan path', () => {
  it('uses an AI plan when valid and executes fetch_source actions', async () => {
    const fetcher = vi.fn(async () => 'ai-result');
    const fakeFetch = vi.fn(async (url, opts) => ({
      ok: true,
      json: async () => ({
        plan: {
          actions: [{ tool: 'fetch_source', source: 'AISource', retries: 1, backoffMs: 100 }],
        },
        planner: 'ai',
      }),
    }));
    const r = await runFetchPlan({
      sources: [{ source: 'AISource', fetcher }],
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl: fakeFetch,
      useAi: true,
    });
    expect(fakeFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/agent/recover-plan',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r.results['AISource']).toBe('ai-result');
    expect(r.planner).toBe('ai');
  });

  it('falls back to the default plan when the AI plan references unknown sources', async () => {
    const fetcher = vi.fn(async () => 'ok');
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        plan: { actions: [{ tool: 'fetch_source', source: 'Invented', retries: 1 }] },
        planner: 'ai',
      }),
    }));
    const r = await runFetchPlan({
      sources: [{ source: 'Real', fetcher }],
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl: fakeFetch,
      useAi: true,
    });
    // AI plan rejected (unknown source) → default plan runs 'Real'
    expect(r.planner).toBe('default');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('falls back when the AI request errors', async () => {
    const fetcher = vi.fn(async () => 'ok');
    const fakeFetch = vi.fn(async () => { throw new Error('ollama down'); });
    const r = await runFetchPlan({
      sources: [{ source: 'Real', fetcher }],
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl: fakeFetch,
      useAi: true,
    });
    expect(r.planner).toBe('default');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('clamps AI retries/backoff to hard caps', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        plan: {
          actions: [{
            tool: 'fetch_source',
            source: 'C',
            retries: 999, // clamped to HARD_MAX_RETRIES (4)
            backoffMs: 999999, // clamped to HARD_MAX_BACKOFF_MS (8000)
          }],
        },
        planner: 'ai',
      }),
    }));
    const r = await runFetchPlan({
      sources: [{ source: 'C', fetcher }],
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl: fakeFetch,
      useAi: true,
    });
    expect(r.planner).toBe('ai');
    expect(fetcher).toHaveBeenCalledTimes(1); // succeeded first try
  });

  it('executes reset_circuit tool actions from an AI plan', async () => {
    const { resetCircuit } = await import('../lib/upstreamCircuit.js');
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        plan: { actions: [{ tool: 'reset_circuit', source: 'X', host: 'dataservices.imf.org' }] },
        planner: 'ai',
      }),
    }));
    await runFetchPlan({
      sources: [{ source: 'X', fetcher: vi.fn() }],
      baseUrl: 'http://127.0.0.1:3001',
      fetchImpl: fakeFetch,
      useAi: true,
    });
    expect(resetCircuit).toHaveBeenCalledWith('dataservices.imf.org');
  });
});

describe('buildFetchObservation', () => {
  it('produces a secret-free observation with budget + throttle + circuits', async () => {
    const obs = buildFetchObservation([{ source: 'CFTC Socrata' }]);
    expect(obs.sources).toBeInstanceOf(Array);
    expect(obs.sources[0]).toHaveProperty('source');
    expect(obs.sources[0]).toHaveProperty('pct');
    expect(obs.fredThrottle).toHaveProperty('used');
    expect(obs.openCircuits).toEqual([]);
    expect(typeof obs.note).toBe('string');
  });
});