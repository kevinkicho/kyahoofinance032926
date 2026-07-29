import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('gcsCache helpers', () => {
  const originalFetch = globalThis.fetch;
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
    delete process.env.MARKET_CACHE_BUCKET;
    delete process.env.GCS_CACHE_BUCKET;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...env };
  });

  it('is disabled when bucket env is unset', async () => {
    const mod = await import('../lib/gcsCache.js');
    expect(mod.isGcsCacheEnabled()).toBe(false);
    expect(await mod.gcsReadJson('bonds', '2026-07-29')).toBe(null);
    expect(await mod.gcsWriteJson('bonds', '2026-07-29', { a: 1 })).toBe(false);
  });

  it('reads JSON from GCS when bucket is set and token available', async () => {
    process.env.MARKET_CACHE_BUCKET = 'test-market-cache';
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('metadata.google.internal')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        };
      }
      if (u.includes('storage.googleapis.com') && u.includes('alt=media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ yieldCurveData: { US: { '10y': 4.2 } }, lastUpdated: '2026-07-29' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    });

    const mod = await import('../lib/gcsCache.js');
    expect(mod.isGcsCacheEnabled()).toBe(true);
    const data = await mod.gcsReadJson('bonds', '2026-07-29');
    expect(data?.yieldCurveData?.US?.['10y']).toBe(4.2);
    expect(data?._cacheSource).toBe('gcs');
  });

  it('writes media upload when token available', async () => {
    process.env.MARKET_CACHE_BUCKET = 'test-market-cache';
    const calls = [];
    globalThis.fetch = vi.fn(async (url, opts) => {
      const u = String(url);
      calls.push({ u, method: opts?.method || 'GET' });
      if (u.includes('metadata.google.internal')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        };
      }
      if (u.includes('upload/storage')) {
        return { ok: true, status: 200, json: async () => ({ name: 'ok' }), text: async () => '' };
      }
      return { ok: false, status: 404, text: async () => '' };
    });

    const mod = await import('../lib/gcsCache.js');
    const payload = { a: 1, b: 2, c: 3, pad: 'x'.repeat(250) };
    const ok = await mod.gcsWriteJson('bonds', '2026-07-29', payload);
    expect(ok).toBe(true);
    expect(calls.some((c) => c.u.includes('upload/storage') && c.method === 'POST')).toBe(true);
  });
});
