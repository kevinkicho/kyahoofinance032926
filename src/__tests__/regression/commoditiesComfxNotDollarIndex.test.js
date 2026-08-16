/**
 * Regression: commodities Commodity FX must not go green from
 * fred.dollarIndex when commodityCurrencies is empty. The tile only
 * paints CAD/AUD/NOK/BRL/CLP/ZAR rates. dollarIndex is unused leftover.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const DOLLAR = { value: 104.2, history: [103.1, 103.8, 104.2] };
const FX = {
  CAD: { rate: 1.3612, changePct: 0.14 },
  AUD: { rate: 1.5280, changePct: -0.22 },
  NOK: { rate: 10.842, changePct: 0.08 },
  BRL: { rate: 5.431, changePct: 0.31 },
  CLP: { rate: 942.1, changePct: -0.11 },
  ZAR: { rate: 18.24, changePct: 0.19 },
};

function specPaths(marketId, panelId) {
  const spec = getPanelFieldSpec(marketId, panelId);
  const out = [];
  if (!spec) return out;
  out.push(spec.field, spec.fieldPath, spec.crossMarket);
  for (const alt of spec.anyOf || []) out.push(alt.field, alt.fieldPath, alt.crossMarket);
  return out.filter(Boolean);
}

function slotPaths(marketId, panelId) {
  const slots = getPanelPlaceholders(marketId, panelId) || [];
  return slots.flatMap((s) => [s.path, s.crossMarket, ...(s.anyOf || [])]).filter(Boolean);
}

describe('commodities comfx leftover dollarIndex wiring', () => {
  it('placeholders and field map bind commodityCurrencies only', () => {
    const slots = slotPaths('commodities', 'comfx');
    expect(slots.some((p) => String(p).includes('commodityCurrencies'))).toBe(true);
    expect(slots.some((p) => String(p).includes('dollarIndex') || p === 'fred')).toBe(false);

    const spec = specPaths('commodities', 'comfx');
    expect(spec.includes('commodityCurrencies')).toBe(true);
    expect(spec.includes('dollarIndex') || spec.includes('fred')).toBe(false);
  });

  it('fred.dollarIndex does not make comfx L1 fetchOk', () => {
    const commodities = {
      data: { fred: { dollarIndex: DOLLAR, wti: { value: 78.4 } }, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'comfx',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('commodityCurrencies still fills L1', () => {
    const commodities = {
      data: {
        fred: { dollarIndex: DOLLAR },
        commodityCurrencies: FX,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'comfx',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
