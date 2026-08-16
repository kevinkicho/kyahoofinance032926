/**
 * Regression: commodities COT Positioning must not go green from
 * cftcTFF.contracts when cotData is empty. The tile only paints
 * cotData.commodities. cftcTFF.contracts is the sibling derivatives
 * CFTC TFF tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const TFF_CONTRACTS = {
  ES: { name: 'E-mini S&P 500', dealerNet: -120400, assetMgrNet: 98400, levNet: 18200 },
  NQ: { name: 'E-mini Nasdaq', dealerNet: -88200, assetMgrNet: 64100, levNet: 21400 },
  TY: { name: '10-Year Note', dealerNet: 45200, assetMgrNet: -31800, levNet: -9100 },
};

const COT = {
  commodities: [
    {
      name: 'WTI Crude Oil',
      latest: { noncommNet: 184000, commNet: -162000, netChange: 12000, totalOI: 2100000 },
      history: [
        { date: '2026-06-03', noncommNet: 160000 },
        { date: '2026-06-10', noncommNet: 168000 },
        { date: '2026-06-17', noncommNet: 184000 },
      ],
    },
    {
      name: 'Gold',
      latest: { noncommNet: 221000, commNet: -198000, netChange: -8000, totalOI: 540000 },
      history: [
        { date: '2026-06-03', noncommNet: 240000 },
        { date: '2026-06-10', noncommNet: 229000 },
        { date: '2026-06-17', noncommNet: 221000 },
      ],
    },
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

describe('commodities cot leftover cftcTFF wiring', () => {
  it('placeholders and field map bind cotData only', () => {
    const slots = slotPaths('commodities', 'cot');
    expect(slots.some((p) => String(p).includes('cotData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('cftcTFF') || String(p).includes('contracts'))).toBe(false);

    const spec = specPaths('commodities', 'cot');
    expect(spec.some((p) => String(p).includes('cotData'))).toBe(true);
    expect(spec.includes('cftcTFF') || spec.includes('contracts')).toBe(false);
  });

  it('cftcTFF.contracts does not make cot L1 fetchOk', () => {
    const commodities = {
      data: { fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const cftcTFF = { data: { contracts: TFF_CONTRACTS }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'cot',
      marketCtx: commodities,
      allMarkets: { commodities, cftcTFF },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('cotData.commodities still fills L1', () => {
    const commodities = {
      data: { cotData: COT, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const cftcTFF = { data: { contracts: TFF_CONTRACTS }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'cot',
      marketCtx: commodities,
      allMarkets: { commodities, cftcTFF },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
