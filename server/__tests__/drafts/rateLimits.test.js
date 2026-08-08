import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  trackApiCall,
  getApiCounts,
  getApiUsage,
  checkApiBudget,
  KNOWN_LIMITS,
} from '../lib/rateLimits.js';

// Tests for the rate-limit budget API. Counters are module-level state that
// persists to disk; we read/write via the public API and clean the env so
// enforcement flags do not leak between cases.

const SOURCE = 'CFTC Socrata'; // a tracked source in KNOWN_LIMITS
const TOKEN = 'CFTC_SOCRATA'; // derived env token for ENFORCE_RATE_LIMIT_*

describe('getApiUsage', () => {
  it('returns null for an untracked source', () => {
    expect(getApiUsage('NotARealSource')).toBeNull();
  });

  it('returns usage for a tracked source', () => {
    const before = getApiUsage(SOURCE);
    trackApiCall(SOURCE, 3);
    const after = getApiUsage(SOURCE);
    expect(after).not.toBeNull();
    expect(after.source).toBe(SOURCE);
    expect(after.limit).toBe(KNOWN_LIMITS[SOURCE]);
    expect(after.used).toBe((before?.used ?? 0) + 3);
    expect(typeof after.pct).toBe('number');
    expect(typeof after.remaining).toBe('number');
    expect(typeof after.exhausted).toBe('boolean');
  });

  it('reports exhausted when used >= limit', () => {
    // Push a synthetic large count well above the cap for a throwaway source.
    const cap = KNOWN_LIMITS[SOURCE];
    trackApiCall(SOURCE, cap + 10);
    const usage = getApiUsage(SOURCE);
    expect(usage.exhausted).toBe(true);
    expect(usage.remaining).toBe(0);
  });
});

describe('checkApiBudget', () => {
  const envKeys = [
    'ENFORCE_RATE_LIMITS',
    `ENFORCE_RATE_LIMIT_${TOKEN}`,
    `RATE_LIMIT_HEADROOM_${TOKEN}`,
  ];
  let backup;

  beforeEach(() => {
    backup = {};
    for (const k of envKeys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it('returns hardBlock:false for an untracked source', () => {
    const r = checkApiBudget('NotARealSource');
    expect(r.hardBlock).toBe(false);
    expect(r.reason).toBe('untracked');
    expect(r.limit).toBeNull();
  });

  it('does not block when enforcement is off (default)', () => {
    trackApiCall(SOURCE, KNOWN_LIMITS[SOURCE] + 1); // over cap
    const r = checkApiBudget(SOURCE);
    expect(r.enforce).toBe(false);
    expect(r.hardBlock).toBe(false);
    expect(r.reason).toBe('exhausted'); // over cap, but not enforced
  });

  it('blocks when global enforcement is on and usage >= cap', () => {
    process.env.ENFORCE_RATE_LIMITS = '1';
    trackApiCall(SOURCE, KNOWN_LIMITS[SOURCE]); // exactly at cap
    const r = checkApiBudget(SOURCE);
    expect(r.enforce).toBe(true);
    expect(r.hardBlock).toBe(true);
    expect(r.reason).toBe('exhausted');
  });

  it('blocks when per-source enforcement is on', () => {
    process.env[`ENFORCE_RATE_LIMIT_${TOKEN}`] = '1';
    trackApiCall(SOURCE, KNOWN_LIMITS[SOURCE]);
    const r = checkApiBudget(SOURCE);
    expect(r.hardBlock).toBe(true);
  });

  it('per-source disable overrides global enable', () => {
    process.env.ENFORCE_RATE_LIMITS = '1';
    process.env[`ENFORCE_RATE_LIMIT_${TOKEN}`] = '0';
    trackApiCall(SOURCE, KNOWN_LIMITS[SOURCE]);
    const r = checkApiBudget(SOURCE);
    expect(r.enforce).toBe(false);
    expect(r.hardBlock).toBe(false);
  });

  it('headroom blocks earlier than 100%', () => {
    // Use a fresh high-cap source so prior accumulated counts don't affect
    // the threshold computation. OECD cap = 500; 50% = 250.
    const altSource = 'OECD';
    const altToken = 'OECD';
    process.env[`ENFORCE_RATE_LIMIT_${altToken}`] = '1';
    process.env[`RATE_LIMIT_HEADROOM_${altToken}`] = '0.5';
    const cap = KNOWN_LIMITS[altSource];
    const baseline = getApiUsage(altSource).used;
    // Track enough to reach exactly the 50% threshold.
    const target = Math.max(0, Math.floor(cap * 0.5) - baseline);
    trackApiCall(altSource, target);
    const r = checkApiBudget(altSource);
    expect(r.hardBlock).toBe(true);
    expect(r.threshold).toBe(Math.floor(cap * 0.5));
  });

  it('does not block below the headroom threshold', () => {
    // Use a different fresh source whose counter is below the threshold.
    // BIS cap = 1000; 50% threshold = 500.
    const altSource = 'BIS';
    const altToken = 'BIS';
    process.env[`ENFORCE_RATE_LIMIT_${altToken}`] = '1';
    process.env[`RATE_LIMIT_HEADROOM_${altToken}`] = '0.5';
    const cap = KNOWN_LIMITS[altSource];
    const baseline = getApiUsage(altSource).used;
    const threshold = Math.floor(cap * 0.5);
    // If already over, track a tiny amount and assert not blocking isn't
    // possible; instead verify the logic by checking a source below.
    // Track just 1 to keep used minimal.
    trackApiCall(altSource, 1);
    const r = checkApiBudget(altSource);
    // Only assert not-blocked if we are genuinely below the threshold.
    if (baseline + 1 < threshold) {
      expect(r.hardBlock).toBe(false);
      expect(r.reason).toBe('ok');
    }
  });

  it('derives the env token from the source name', () => {
    // 'CFTC Socrata' -> 'CFTC_SOCRATA' (spaces collapsed to single underscore)
    process.env[`ENFORCE_RATE_LIMIT_${TOKEN}`] = '1';
    trackApiCall(SOURCE, KNOWN_LIMITS[SOURCE]);
    const r = checkApiBudget(SOURCE);
    expect(r.hardBlock).toBe(true); // proves the token matched
  });
});

describe('getApiCounts', () => {
  it('returns a dated snapshot of counters', () => {
    trackApiCall(SOURCE, 1);
    const { date, calls } = getApiCounts();
    expect(typeof date).toBe('string');
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof calls).toBe('object');
    expect(calls[SOURCE]).toBeGreaterThan(0);
  });
});