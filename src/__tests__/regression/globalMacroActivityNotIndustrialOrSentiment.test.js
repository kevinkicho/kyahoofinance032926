/**
 * Regression: globalMacro Economic Activity must not go green from
 * industrialProd / consumerSentiment / economicActivityData when cfnai
 * is empty. The tile only paints the CFNAI chart.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const IP = { dates: ['2026-05', '2026-06'], values: [102.1, 102.4] };
const SENT = { dates: ['2026-05', '2026-06'], values: [68.2, 67.8] };
const BAG = { industrialProd: IP, consumerSentiment: SENT };
const CFNAI = {
  dates: ['2026-05', '2026-06', '2026-07'],
  values: [0.12, -0.08, 0.04],
  latest: 0.04,
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

describe('globalMacro activity leftover industrial/sentiment wiring', () => {
  it('placeholders and field map bind cfnai only', () => {
    const slots = slotPaths('globalMacro', 'activity');
    expect(slots.some((p) => String(p).includes('cfnai'))).toBe(true);
    expect(slots.some((p) => String(p).includes('industrialProd') || String(p).includes('consumerSentiment') || String(p).includes('economicActivityData'))).toBe(false);

    const spec = specPaths('globalMacro', 'activity');
    expect(spec.includes('cfnai')).toBe(true);
    expect(spec.includes('industrialProd') || spec.includes('consumerSentiment') || spec.includes('economicActivityData')).toBe(false);
  });

  it('industrialProd / consumerSentiment do not make activity L1 fetchOk', () => {
    const globalMacro = {
      data: {
        industrialProd: IP,
        consumerSentiment: SENT,
        economicActivityData: BAG,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'activity',
      marketCtx: globalMacro,
      allMarkets: { globalMacro },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('cfnai still fills L1', () => {
    const globalMacro = {
      data: {
        industrialProd: IP,
        consumerSentiment: SENT,
        cfnai: CFNAI,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'activity',
      marketCtx: globalMacro,
      allMarkets: { globalMacro },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});