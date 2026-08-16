/**
 * Regression: credit tiles must not go green from sibling bags
 * (spreads / loans / BIS OTC) when the painted field is empty.
 * Also locks derivatives:bis-otc so VIX term structure cannot fill it.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';
import { hasBisCreditRows } from '../../markets/credit/components/BisTotalCreditPanel.jsx';

const SPREADS = { current: { igSpread: 95, hySpread: 320 }, history: { IG: [90, 95] } };
const LOANS = { cloTranches: [{ name: 'AAA', spread: 110 }] };
const OTC = {
  categories: {
    total: { label: 'Total', series: [{ period: '2025-H2', value: 700000000 }] },
  },
};
const VIX = { dates: ['1M', '3M'], values: [14.2, 16.1] };
const BIS_CREDIT = {
  US: { label: 'United States', latest: 251.2, period: '2025-Q4' },
  JP: { label: 'Japan', latest: 268.4, period: '2025-Q4' },
};
const QUALITY = {
  dates: ['2026-01', '2026-02'],
  aaa: [4.8, 4.7],
  baa: [5.6, 5.5],
  latest: { spreadBps: 80, aaaPct: 4.7, baaPct: 5.5, date: '2026-02' },
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

describe('credit credit-quality leftover spread wiring', () => {
  it('placeholders and field map do not point at spreadData', () => {
    expect(slotPaths('credit', 'credit-quality').some((p) => String(p).includes('spreadData'))).toBe(false);
    expect(specPaths('credit', 'credit-quality').includes('spreadData')).toBe(false);
    expect(specPaths('credit', 'credit-quality').includes('creditQuality')).toBe(true);
  });

  it('IG/HY spreads do not make credit-quality L1 fetchOk', () => {
    const credit = { data: { spreadData: SPREADS, loanData: LOANS, fetchedOn: '2026-08-15' }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'credit-quality',
      marketCtx: credit,
      allMarkets: { credit },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('creditQuality still fills L1', () => {
    const credit = { data: { creditQuality: QUALITY, spreadData: SPREADS, fetchedOn: '2026-08-15' }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'credit-quality',
      marketCtx: credit,
      allMarkets: { credit },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('credit bis-total-credit leftover OTC/spread wiring', () => {
  it('placeholders and field map bind globalMacro.bisCreditToGDP only', () => {
    const slots = slotPaths('credit', 'bis-total-credit');
    expect(slots.some((p) => String(p).includes('bisCreditToGDP'))).toBe(true);
    expect(slots.some((p) => ['spreadData', 'loanData', 'categories', 'bisOTC'].includes(p) || String(p).includes('spreadData'))).toBe(false);

    const spec = specPaths('credit', 'bis-total-credit');
    expect(spec.includes('bisCreditToGDP')).toBe(true);
    expect(spec.includes('globalMacro')).toBe(true);
    expect(spec.includes('spreadData') || spec.includes('loanData') || spec.includes('bisOTC')).toBe(false);
  });

  it('spreads, loans, and BIS OTC do not make total-credit L1 fetchOk', () => {
    const credit = { data: { spreadData: SPREADS, loanData: LOANS, fetchedOn: '2026-08-15' }, isLoading: false };
    const bisOTC = { data: OTC, isLoading: false };
    const globalMacro = { data: { scorecardData: [{ code: 'US' }], fetchedOn: '2026-08-15' }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'bis-total-credit',
      marketCtx: credit,
      allMarkets: { credit, bisOTC, globalMacro },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('globalMacro.bisCreditToGDP still fills L1', () => {
    const credit = { data: { fetchedOn: '2026-08-15' }, isLoading: false };
    const globalMacro = { data: { bisCreditToGDP: BIS_CREDIT }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'bis-total-credit',
      marketCtx: credit,
      allMarkets: { credit, globalMacro },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('hasBisCreditRows live-chip helper', () => {
  it('is false for empty / sibling-only payloads', () => {
    expect(hasBisCreditRows(null)).toBe(false);
    expect(hasBisCreditRows(SPREADS)).toBe(false);
    expect(hasBisCreditRows(OTC)).toBe(false);
  });

  it('is true when country credit/GDP rows exist', () => {
    expect(hasBisCreditRows(BIS_CREDIT)).toBe(true);
  });
});

describe('derivatives bis-otc leftover VIX wiring', () => {
  it('placeholders and field map do not point at vixTermStructure', () => {
    expect(slotPaths('derivatives', 'bis-otc').some((p) => String(p).includes('vixTermStructure'))).toBe(false);
    expect(specPaths('derivatives', 'bis-otc').includes('vixTermStructure')).toBe(false);
    expect(specPaths('derivatives', 'bis-otc').includes('bisOTC')).toBe(true);
  });

  it('VIX term structure does not make OTC L1 fetchOk', () => {
    const derivatives = { data: { vixTermStructure: VIX, fetchedOn: '2026-08-15' }, isLoading: false };
    const bisOTC = { data: {}, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'derivatives',
      panelId: 'bis-otc',
      marketCtx: derivatives,
      allMarkets: { derivatives, bisOTC },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('bisOTC.categories still fills L1', () => {
    const derivatives = { data: { vixTermStructure: VIX, fetchedOn: '2026-08-15' }, isLoading: false };
    const bisOTC = { data: OTC, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'derivatives',
      panelId: 'bis-otc',
      marketCtx: derivatives,
      allMarkets: { derivatives, bisOTC },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
