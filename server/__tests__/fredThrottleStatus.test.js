import { describe, it, expect } from 'vitest';
import { getFredThrottleStatus } from '../lib/fetch.js';

describe('getFredThrottleStatus', () => {
  it('returns used/limit/hot shape', () => {
    const st = getFredThrottleStatus();
    expect(st).toHaveProperty('used');
    expect(st).toHaveProperty('limit', 120);
    expect(st).toHaveProperty('hot');
    expect(st).toHaveProperty('atLimit');
    expect(st).toHaveProperty('waitMs');
    expect(typeof st.used).toBe('number');
  });
});
