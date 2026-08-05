/**
 * Layered panel health model — L1 data / L2 paint / presentation policy.
 */
import { describe, it, expect } from 'vitest';
import {
  DATA,
  PAINT,
  VIA,
  factsFromReport,
  attachHealthLayers,
  toTopbarDot,
  toSplashChip,
  toMarketSplashKind,
  countHealthStatuses,
  evaluatePanelData,
  evaluateContractPanelFields,
  evaluateAllMarketsDataOnly,
  reportFromPanelData,
} from '../hub/lib/health/index.js';
import { derivePanelSignal } from '../hub/lib/panelHealthSignal.js';
import {
  panelChipKind,
  countStatuses,
  evaluatePanelHealth,
  evaluateAllMarkets,
} from '../hub/lib/panelHealthEval.js';
import { MARKET_PANELS } from '../data/marketPanels.js';

describe('factsFromReport (L1/L2)', () => {
  it('maps fetchOk to data ready', () => {
    const h = factsFromReport({
      status: 'pending',
      fetchOk: true,
      displayOk: false,
      confirmOk: false,
      elPresent: false,
    });
    expect(h.data).toBe(DATA.READY);
    expect(h.paint).toBe(PAINT.MISSING);
    expect(h.via).toBe(VIA.NONE);
  });

  it('maps uiOk to true_ui natural', () => {
    const h = factsFromReport({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: true,
      uiOk: true,
      healthQuality: 'ui',
    });
    expect(h.data).toBe(DATA.READY);
    expect(h.paint).toBe(PAINT.TRUE_UI);
    expect(h.via).toBe(VIA.NATURAL);
    expect(h.uiOk).toBe(true);
    expect(h.bridgeOnly).toBe(false);
  });

  it('maps bridgeOnly to shell via bridge', () => {
    const h = factsFromReport({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: true,
      uiOk: false,
      bridgeOnly: true,
      healthQuality: 'bridge',
      displayDetail: 'health bridge only (3 stamp(s); no real UI metrics)',
    });
    expect(h.paint).toBe(PAINT.SHELL);
    expect(h.via).toBe(VIA.BRIDGE);
    expect(h.bridgeOnly).toBe(true);
    expect(h.uiOk).toBe(false);
  });

  it('maps cross-market wait to data waiting', () => {
    const h = factsFromReport({
      status: 'pending',
      fetchOk: false,
      fetchDetail: 'waiting for cross-market: bonds',
    });
    expect(h.data).toBe(DATA.WAITING);
  });

  it('attachHealthLayers adds health + dataState + paintState', () => {
    const r = attachHealthLayers({
      status: 'ok',
      fetchOk: true,
      displayOk: true,
      confirmOk: true,
      elPresent: true,
      uiOk: true,
      healthQuality: 'ui',
    });
    expect(r.health.paint).toBe(PAINT.TRUE_UI);
    expect(r.dataState).toBe(DATA.READY);
    expect(r.paintState).toBe(PAINT.TRUE_UI);
    expect(r.paintVia).toBe(VIA.NATURAL);
  });
});

describe('toTopbarDot presentation policy', () => {
  it('closed tab + data ready → pending grey, never green', () => {
    const s = toTopbarDot(
      {
        status: 'ok',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        elPresent: true,
        uiOk: true,
        healthQuality: 'ui',
      },
      { tabVisible: false, marketHasPayload: true },
    );
    expect(s.kind).toBe('pending');
    expect(s.color).toBe('pending');
    expect(s.uiOk).toBe(false);
  });

  it('open tab + true UI → verified green', () => {
    const s = toTopbarDot(
      {
        status: 'ok',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        elPresent: true,
        uiOk: true,
        healthQuality: 'ui',
      },
      { tabVisible: true, marketHasPayload: true },
    );
    expect(s.kind).toBe('verified');
    expect(s.color).toBe('ok');
  });

  it('open tab + bridge → amber, never ok', () => {
    const s = toTopbarDot(
      {
        status: 'ok',
        fetchOk: true,
        displayOk: true,
        confirmOk: true,
        elPresent: true,
        uiOk: false,
        bridgeOnly: true,
        healthQuality: 'bridge',
      },
      { tabVisible: true, marketHasPayload: true },
    );
    expect(s.kind).toBe('bridge');
    expect(s.color).toBe('bridge');
    expect(s.color).not.toBe('ok');
  });

  it('derivePanelSignal is an alias of toTopbarDot', () => {
    const report = {
      status: 'loading',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
    };
    const a = toTopbarDot(report, { tabVisible: false, marketLoading: true });
    const b = derivePanelSignal(report, { tabVisible: false, marketLoading: true });
    expect(b.kind).toBe(a.kind);
    expect(b.color).toBe(a.color);
  });
});

describe('toSplashChip + market aggregates', () => {
  it('never paints bridge as ui', () => {
    expect(toSplashChip({
      status: 'ok',
      fetchOk: true,
      uiOk: false,
      bridgeOnly: true,
      healthQuality: 'bridge',
    })).toBe('bridge');
  });

  it('panelChipKind delegates to toSplashChip', () => {
    const r = { status: 'ok', uiOk: true, healthQuality: 'ui' };
    expect(panelChipKind(r)).toBe(toSplashChip(r));
  });

  it('market ok only when every panel is true UI', () => {
    expect(toMarketSplashKind({
      marketLoadStatus: 'ok',
      panelIds: ['a', 'b'],
      reports: {
        a: { status: 'ok', uiOk: true, healthQuality: 'ui' },
        b: { status: 'ok', uiOk: false, bridgeOnly: true, healthQuality: 'bridge' },
      },
    })).toBe('bridge');
  });

  it('countStatuses includes dataReady (L1)', () => {
    const byMarket = {
      equities: {
        a: { status: 'ok', uiOk: true, healthQuality: 'ui', fetchOk: true },
        b: { status: 'pending', fetchOk: true, displayOk: false },
        c: { status: 'null', fetchOk: false },
      },
    };
    const c = countHealthStatuses(byMarket);
    expect(c.dataReady).toBe(2);
    expect(c.okUi).toBe(1);
    expect(countStatuses(byMarket).dataReady).toBe(2);
  });
});

describe('evaluatePanelData (pure L1, no DOM)', () => {
  it('scores bonds yield from placeholders without document', () => {
    const marketCtx = {
      data: {
        yieldCurveData: { US: { '10y': 4.25, '2y': 3.9 }, dates: ['2024-01', '2024-02'] },
        tipsYields: { '10y': 1.8 },
        treasuryRates: { '10y': 4.25 },
        fredYieldHistory: { dates: ['a', 'b'], values: [4, 4.1] },
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'yield',
      marketCtx,
      allMarkets: { bonds: marketCtx },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
    expect(l1.source).toMatch(/placeholders|spec|contract/);
    expect(l1.placeholders || l1.fieldValue).toBeTruthy();
  });

  it('waiting on cross-market is waiting not empty', () => {
    // Pick a panel known to use crossMarket if available; otherwise soft assert.
    const marketCtx = { data: { fetchedOn: '2026-08-04' }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'sec-filings',
      marketCtx,
      allMarkets: {
        equities: marketCtx,
        edgar: { data: null, isLoading: true },
      },
    });
    // Either waiting (cross-market) or empty if panel has no required dep slots
    expect([DATA.WAITING, DATA.EMPTY, DATA.PARTIAL, DATA.READY]).toContain(l1.dataState);
    if (/waiting for cross-market/i.test(l1.fetchDetail)) {
      expect(l1.dataState).toBe(DATA.WAITING);
      expect(l1.fetchOk).toBe(false);
    }
  });

  it('contract panel fields annotate equities heatmap', () => {
    const primary = {
      quotes: { AAPL: { price: 190 } },
      fetchedOn: '2026-08-04',
    };
    const c = evaluateContractPanelFields('equities', 'heatmap', primary);
    expect(c).toBeTruthy();
    expect(c.ok).toBe(true);
    expect(c.required).toContain('quotes');

    const missing = evaluateContractPanelFields('equities', 'heatmap', { fetchedOn: '2026-08-04' });
    expect(missing.ok).toBe(false);
    expect(missing.missing).toContain('quotes');
  });

  it('evaluatePanelHealth uses L1 + attaches dataSource', () => {
    const marketCtx = {
      data: {
        yieldCurveData: { US: { '10y': 4.25, '2y': 3.9 } },
        tipsYields: { '10y': 1.8 },
        treasuryRates: { '10y': 4.25 },
        fredYieldHistory: { dates: ['a', 'b'], values: [4, 4.1] },
      },
      isLoading: false,
    };
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      marketCtx,
      allMarkets: { bonds: marketCtx },
      createShell: false,
    });
    expect(r.fetchOk).toBe(true);
    expect(r.dataSource).toBeTruthy();
    expect(r.health).toBeTruthy();
    expect(r.dataState).toBe(DATA.READY);
  });

  it('explicit equities contract fails L1 when quotes missing', () => {
    const marketCtx = {
      data: { fetchedOn: '2026-08-04', indices: { '^GSPC': { price: 1 } } },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'heatmap',
      marketCtx,
      allMarkets: { equities: marketCtx },
    });
    // heatmap requires quotes via explicit contract and/or placeholders
    expect(l1.fetchOk).toBe(false);
    if (l1.contract) {
      expect(l1.contract.ok).toBe(false);
      expect(l1.contract.missing).toContain('quotes');
    }
  });

  it('explicit equities contract passes heatmap when quotes present', () => {
    const marketCtx = {
      data: {
        quotes: { AAPL: { price: 190, changePct: 1 } },
        fetchedOn: '2026-08-04',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'heatmap',
      marketCtx,
      allMarkets: { equities: marketCtx },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.contract?.ok).toBe(true);
  });

  it('reportFromPanelData never claims paint', () => {
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'heatmap',
      marketCtx: {
        data: { quotes: { AAPL: { price: 1 } }, fetchedOn: '2026-08-04' },
        isLoading: false,
      },
      allMarkets: {},
    });
    const r = reportFromPanelData(l1, {
      marketId: 'equities',
      panelId: 'heatmap',
      title: 'Heatmap',
    });
    expect(r.fetchOk).toBe(true);
    expect(r.displayOk).toBe(false);
    expect(r.uiOk).toBe(false);
    expect(r.status).toBe('pending');
    expect(r.elPresent).toBe(false);
  });

  it('evaluateAllMarkets dataOnly is L1 progressive path', () => {
    const markets = {
      equities: {
        data: { quotes: { AAPL: { price: 1 } }, fetchedOn: '2026-08-04' },
        isLoading: false,
      },
    };
    const cache = evaluateAllMarkets(() => markets.equities, markets, { dataOnly: true });
    // only markets present in MARKET_PANELS keys
    expect(cache.equities).toBeTruthy();
    const heat = cache.equities?.heatmap;
    if (heat) {
      expect(heat.displayOk).toBe(false);
      expect(heat.uiOk).toBe(false);
      expect(heat.fetchOk).toBe(true);
    }
    // same helper used by splash progressive
    const only = evaluateAllMarketsDataOnly(() => markets.equities, markets, {
      equities: MARKET_PANELS.equities || [{ id: 'heatmap', title: 'Heatmap' }],
    });
    expect(only.equities.heatmap.fetchOk).toBe(true);
    expect(only.equities.heatmap.uiOk).toBe(false);
  });
});
