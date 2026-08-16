/**
 * Regression: sentiment Leverage Metrics must not go green from
 * mutualFundFlows when marginDebt / consumerCredit are empty, and
 * must not stay red when those painted bags are present.
 * The tile only paints FINRA margin debt + consumer credit.
 * mutualFundFlows is never mounted (SentimentMarket does not pass it).
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const FLOWS = { dates: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'], values: [12.4, 8.1, -3.2, 5.6] };
const MARGIN = { dates: ['2025-10', '2025-11', '2025-12', '2026-01'], values: [780000, 802000, 815000, 821000] };
const CREDIT = { dates: ['2025-10', '2025-11', '2025-12', '2026-01'], values: [5040000, 5062000, 5088000, 5110000] };

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

describe('sentiment leverage leftover mutualFundFlows wiring', () => {
  it('placeholders and field map bind marginDebt / consumerCredit only', () => {
    const slots = slotPaths('sentiment', 'leverage');
    expect(slots.some((p) => String(p).includes('marginDebt'))).toBe(true);
    expect(slots.some((p) => String(p).includes('consumerCredit'))).toBe(true);
    expect(slots.some((p) => String(p).includes('mutualFundFlows'))).toBe(false);

    const spec = specPaths('sentiment', 'leverage');
    expect(spec.includes('marginDebt')).toBe(true);
    expect(spec.includes('consumerCredit')).toBe(true);
    expect(spec.includes('mutualFundFlows')).toBe(false);
  });

  it('mutualFundFlows does not make leverage L1 fetchOk', () => {
    const sentiment = {
      data: { mutualFundFlows: FLOWS, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'sentiment',
      panelId: 'leverage',
      marketCtx: sentiment,
      allMarkets: { sentiment },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('marginDebt + consumerCredit still fill L1 without mutualFundFlows', () => {
    const sentiment = {
      data: { marginDebt: MARGIN, consumerCredit: CREDIT, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'sentiment',
      panelId: 'leverage',
      marketCtx: sentiment,
      allMarkets: { sentiment },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
