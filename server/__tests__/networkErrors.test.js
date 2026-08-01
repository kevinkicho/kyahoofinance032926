import { describe, it, expect } from 'vitest';
import { isTransientNetworkError, TRANSIENT_NET_CODES } from '../lib/networkErrors.js';

describe('isTransientNetworkError (server stability)', () => {
  it('recognizes ECONNRESET — the Census/dev crash class', () => {
    expect(isTransientNetworkError({ code: 'ECONNRESET', message: 'read ECONNRESET' })).toBe(true);
    expect(isTransientNetworkError(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }))).toBe(true);
  });

  it('recognizes common transient codes', () => {
    for (const code of ['EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']) {
      expect(isTransientNetworkError({ code }), code).toBe(true);
      expect(TRANSIENT_NET_CODES.has(code)).toBe(true);
    }
  });

  it('does not treat programmer errors as transient', () => {
    expect(isTransientNetworkError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isTransientNetworkError(new TypeError('x is not a function'))).toBe(false);
    expect(isTransientNetworkError(null)).toBe(false);
  });
});
