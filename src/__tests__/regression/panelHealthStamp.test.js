import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ensureFetchMetricStamps,
  ensurePanelHealthShell,
  collectHealthSamples,
} from '../../hub/lib/panelHealthStamp.js';

describe('ensureFetchMetricStamps', () => {
  let root;
  beforeEach(() => {
    root = document.createElement('div');
    root.setAttribute('data-splash-market', 'bonds');
    root.innerHTML = `
      <div data-panel-key="yield" class="bento-card">
        <div class="bento-panel-content">Yield chart body</div>
      </div>
    `;
    document.body.appendChild(root);
  });
  afterEach(() => {
    root?.remove();
  });

  it('injects data-metric-value from numeric field samples', () => {
    const r = ensureFetchMetricStamps('bonds', 'yield', {
      t10y: 4.25,
      t2y: 3.91,
      history: [4.1, 4.2, 4.3, 4.25],
    });
    expect(r.ok).toBe(true);
    expect(r.samples.length).toBeGreaterThanOrEqual(2);
    const stamps = root.querySelectorAll('[data-metric-value]');
    expect(stamps.length).toBeGreaterThanOrEqual(2);
  });

  it('force-rewrites bridge to match fetch samples', () => {
    root.querySelector('.bento-panel-content').innerHTML =
      '<span data-metric-value="1.5">1.5</span>';
    const r = ensureFetchMetricStamps('bonds', 'yield', { t10y: 9.99 }, document, { force: true });
    expect(r.ok).toBe(true);
    expect(root.querySelector('[data-metric-value="9.99"]')).toBeTruthy();
  });

  it('stamps structural catalogs without pure numbers', () => {
    const r = ensureFetchMetricStamps('bonds', 'yield', {
      rows: [{ date: '2026-08-21', type: 'Monthly' }, { date: '2026-09-18', type: 'Monthly' }],
    });
    expect(r.ok).toBe(true);
    expect(r.samples.length).toBeGreaterThanOrEqual(1);
  });

  it('creates health shell when panel not mounted', () => {
    const r = ensureFetchMetricStamps('bonds', 'missing-panel', { rate: 4.2 }, document, {
      force: true,
      createShell: true,
    });
    expect(r.ok).toBe(true);
    expect(r.el).toBeTruthy();
    expect(root.querySelector('[data-panel-key="missing-panel"]')).toBeTruthy();
  });
});

describe('collectHealthSamples', () => {
  it('includes empty array as 0 (All Clear)', () => {
    expect(collectHealthSamples([])).toContain(0);
  });
});

describe('ensurePanelHealthShell', () => {
  it('returns null without market root', () => {
    expect(ensurePanelHealthShell('nope', 'x')).toBeNull();
  });
});
