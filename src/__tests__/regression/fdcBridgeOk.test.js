/**
 * When fetchOk, health bridge must make display+confirm ok (path to 100% F/D/C).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evaluatePanelHealth } from '../../hub/lib/panelHealthEval.js';

describe('F/D/C bridge completeness', () => {
  let root;
  beforeEach(() => {
    root = document.createElement('div');
    root.setAttribute('data-splash-market', 'bonds');
    root.innerHTML = `
      <div data-panel-key="yield" class="bento-card">
        <div class="bento-panel-content"><span>Yield</span></div>
      </div>
    `;
    document.body.appendChild(root);
  });
  afterEach(() => root?.remove());

  it('marks ok when market has yield payload (even without MetricValue UI)', () => {
    const marketCtx = {
      data: {
        yieldCurveData: { US: { '10y': 4.25, '2y': 3.9 }, dates: ['2024-01', '2024-02'] },
        tipsYields: { '10y': 1.8 },
        treasuryRates: { '10y': 4.25 },
        fredYieldHistory: { dates: ['a', 'b'], values: [4, 4.1] },
      },
      isLoading: false,
      isLive: true,
    };
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      panelTitle: 'Yield',
      marketCtx,
      allMarkets: { bonds: marketCtx },
      createShell: true, // operator/verify path
    });
    expect(r.fetchOk).toBe(true);
    expect(r.displayOk).toBe(true);
    expect(r.confirmOk).toBe(true);
    expect(r.status).toBe('ok');
    // Without MetricValue UI, operational ok may be bridge-only — product KPI separates this.
    expect(r.bridgeOnly === true || r.healthQuality === 'bridge' || r.uiOk === true).toBe(true);
  });

  it('creates shell and passes D/C for panel not in DOM when fetch is ok (operator)', () => {
    // Remove the only panel node so evaluate must create a health shell.
    root.querySelector('[data-panel-key="yield"]')?.remove();
    const marketCtx = {
      data: {
        yieldCurveData: { US: { '10y': 4.25, '2y': 3.9, '3m': 5.1, '30y': 4.4 } },
        tipsYields: { '10y': 1.8 },
        treasuryRates: { '10y': 4.25, fedFunds: 5.25 },
        fredYieldHistory: { dates: ['a', 'b'], values: [4, 4.1] },
      },
      isLoading: false,
    };
    const r = evaluatePanelHealth({
      marketId: 'bonds',
      panelId: 'yield',
      marketCtx,
      allMarkets: { bonds: marketCtx },
      createShell: true,
    });
    expect(r.fetchOk).toBe(true);
    expect(r.displayOk).toBe(true);
    expect(r.confirmOk).toBe(true);
    expect(r.status).toBe('ok');
    expect(document.querySelector('[data-panel-key="yield"][data-health-shell="1"]')).toBeTruthy();
    expect(r.bridgeOnly).toBe(true);
    expect(r.uiOk).toBe(false);
    expect(r.healthQuality).toBe('bridge');
  });

  it('consumer mode does not create health shells for missing panels', () => {
    root.querySelector('[data-panel-key="yield"]')?.remove();
    // purge any leftover shells
    document.querySelectorAll('[data-health-shell="1"]').forEach((n) => n.remove());
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
    expect(r.displayOk).toBe(false);
    expect(r.status).toBe('pending');
    expect(r.uiOk).toBe(false);
    expect(document.querySelector('[data-panel-key="yield"][data-health-shell="1"]')).toBeFalsy();
  });
});


