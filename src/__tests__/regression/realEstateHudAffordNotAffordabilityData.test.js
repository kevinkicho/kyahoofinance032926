/**
 * Regression: realEstate HUD affordability tiles must not go green from
 * affordabilityData when hudData is empty. Both tiles only paint HUD
 * metro rent-to-income. affordabilityData is the sibling afford-stack tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const AFFORD = {
  current: { medianPrice: 412000, index: 98.4, asOf: '2026-07' },
  history: [{ date: '2026-06', index: 97.1 }, { date: '2026-07', index: 98.4 }],
};
const HUD = [
  { city: 'Miami', ratio: 41.2, rent: 2100, income: 61200, homeValue: 455000 },
  { city: 'Dallas', ratio: 28.4, rent: 1650, income: 69800, homeValue: 368000 },
];

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

const HUD_PANELS = ['hud-afford', 'hud-affordability-by-metro'];

describe('realEstate hud-afford leftover affordabilityData wiring', () => {
  it.each(HUD_PANELS)('placeholders and field map bind hudData only for %s', (panelId) => {
    const slots = slotPaths('realEstate', panelId);
    expect(slots.some((p) => String(p).includes('hudData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('affordabilityData'))).toBe(false);

    const spec = specPaths('realEstate', panelId);
    expect(spec.includes('hudData')).toBe(true);
    expect(spec.includes('affordabilityData')).toBe(false);
  });

  it.each(HUD_PANELS)('affordabilityData does not make %s L1 fetchOk', (panelId) => {
    const realEstate = {
      data: { affordabilityData: AFFORD, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'realEstate',
      panelId,
      marketCtx: realEstate,
      allMarkets: { realEstate },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it.each(HUD_PANELS)('hudData still fills %s L1', (panelId) => {
    const realEstate = {
      data: {
        affordabilityData: AFFORD,
        hudData: HUD,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'realEstate',
      panelId,
      marketCtx: realEstate,
      allMarkets: { realEstate },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
