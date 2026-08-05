import { describe, it, expect } from 'vitest';
import {
  getMarketContract,
  listContractMarketIds,
  validateAgainstContract,
  MARKET_CONTRACTS,
  slicePanelPayload,
  PANEL_FIELD_MAP,
} from '../../shared/contracts/index.js';
import { MARKET_ENDPOINTS } from '../hub/lib/marketEndpoints.js';

describe('market contracts', () => {
  it('covers all tab markets with endpoints', () => {
    const ids = listContractMarketIds();
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(ids).toEqual(expect.arrayContaining(['equities', 'bonds', 'fx', 'crypto']));
    for (const id of ['equities', 'bonds', 'fx', 'crypto', 'credit', 'sentiment']) {
      const c = getMarketContract(id);
      expect(c, id).toBeTruthy();
      expect(c.primary).toBe(MARKET_ENDPOINTS[id] || c.primary);
      expect(c.schemaId).toBeTruthy();
    }
  });

  it('explicit contracts are not auto', () => {
    expect(getMarketContract('equities').auto).toBeFalsy();
    expect(getMarketContract('bonds').auto).toBeFalsy();
  });

  it('auto contracts mark auto:true', () => {
    const fx = getMarketContract('fx');
    if (fx?.auto) expect(fx.schemaId).toMatch(/auto/);
  });

  it('equities contract requires quotes', () => {
    const bad = validateAgainstContract('equities', { fetchedOn: '2026-08-04' });
    expect(bad.ok).toBe(false);
    expect(bad.missing).toContain('quotes');

    const good = validateAgainstContract('equities', {
      quotes: { AAPL: { price: 1 } },
      fetchedOn: '2026-08-04',
    });
    expect(good.ok).toBe(true);
  });

  it('bonds contract requires yieldCurveData', () => {
    const r = validateAgainstContract('bonds', {
      yieldCurveData: { US: { '10y': 4 } },
      fetchedOn: '2026-08-04',
    });
    expect(r.ok).toBe(true);
  });

  it('digestKeys are non-empty for contracted markets', () => {
    for (const id of listContractMarketIds()) {
      const c = MARKET_CONTRACTS[id];
      // auto markets may have empty digestKeys if no primary-field panels
      if (!c.auto) {
        expect(c.digestKeys?.length, id).toBeGreaterThan(0);
      }
    }
  });

  it('slicePanelPayload returns heatmap quotes', () => {
    const data = {
      quotes: { AAPL: { price: 190, changePct: 1.2 } },
      fetchedOn: '2026-08-04',
    };
    const slice = slicePanelPayload('equities', 'heatmap', data, PANEL_FIELD_MAP);
    expect(slice.ok).toBe(true);
    expect(slice.fields.quotes.AAPL.price).toBe(190);
  });

  it('slicePanelPayload marks cross-market deps', () => {
    const slice = slicePanelPayload('equities', 'sec-filings', { fetchedOn: '2026-08-04' }, PANEL_FIELD_MAP);
    expect(slice.missing.some((m) => String(m).includes('edgar') || String(m).includes('crossMarket'))).toBe(true);
  });
});
