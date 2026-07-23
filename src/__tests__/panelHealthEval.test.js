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
});

describe('null+null is not green', () => {
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

  it('empty field is not green even if market object exists', () => {
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
});
