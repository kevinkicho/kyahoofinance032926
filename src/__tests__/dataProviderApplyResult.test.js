/**
 * applyResult routing behavior — ensures API payloads reach market state
 * for every primary tab endpoint shape.
 */
import { describe, it, expect } from 'vitest';
import { applyResult, MARKET_ENDPOINTS, ALL_FETCH_IDS } from '../hub/DataProvider';

function emptyState(id) {
  return {
    [id]: {
      data: null,
      isLoading: true,
      isLive: false,
      lastUpdated: null,
      fetchedOn: null,
      isCurrent: false,
      error: null,
      fetchLog: [],
      provenance: {},
    },
  };
}

describe('applyResult keeps real payloads for panel markets', () => {
  const samples = {
    bonds: {
      yieldCurveData: {
        US: { '2y': 4.1, '10y': 4.3 },
        DE: { '10y': 2.4 },
        JP: { '10y': 0.9 },
      },
      spreadData: { dates: ['a'], IG: [80], HY: [300], current: { igSpread: 80, hySpread: 300 } },
      lastUpdated: '2026-07-21',
    },
    crypto: {
      coinMarketData: {
        coins: [
          { id: 'bitcoin', symbol: 'BTC', price: 65000 },
          { id: 'ethereum', symbol: 'ETH', price: 3500 },
        ],
      },
      fearGreedData: { score: 55 },
    },
    commodities: {
      yahoo: {
        futures: {
          'CL=F': { price: 80, change: 1.2 },
          'GC=F': { price: 2300, change: 0.5 },
        },
      },
      eia: { wti_price: { value: 79 } },
      supplyDemand: { crudeStocks: { latest: 400 } },
    },
    realEstate: {
      reitData: [{ ticker: 'PLD', price: 100 }, { ticker: 'AMT', price: 200 }],
      mortgageRates: { rate30y: 6.8 },
      caseShillerData: { dates: ['2024-01'], values: [300] },
    },
    insurance: {
      reinsurers: [{ ticker: 'RNR', price: 300 }],
      sectorETF: { price: 60, changePct: 0.5 },
      combinedRatioData: { quarters: ['Q1'], lines: { Progressive: [98] } },
    },
    globalMacro: {
      scorecardData: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, gdp: 2 })),
      cfnai: { dates: ['2024-01'], values: [0.1], latest: 0.1 },
    },
    equitiesDeepDive: {
      sectorData: {
        sectors: Array.from({ length: 6 }, (_, i) => ({ code: `X${i}`, name: `S${i}`, perf1d: 0.1 })),
      },
      factorData: { stocks: [{ ticker: 'AAPL', value: 1 }], inFavor: { value: 0.5 } },
    },
    fx: {
      spotRates: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150 },
      prevRates: { USD: 1, EUR: 0.91, GBP: 0.78, JPY: 149 },
      changes1d: { EUR: -1.1, GBP: -1.2, JPY: -0.7 },
    },
    derivatives: {
      vixTermStructure: { labels: ['1M', '3M'], values: [16, 18] },
      optionsFlow: [{ ticker: 'SPY', volume: 1000 }],
    },
    credit: {
      spreadData: {
        current: { hySpread: 350 },
        history: { dates: ['a', 'b', 'c', 'd', 'e', 'f'], IG: [1, 2, 3, 4, 5, 6], HY: [3, 3, 3, 3, 3, 3] },
      },
      commercialPaper: { rate: 5.1 },
      emBondData: { countries: Array.from({ length: 6 }, (_, i) => ({ code: `E${i}` })) },
    },
    sentiment: {
      fearGreedData: { score: 40, value: 40 },
      riskData: { signals: [{ name: 'VIX', value: 18 }] },
      cftcData: [{ asset: 'USD' }],
    },
    calendar: {
      economicEvents: [{ date: '2026-08-01', event: 'CPI', country: 'US' }],
      centralBanks: [{ bank: 'Fed', rate: 4.5 }],
      earningsSeason: [{ ticker: 'AAPL', date: '2026-08-02' }],
    },
    equities: {
      quotes: { AAPL: { price: 200 }, MSFT: { price: 400 } },
      indices: { SPY: { price: 500 } },
    },
    bls: {
      series: { cpi: { latest: { value: 300 } } },
    },
    eia: {
      electricity: { residential: 0.15 },
      co2Emissions: { total: 5000 },
    },
  };

  for (const [id, payload] of Object.entries(samples)) {
    it(`keeps ${id} payload for panels (not nulled)`, () => {
      expect(MARKET_ENDPOINTS[id] || id === 'equities').toBeTruthy();
      const prev = emptyState(id);
      const next = applyResult(prev, {
        marketId: id,
        data: payload,
        ok: true,
        status: 200,
        duration: 10,
        requestId: 'test',
      });
      expect(next[id].data, `${id} data should be kept`).toBeTruthy();
      expect(next[id].error).toBeNull();
      expect(next[id].isLoading).toBe(false);
    });
  }

  it('hard-fails only on empty objects when no prior data', () => {
    const prev = emptyState('bonds');
    const next = applyResult(prev, {
      marketId: 'bonds',
      data: { lastUpdated: 'x', fetchedOn: 'y', isLive: true, isCurrent: true },
      ok: true,
      status: 200,
      duration: 1,
    });
    expect(next.bonds.data).toBeNull();
    expect(next.bonds.error).toMatch(/empty/i);
  });

  it('preserves prior data when a later response is empty', () => {
    const withData = applyResult(emptyState('bonds'), {
      marketId: 'bonds',
      data: samples.bonds,
      ok: true,
      status: 200,
      duration: 1,
    });
    const next = applyResult(withData, {
      marketId: 'bonds',
      data: { lastUpdated: 'x', fetchedOn: 'y', isLive: false, _degraded: true },
      ok: true,
      status: 200,
      duration: 2,
    });
    expect(next.bonds.data).toEqual(samples.bonds);
    expect(next.bonds.error).toBeNull();
    expect(next.bonds.isLoading).toBe(false);
  });

  it('preserves prior data when a fetch network-fails', () => {
    const prev = {
      crypto: {
        data: samples.crypto,
        isLoading: false,
        isLive: true,
        error: null,
        fetchLog: [],
        provenance: {},
      },
    };
    const next = applyResult(prev, {
      marketId: 'crypto',
      data: null,
      ok: false,
      status: 0,
      duration: 5,
      error: 'timeout',
    });
    expect(next.crypto.data).toEqual(samples.crypto);
    expect(next.crypto.error).toBeNull();
  });
});

describe('MARKET_ENDPOINTS routing surface', () => {
  it('includes all tab-critical routes', () => {
    const required = [
      'bonds', 'fx', 'crypto', 'commodities', 'realEstate', 'insurance',
      'globalMacro', 'equitiesDeepDive', 'credit', 'sentiment', 'calendar',
      'derivatives', 'equities', 'bls', 'eia', 'watchlist', 'analytics',
    ];
    for (const id of required) {
      expect(ALL_FETCH_IDS).toContain(id);
      expect(MARKET_ENDPOINTS[id]).toMatch(/^\/api\//);
    }
  });

  it('commodities points at enhanced endpoint', () => {
    expect(MARKET_ENDPOINTS.commodities).toBe('/api/commoditiesEnhanced');
  });
});
