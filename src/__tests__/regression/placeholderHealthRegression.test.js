/**
 * Regression: splash false reds (F✗ with data present).
 * Chart axis date arrays and letter-grade ratings have no numeric leaves;
 * old placeholderValueOk scored them empty → 50% fill → fetchOk false.
 */
import { describe, it, expect } from 'vitest';
import { placeholderValueOk, hasSubstance, resolvePath } from '../../hub/lib/panelHealthUtils';
import { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } from '../../data/panelPlaceholders';
import { evaluatePanelHealth } from '../../hub/lib/panelHealthEval';

/** Score required-slot fill rate the same way evaluatePanelHealth does. */
function requiredFillRate(marketId, panelId, primary, allMarkets = {}) {
  const slots = getPanelPlaceholders(marketId, panelId) || [];
  let requiredTotal = 0;
  let requiredFilled = 0;
  for (const slot of slots) {
    const isRequired = slot.required !== false;
    if (!isRequired) continue;
    requiredTotal += 1;
    let v = null;
    let path = slot.path || '';
    if (slot.crossMarket) {
      const dep = allMarkets[slot.crossMarket]?.data ?? allMarkets[slot.crossMarket];
      if (dep) {
        if (slot.path) {
          v = resolvePath(dep, slot.path);
          path = slot.path;
        } else if (slot.anyOf) {
          for (const pth of slot.anyOf) {
            const cand = resolvePath(dep, pth);
            if (placeholderValueOk(cand, pth)) {
              v = cand;
              path = pth;
              break;
            }
          }
        }
      }
    } else if (slot.anyOf) {
      for (const pth of slot.anyOf) {
        const cand = resolvePath(primary, pth);
        if (placeholderValueOk(cand, pth)) {
          v = cand;
          path = pth;
          break;
        }
      }
    } else if (slot.path) {
      v = resolvePath(primary, slot.path);
    }
    if (placeholderValueOk(v, path)) requiredFilled += 1;
  }
  const denom = requiredTotal || 1;
  return { rate: requiredFilled / denom, requiredFilled, requiredTotal };
}

const BONDS_FIXTURE = {
  yieldCurveData: {
    US: { '3m': 3.8, '2y': 4.2, '5y': 4.3, '10y': 4.6, '30y': 5.1 },
  },
  treasuryRates: { US10Y: 4.6, US2Y: 4.2, fedFunds: 4.3 },
  spreadIndicators: { t10y2y: 0.4, t10y3m: 0.8 },
  spreadData: { current: { igSpread: 95, hySpread: 320 }, dates: ['a'], IG: [90] },
  tipsYields: { '5y': 1.8, '10y': 2.0 },
  spreadHistory: {
    dates: ['2024-01', '2024-02', '2024-03'],
    t10y2y: [0.5, 0.45, 0.4],
    t10y3m: [0.9, 0.85, 0.8],
  },
  fedBalanceSheetHistory: {
    dates: ['2024-01', '2024-02', '2024-03'],
    values: [7000, 7100, 7050],
  },
  m2HistoryData: {
    dates: ['2024-01', '2024-02', '2024-03'],
    values: [20000, 20100, 20200],
  },
  debtToGdpHistory: {
    dates: ['2024-01', '2024-02'],
    values: [120, 121],
    latest: 121,
  },
  cpiComponents: {
    dates: ['2024-01', '2024-02'],
    all: [3.1, 3.0],
    latest: { all: 3.0 },
  },
  creditRatings: {
    asOf: '2024-01',
    countries: [
      { country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+' },
    ],
  },
  durationLadder: {
    buckets: [{ label: '0-1y', amount: 1e12, share: 0.2 }],
    asOf: '2024-01',
  },
  breakevensData: { current: { be5y: 2.2, be10y: 2.3 } },
  macroData: { unemployment: 4.1, gdp: 2.5, pce: 2.4 },
  nationalDebt: 35e12,
};

describe('placeholder health regressions', () => {
  it('accepts non-empty chart date axes (no numeric leaves)', () => {
    expect(placeholderValueOk(['2024-01', '2024-02', '2024-03'], 'fedBalanceSheetHistory.dates')).toBe(true);
    expect(placeholderValueOk(['Jan', 'Feb'], 'labels')).toBe(true);
    // still reject empty / single-point axes
    expect(placeholderValueOk([], 'dates')).toBe(false);
    expect(placeholderValueOk(['only'], 'dates')).toBe(false);
  });

  it('accepts letter-grade rating rows', () => {
    expect(placeholderValueOk(
      [{ country: 'US', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+' }],
      'creditRatings.countries',
    )).toBe(true);
    // still rejects hollow objects
    expect(hasSubstance([{ country: 'US', name: 'United States' }])).toBe(false);
  });

  it('bonds fed/m2/curvespreads/ratings hit fill rate with realistic payload', () => {
    for (const id of ['fed', 'm2', 'curvespreads', 'ratings', 'debtgdp', 'cpi', 'duration', 'yield', 'credit']) {
      const { rate, requiredFilled, requiredTotal } = requiredFillRate('bonds', id, BONDS_FIXTURE);
      expect(
        rate,
        `bonds:${id} fill ${requiredFilled}/${requiredTotal} = ${rate}`,
      ).toBeGreaterThanOrEqual(MIN_PLACEHOLDER_FILL_RATE);
    }
  });

  it('evaluatePanelHealth: bonds fed is fetchOk without DOM (display may fail)', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'fed',
      panelTitle: 'Fed Balance Sheet',
      marketCtx: { data: BONDS_FIXTURE, isLoading: false, fetchedOn: '2026-07-31' },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(true);
    // No DOM → not overall ok
    expect(r.status).not.toBe('ok');
  });

  it('evaluatePanelHealth: bonds ratings is fetchOk with letter grades only', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'ratings',
      marketCtx: { data: BONDS_FIXTURE, isLoading: false },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(true);
  });

  it('evaluatePanelHealth: bonds auctions uses treasuryAuctions cross-market', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'auctions',
      marketCtx: { data: BONDS_FIXTURE, isLoading: false },
      allMarkets: {
        treasuryAuctions: {
          data: {
            auctions: [
              { auctionDate: '2024-01-01', bidToCover: 2.5, securityTerm: '10-Year' },
            ],
            summary: { count: 1, avgBidToCover: 2.5 },
          },
          isLoading: false,
        },
      },
    });
    expect(r.fetchOk).toBe(true);
  });

  it('isLoading market without bus stays not-ok (splash loading state)', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      marketCtx: { data: null, isLoading: true },
      allMarkets: {},
    });
    expect(r.status).toBe('loading');
    expect(r.fetchOk).toBe(false);
  });
});
