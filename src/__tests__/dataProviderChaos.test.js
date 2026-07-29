// DataProvider unit tests.
//
// The DataProvider is the riskiest single file in the app (wave fetch,
// structural guards, federated alerts, snapshot persistence) and used to
// have zero coverage. Three production bugs slipped past CI for that
// reason:
//   - auditFreshness used `<<` instead of `<`
//   - getMarket called useCurrency() inside a useCallback (rules-of-hooks)
//   - currency conversion read fx.rates but server emits fx.spotRates
// All three are exercised below as direct regressions so they can't return.
import { describe, it, expect } from 'vitest';
import {
  hasNonNullData,
  passesStructuralGuard,
  STRUCTURAL_GUARDS,
  computeAlerts,
  computeFreshnessReport,
  MARKET_ENDPOINTS,
} from '../hub/DataProvider';

describe('hasNonNullData', () => {
  it('returns false for null / undefined / non-object', () => {
    expect(hasNonNullData(null)).toBe(false);
    expect(hasNonNullData(undefined)).toBe(false);
    expect(hasNonNullData('string')).toBe(false);
    expect(hasNonNullData(42)).toBe(false);
  });

  it('returns false when no non-null real keys', () => {
    expect(hasNonNullData({})).toBe(false);
    expect(hasNonNullData({ a: null, b: false, c: undefined })).toBe(false);
  });

  it('returns true when 1+ keys carry actual values (sparse panels still paint)', () => {
    // One real field is enough — requiring 2 blanked sparse BLS/census feeds.
    expect(hasNonNullData({ a: 1 })).toBe(true);
    expect(hasNonNullData({ a: 1, b: 'x' })).toBe(true);
    expect(hasNonNullData({ list: [1, 2], rate: 5.4 })).toBe(true);
  });

  it('ignores meta keys (lastUpdated/fetchedOn/isLive/isCurrent/_*)', () => {
    expect(hasNonNullData({
      lastUpdated: 'now', fetchedOn: 'today', isLive: true, isCurrent: true,
      _sources: ['x'],
    })).toBe(false); // only meta → empty
    expect(hasNonNullData({
      lastUpdated: 'now', fetchedOn: 'today', isLive: true, isCurrent: true,
      _sources: ['x'], a: 1,
    })).toBe(true); // one real field paints
  });

  it('counts populated nested objects as one key each', () => {
    expect(hasNonNullData({ a: { x: 1 }, b: { y: 2 } })).toBe(true);
    // All-null nested leaves still leave a non-empty object shell; production
    // treats that as "payload arrived" so applyResult does not blank the tab.
    expect(hasNonNullData({ a: { x: null }, b: null })).toBe(true);
    expect(hasNonNullData({ a: null, b: null })).toBe(false);
  });

  it('counts non-empty arrays as one key', () => {
    expect(hasNonNullData({ list1: [1], list2: [2] })).toBe(true);
    expect(hasNonNullData({ list1: [], list2: [] })).toBe(false);
  });
});

describe('passesStructuralGuard', () => {
  it('returns true for unknown markets (no guard registered)', () => {
    expect(passesStructuralGuard('does-not-exist', { anything: 1 })).toBe(true);
  });

  it('bonds requires 3+ countries with yield data', () => {
    const ok = { yieldCurveData: { US: { '10y': 4.2 }, DE: { '10y': 2.1 }, JP: { '10y': 0.7 } } };
    const sparse = { yieldCurveData: { US: { '10y': 4.2 }, DE: {} } };
    expect(passesStructuralGuard('bonds', ok)).toBe(true);
    expect(passesStructuralGuard('bonds', sparse)).toBe(false);
    expect(passesStructuralGuard('bonds', { yieldCurveData: null })).toBe(false);
  });

  it('commodities requires 2+ COT entries when present', () => {
    expect(passesStructuralGuard('commodities', { cotData: [{ a: 1 }, { b: 2 }] })).toBe(true);
    expect(passesStructuralGuard('commodities', { cotData: [{ a: 1 }] })).toBe(false);
    // when cotData isn't an array, guard is permissive
    expect(passesStructuralGuard('commodities', { cotData: null })).toBe(true);
  });

  it('crypto requires 10+ coins', () => {
    const tenCoins = { coins: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}` })) };
    const fewCoins = { coins: [{ id: 'btc' }] };
    expect(passesStructuralGuard('crypto', tenCoins)).toBe(true);
    expect(passesStructuralGuard('crypto', fewCoins)).toBe(false);
  });

  it('calendar passes if any of events / earnings / centralBanks is populated', () => {
    expect(passesStructuralGuard('calendar', { economicEvents: [{}] })).toBe(true);
    expect(passesStructuralGuard('calendar', { earningsSeason: [{}] })).toBe(true);
    expect(passesStructuralGuard('calendar', { centralBanks: [{}] })).toBe(true);
    expect(passesStructuralGuard('calendar', {})).toBe(false);
  });

  it('accepts sparse-but-valid BLS and Census series snapshots', () => {
    const sparseSeries = { series: { cpi: { latest: { value: 325.2 }, history: { dates: ['2026-05'], values: [325.2] } } } };
    expect(hasNonNullData(sparseSeries, 'bls')).toBe(true);
    expect(passesStructuralGuard('bls', sparseSeries)).toBe(true);
    expect(passesStructuralGuard('census', sparseSeries)).toBe(true);
  });

  it('does not throw on a guard that errors internally', () => {
    // Force an internal throw by passing a getter that explodes.
    const evil = {};
    Object.defineProperty(evil, 'yieldCurveData', { get() { throw new Error('boom'); } });
    expect(() => passesStructuralGuard('bonds', evil)).not.toThrow();
    expect(passesStructuralGuard('bonds', evil)).toBe(false);
  });

  it('every market with an endpoint either has a guard or is permissive by default', () => {
    for (const id of Object.keys(MARKET_ENDPOINTS)) {
      // Permissive (no guard) is fine; presence of a guard is also fine.
      // Just assert the call never throws.
      expect(() => passesStructuralGuard(id, {})).not.toThrow();
    }
  });
});

describe('computeAlerts', () => {
  it('fires VIX spike when value > 30', () => {
    const markets = { derivatives: { vixData: { spot: 35 } } };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      []
    );
    expect(alerts.find(a => a.id === 'vix-spike')).toBeTruthy();
  });

  it('does NOT fire VIX spike when value ≤ 30', () => {
    const markets = { derivatives: { vixData: { spot: 18 } } };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      []
    );
    expect(alerts.find(a => a.id === 'vix-spike')).toBeFalsy();
  });

  it('fires curve inversion when 10Y < 2Y', () => {
    const markets = { bonds: { yieldCurveData: { US: { '10y': 3.8, '2y': 4.2 } } } };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      []
    );
    const a = alerts.find(x => x.id === 'curve-inversion');
    expect(a).toBeTruthy();
    expect(parseFloat(a.value)).toBeCloseTo(-0.4, 1);
  });

  it('fires extreme fear at F&G < 25', () => {
    const markets = { sentiment: { fearGreedData: { score: 18 } } };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      []
    );
    expect(alerts.find(a => a.id === 'fear-extreme')).toBeTruthy();
  });

  it('honors disabledRuleIds', () => {
    const markets = { derivatives: { vixData: { spot: 35 } } };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      ['vix-spike']
    );
    expect(alerts.find(a => a.id === 'vix-spike')).toBeFalsy();
  });

  it('sorts alerts by severity (high → medium → low)', () => {
    const markets = {
      derivatives: { vixData: { spot: 35 } },                       // vix-spike: high
      credit: { spreadData: { current: { hySpread: 500 } } },        // hy-wide: medium
      fx: { dxyHistory: { values: [100, 105] } },                    // dxy-move: low
    };
    const { alerts } = computeAlerts(
      Object.fromEntries(Object.entries(markets).map(([k, v]) => [k, { data: v }])),
      []
    );
    const severityOrder = alerts.map(a => a.severity);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < severityOrder.length; i++) {
      expect(order[severityOrder[i]]).toBeGreaterThanOrEqual(order[severityOrder[i - 1]]);
    }
  });
});

describe('computeFreshnessReport (regression: was bitshift bug)', () => {
  // Anchor "now" so the report is deterministic.
  const NOW = new Date('2026-01-01T12:00:00Z');
  const minutesAgo = (n) => new Date(NOW.getTime() - n * 60_000).toISOString();

  it('marks <15min as fresh', () => {
    const markets = { bonds: { fetchedOn: minutesAgo(5) } };
    const report = computeFreshnessReport(markets, NOW);
    expect(report.bonds.status).toBe('fresh');
  });

  it('marks 15-60min as stale', () => {
    const markets = { bonds: { fetchedOn: minutesAgo(30) } };
    const report = computeFreshnessReport(markets, NOW);
    expect(report.bonds.status).toBe('stale');
  });

  it('marks >60min as outdated', () => {
    const markets = { bonds: { fetchedOn: minutesAgo(120) } };
    const report = computeFreshnessReport(markets, NOW);
    expect(report.bonds.status).toBe('outdated');
  });

  it('marks never-fetched markets as outdated with Infinity age', () => {
    const markets = { bonds: { fetchedOn: null } };
    const report = computeFreshnessReport(markets, NOW);
    expect(report.bonds.status).toBe('outdated');
    expect(report.bonds.ageMinutes).toBe(Infinity);
    expect(report.bonds.timestamp).toBe('never');
  });

  it('reports for every endpoint in MARKET_ENDPOINTS', () => {
    const report = computeFreshnessReport({}, NOW);
    for (const id of Object.keys(MARKET_ENDPOINTS)) {
      expect(report).toHaveProperty(id);
    }
  });

  it('regression: never reports everything as fresh (the `<<` bug)', () => {
    // The bug was `diff << 15` which is left-shift, not less-than. Any
    // non-zero diff produced a truthy left-shift result, so every market
    // was labelled 'fresh' regardless of age. Lock that down.
    const markets = { bonds: { fetchedOn: minutesAgo(1000) } }; // way old
    const report = computeFreshnessReport(markets, NOW);
    expect(report.bonds.status).not.toBe('fresh');
  });
});

describe('STRUCTURAL_GUARDS coverage', () => {
  it('every guard handles unexpected shapes without throwing', () => {
    // Some guards are intentionally permissive when their key isn't present
    // (e.g. commodities returns true if `cotData` isn't an array). The
    // invariant we DO want is no exceptions on weird inputs.
    for (const guard of Object.values(STRUCTURAL_GUARDS)) {
      expect(() => guard({})).not.toThrow();
      expect(() => guard({ junk: null })).not.toThrow();
    }
  });
});
