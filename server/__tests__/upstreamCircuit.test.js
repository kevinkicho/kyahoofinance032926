import { describe, it, expect, beforeEach } from 'vitest';
import {
  isCircuitOpen,
  noteUpstreamFailure,
  getCircuitState,
  resetCircuit,
  IMF_HOST,
} from '../lib/upstreamCircuit.js';

describe('upstreamCircuit', () => {
  beforeEach(() => {
    resetCircuit(IMF_HOST);
  });

  it('opens on ENOTFOUND and stays open', () => {
    expect(isCircuitOpen(IMF_HOST)).toBe(false);
    noteUpstreamFailure(IMF_HOST, new Error('getaddrinfo ENOTFOUND dataservices.imf.org'));
    expect(isCircuitOpen(IMF_HOST)).toBe(true);
    expect(isCircuitOpen(`https://${IMF_HOST}/x`)).toBe(true);
    const st = getCircuitState(IMF_HOST);
    expect(st.open).toBe(true);
    expect(st.remainingMs).toBeGreaterThan(0);
  });

  it('ignores non-DNS errors for open', () => {
    resetCircuit('example.com');
    noteUpstreamFailure('example.com', new Error('HTTP 500 from example.com'));
    expect(isCircuitOpen('example.com')).toBe(false);
  });
});
