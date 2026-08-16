/**
 * Regression: Equity+ Factor Rankings must not go green from
 * breadthDivergence / equityRiskPremium when factorData is empty.
 * The tile returns null without factorData; breadth / ERP are extras
 * gated behind that bag (valuation / earnings-quality siblings).
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const ERP = { erp: 2.4, earningsYield: 6.1, treasury10y: 3.7 };
const BREADTH = { spy1m: 3.2, rsp1m: 1.1, divergence: 2.1 };
const FACTORS = {
  inFavor: { momentum: 4.2, value: -1.1, quality: 2.0, lowVol: 0.4 },
  stocks: [
    { ticker: 'AAPL', name: 'Apple', sector: 'Tech', composite: 72, momentum: 80, value: 40, quality: 75, lowVol: 60 },
    { ticker: 'JNJ', name: 'J&J', sector: 'Health', composite: 68, momentum: 30, value: 70, quality: 82, lowVol: 88 },
  ],
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

describe('equity+ factor-rankings leftover ERP / breadth wiring', () => {
  it('placeholders and field map bind factorData only', () => {
    const slots = slotPaths('equitiesDeepDive', 'factor-rankings');
    expect(slots.some((p) => String(p).includes('factorData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('breadthDivergence'))).toBe(false);
    expect(slots.some((p) => String(p).includes('equityRiskPremium'))).toBe(false);

    const spec = specPaths('equitiesDeepDive', 'factor-rankings');
    expect(spec.includes('factorData')).toBe(true);
    expect(spec.includes('breadthDivergence') || spec.includes('equityRiskPremium')).toBe(false);
  });

  it('equityRiskPremium / breadthDivergence do not make factor-rankings L1 fetchOk', () => {
    const equitiesDeepDive = {
      data: { equityRiskPremium: ERP, breadthDivergence: BREADTH, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'equitiesDeepDive',
      panelId: 'factor-rankings',
      marketCtx: equitiesDeepDive,
      allMarkets: { equitiesDeepDive },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('factorData still fills L1 without ERP / breadth', () => {
    const equitiesDeepDive = {
      data: { factorData: FACTORS, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'equitiesDeepDive',
      panelId: 'factor-rankings',
      marketCtx: equitiesDeepDive,
      allMarkets: { equitiesDeepDive },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
