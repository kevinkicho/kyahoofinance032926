/**
 * Regression: Census (and others) return HTML with 200 → JSON.parse throws
 * spam + hollow panels. fetchJSON must reject HTML with a clear error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import https from 'https';
import { fetchJSON } from '../lib/fetch.js';

vi.mock('https', () => ({
  default: {
    get: vi.fn(),
  },
  get: vi.fn(),
}));

function mockHttpsGet(body, statusCode = 200) {
  const impl = (opts, cb) => {
    const req = new EventEmitter();
    req.setTimeout = () => {};
    req.destroy = () => {};
    // Defer so handlers are attached
    setTimeout(() => {
      const res = new EventEmitter();
      res.statusCode = statusCode;
      res.headers = {};
      cb(res);
      res.emit('data', Buffer.from(body));
      res.emit('end');
    }, 0);
    return req;
  };
  vi.mocked(https.get).mockImplementation(impl);
  if (https.default?.get) vi.mocked(https.default.get).mockImplementation(impl);
}

describe('fetchJSON resilience', () => {
  beforeEach(() => {
    vi.mocked(https.get).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects HTML error pages even with HTTP 200', async () => {
    mockHttpsGet('<html style="x"><body>blocked</body></html>');
    await expect(fetchJSON('https://api.census.gov/data/x')).rejects.toThrow(/HTML|Invalid JSON|Expected JSON/i);
  });

  it('parses valid JSON', async () => {
    mockHttpsGet(JSON.stringify({ ok: true, n: 1 }));
    await expect(fetchJSON('https://example.com/api')).resolves.toEqual({ ok: true, n: 1 });
  });
});
