import { describe, it, expect } from 'vitest';
import {
  hasSubstance,
  confirmDisplayMatchesFetch,
  classifyPanelDisplay,
  evaluatePanelHealth,
  getPanelSpec,
  resolvePanelFieldValue,
} from '../hub/lib/panelHealthEval';

describe('hasSubstance', () => {
  it('rejects null/empty', () => {
    expect(hasSubstance(null)).toBe(false);
    expect(hasSubstance({})).toBe(false);
    expect(hasSubstance([])).toBe(false);
    expect(hasSubstance('—')).toBe(false);
  });
  it('accepts real streams', () => {
    expect(hasSubstance({ US: { '10y': 4.63 } })).toBe(true);
    expect(hasSubstance([1, 2, 3])).toBe(true);
    expect(hasSubstance(4.63)).toBe(true);
  });
  it('rejects hollow taxonomy shells (classic false greens)', () => {
    // Sector buckets with no prices
    expect(hasSubstance([{ sector: 'Energy', commodities: [] }])).toBe(false);
    // Insider rows with ticker only
    expect(hasSubstance([{ ticker: 'GC=F', name: '', type: '', shares: null }])).toBe(false);
    // Yahoo futures map empty
    expect(hasSubstance({ futures: {}, dbc: {} })).toBe(false);
    // Labels without prices
    expect(hasSubstance({ labels: ['Jan', 'Feb'], prices: [null, null] })).toBe(false);
    // Strings alone never count
    expect(hasSubstance('hello')).toBe(false);
    expect(hasSubstance({ name: 'Gold', ticker: 'GC=F' })).toBe(false);
  });
  it('accepts rows once a metric is present', () => {
    expect(hasSubstance([{ ticker: 'GC=F', name: 'Gold', price: 2650 }])).toBe(true);
    expect(hasSubstance({ labels: ['Jan'], prices: [84.2] })).toBe(true);
    expect(hasSubstance({ futures: { 'GC=F': { price: 2650 } } })).toBe(true);
  });
  it('rejects sparse bags (1 filled row in a long hollow list)', () => {
    const { placeholderValueOk } = require('../hub/lib/panelHealthUtils');
    const sparse = Array.from({ length: 20 }, (_, i) => (
      i === 0 ? { ticker: 'AAPL', price: 100 } : { ticker: `T${i}`, name: '', price: null }
    ));
    expect(placeholderValueOk(sparse, 'quotes')).toBe(false);
    const dense = Array.from({ length: 6 }, (_, i) => ({ ticker: `T${i}`, price: 10 + i }));
    expect(placeholderValueOk(dense, 'quotes')).toBe(true);
  });
});

describe('required placeholders only score for fetchOk', () => {
  it('bonds yield is fetchOk with US curve even without DE/JP/GB', async () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield Curve',
      marketCtx: {
        data: {
          yieldCurveData: {
            US: { '3m': 3.6, '2y': 4.1, '5y': 4.2, '10y': 4.5, '30y': 5.0 },
          },
          treasuryRates: { US10Y: 4.5, US2Y: 4.1 },
        },
        isLoading: false,
        fetchedOn: '2026-07-30',
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(true);
    expect(r.placeholders?.emptyRequiredIds || []).toEqual([]);
  });

  it('bonds credit is fetchOk with IG only when HY/EM optional', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'credit',
      panelTitle: 'Credit Spreads',
      marketCtx: {
        data: {
          spreadData: {
            dates: ['Jan', 'Feb'],
            IG: [80, 81],
            HY: [null, null],
            EM: [null, null],
            current: { igSpread: 81, hySpread: null, emSpread: null },
          },
        },
        isLoading: false,
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(true);
  });

  it('100% required fill — missing one required slot fails fetch', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield Curve',
      marketCtx: {
        data: {
          // only 10y, missing 2y required anyOf
          yieldCurveData: { US: { '10y': 4.5 } },
          treasuryRates: { US10Y: 4.5 },
        },
        isLoading: false,
      },
      allMarkets: {},
    });
    // us.2y required anyOf empty → fetchOk false under MIN 1.0
    expect(r.fetchOk).toBe(false);
  });
});

describe('null+null is not ok', () => {
  it('evaluatePanelHealth fails when no market data and no DOM', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield Curve',
      marketCtx: { data: null, isLoading: false },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(false);
    expect(r.displayOk).toBe(false);
    expect(r.confirmOk).toBe(false);
    expect(r.status).not.toBe('ok');
  });

  it('empty field is not ok even if market object exists', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield Curve',
      marketCtx: {
        data: { yieldCurveData: null, lastUpdated: '2026-07-23' },
        isLoading: false,
        fetchedOn: '2026-07-23',
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(false);
    expect(r.status).not.toBe('ok');
  });

  it('fetch-ready but missing panel DOM is never ok', () => {
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield Curve',
      marketCtx: {
        data: {
          yieldCurveData: { US: { '10y': 4.63, '2y': 4.26, '5y': 4.4, '30y': 4.8 } },
          lastUpdated: '2026-07-23',
        },
        isLoading: false,
        fetchedOn: '2026-07-23',
      },
      allMarkets: {},
    });
    // Field may or may not map depending on placeholders, but DOM is absent.
    expect(r.elPresent).toBe(false);
    expect(r.displayOk).toBe(false);
    expect(r.confirmOk).toBe(false);
    expect(r.status).not.toBe('ok');
    expect(r.displayDetail).toMatch(/not in DOM/i);
  });

  it('title-only panel shell is not display ok', () => {
    const el = document.createElement('div');
    el.setAttribute('data-panel-key', 'yield');
    el.setAttribute('data-panel-bound', '1');
    el.innerHTML = '<div class="bento-panel-title-row"><span class="bento-panel-title">Yield Curve</span></div><div class="bento-panel-content"></div>';
    document.body.appendChild(el);
    try {
      const d = classifyPanelDisplay(el, { fetchOk: true });
      expect(d.ok).toBe(false);
    } finally {
      el.remove();
    }
  });

  it('disabled empty shell is not display ok', () => {
    const el = document.createElement('div');
    el.setAttribute('data-panel-key', 'gamma');
    el.setAttribute('data-panel-disabled', '1');
    el.className = 'bento-card bento-card--disabled';
    el.innerHTML = '<div class="bento-panel-content"><div data-panel-empty="1">No data available</div></div>';
    const d = classifyPanelDisplay(el, { fetchOk: true });
    expect(d.ok).toBe(false);
    expect(d.detail).toMatch(/disabled|empty/i);
  });

  it('mounted panel with matching numbers can be ok', () => {
    const root = document.createElement('div');
    root.setAttribute('data-market-id', 'bonds');
    const el = document.createElement('div');
    el.setAttribute('data-panel-key', 'yield');
    el.innerHTML = `
      <div class="bento-panel-content">
        <span data-metric-value="4.63" data-metric-display="4.63%">4.63%</span>
        <span data-metric-value="4.26">4.26%</span>
        <span data-metric-value="4.40">4.40%</span>
        US 10Y 4.63  2Y 4.26  5Y 4.40
      </div>`;
    root.appendChild(el);
    document.body.appendChild(root);
    try {
      const r = evaluatePanelHealth({
        marketId: 'bonds',
        panelId: 'yield',
        panelTitle: 'Yield Curve',
        marketCtx: {
          data: {
            yieldCurveData: { US: { '3m': 3.6, '2y': 4.26, '5y': 4.4, '10y': 4.63, '30y': 4.8 } },
            treasuryRates: { US10Y: 4.63, US2Y: 4.26 },
            lastUpdated: '2026-07-23',
          },
          isLoading: false,
          fetchedOn: '2026-07-23',
        },
        allMarkets: {},
      });
      expect(r.elPresent).toBe(true);
      expect(r.fetchOk).toBe(true);
      expect(r.displayOk).toBe(true);
      expect(r.confirmOk).toBe(true);
      expect(r.status).toBe('ok');
    } finally {
      root.remove();
    }
  });

  it('hollow dash table is not display ok', () => {
    const el = document.createElement('div');
    el.setAttribute('data-panel-key', 'insider');
    el.innerHTML = '<div class="bento-panel-content"><table><tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr></table></div>';
    const d = classifyPanelDisplay(el, { fetchOk: true });
    expect(d.ok).toBe(false);
    expect(d.detail).toMatch(/hollow|no stamped|no numeric/i);
  });

  it('plain text digits without metric stamps is not display ok', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div class="bento-panel-content">Updated 2024 layout h:12 row 30</div>';
    const d = classifyPanelDisplay(el, { fetchOk: true });
    expect(d.ok).toBe(false);
  });
});

describe('classifyPanelDisplay', () => {
  it('rejects empty-state text', () => {
    const el = document.createElement('div');
    el.textContent = 'No data available';
    const d = classifyPanelDisplay(el);
    expect(d.ok).toBe(false);
  });
});

describe('panel field map for insurance', () => {
  it('maps hyoas to fredHyOasHistory', () => {
    const spec = getPanelSpec('insurance', 'hyoas');
    expect(spec?.fieldPath || spec?.field).toMatch(/fredHyOasHistory|hyOAS/i);
    const val = resolvePanelFieldValue(spec, {
      hyOAS: 2.68,
      fredHyOasHistory: { dates: ['2026-01'], values: [268] },
    }, {});
    expect(hasSubstance(val)).toBe(true);
  });
});

describe('confirmDisplayMatchesFetch', () => {
  it('requires samples from fetch to appear in DOM', () => {
    const el = document.createElement('div');
    el.textContent = 'US 10Y 4.63%  2Y 4.26%';
    const field = { US: { '10y': 4.63, '2y': 4.26 } };
    const c = confirmDisplayMatchesFetch(el, field);
    expect(c.ok).toBe(true);
    expect(c.matched).toBeGreaterThanOrEqual(1);
  });

  it('fails when DOM does not show fetched values', () => {
    const el = document.createElement('div');
    el.textContent = 'Yield curve chart loading placeholders — — —';
    const field = { US: { '10y': 4.63, '2y': 4.26 } };
    const c = confirmDisplayMatchesFetch(el, field);
    expect(c.ok).toBe(false);
  });

  it('fails for null fetch', () => {
    const el = document.createElement('div');
    el.textContent = 'anything 1 2 3';
    expect(confirmDisplayMatchesFetch(el, null).ok).toBe(false);
  });

  it('does not free-pass on chart series without matching fetch samples', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div data-series-samples="1,2,3,4">chart</div>';
    const field = { US: { '10y': 4.63, '2y': 4.26 } };
    const c = confirmDisplayMatchesFetch(el, field);
    expect(c.ok).toBe(false);
  });
});

describe('insider hollow payload is not fetchOk', () => {
  it('rejects empty name/type insider rows', () => {
    const r = evaluatePanelHealth({
      marketId: 'equitiesDeepDive',
      panelId: 'insider',
      panelTitle: 'Insider Trading',
      marketCtx: {
        data: {
          insiderData: {
            holders: [{ name: 'X', shares: null, ticker: 'AAPL' }],
            transactions: [{ ticker: 'META', name: '', type: '', shares: 10, value: 0 }],
          },
        },
        isLoading: false,
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(false);
  });
});

describe('catalog-root placeholders are not free greens', () => {
  it('materials-grid is not fetchOk from bare fred bag alone', () => {
    const r = evaluatePanelHealth({
      marketId: 'commodities',
      panelId: 'materials-grid',
      panelTitle: 'Strategic Materials Grid',
      marketCtx: {
        data: {
          // Whole FRED bag with unrelated series — must NOT green materials-grid
          fred: {
            wti: { value: 84 },
            corn: { value: 195 },
            // no copper → materials-grid should fail under leaf paths
          },
          yahoo: { dbc: { price: 29 }, futures: {} },
        },
        isLoading: false,
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(false);
  });

  it('materials-grid is fetchOk when copper series is present', () => {
    const r = evaluatePanelHealth({
      marketId: 'commodities',
      panelId: 'materials-grid',
      panelTitle: 'Strategic Materials Grid',
      marketCtx: {
        data: {
          fred: { copper: { value: 9000 }, wti: { value: 84 } },
        },
        isLoading: false,
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(true);
  });

  it('criticality does not pass on unrelated fred series only', () => {
    const r = evaluatePanelHealth({
      marketId: 'commodities',
      panelId: 'criticality',
      panelTitle: 'Criticality Ranking',
      marketCtx: {
        data: { fred: { rice: { value: 400 }, wheat: { value: 200 } } },
        isLoading: false,
      },
      allMarkets: {},
    });
    expect(r.fetchOk).toBe(false);
  });
});
