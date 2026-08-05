import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { stampVisiblePaintedMetrics } from '../../hub/lib/panelHealthStamp.js';
import { classifyPanelDisplay } from '../../hub/lib/panelHealthEval.js';

describe('stampVisiblePaintedMetrics', () => {
  let root;
  beforeEach(() => {
    root = document.createElement('div');
    root.setAttribute('data-panel-key', 'kpi');
    root.className = 'bento-card';
    document.body.appendChild(root);
  });
  afterEach(() => root?.remove());

  it('stamps already-painted numbers without MetricValue wrappers', () => {
    root.innerHTML = `
      <div class="bento-panel-content">
        <div class="kpi-row"><span class="kpi-value">$1,234.50</span></div>
        <div class="kpi-row"><span class="kpi-value">3.25%</span></div>
        <div class="kpi-row"><strong>89.1</strong></div>
        <table><tr><td>12.4</td><td>55.0</td></tr></table>
      </div>
    `;
    const r = stampVisiblePaintedMetrics(root);
    expect(r.stamped).toBeGreaterThanOrEqual(3);
    const stamps = root.querySelectorAll('[data-metric-value]');
    expect(stamps.length).toBeGreaterThanOrEqual(3);
    expect([...stamps].every((n) => n.getAttribute('data-metric-display') === '1')).toBe(true);

    const display = classifyPanelDisplay(root, { fetchOk: true });
    expect(display.ok).toBe(true);
  });

  it('does not stamp health shells', () => {
    root.setAttribute('data-health-shell', '1');
    root.innerHTML = `<div class="bento-panel-content"><span>42.0</span></div>`;
    expect(stampVisiblePaintedMetrics(root).stamped).toBe(0);
  });

  it('ignores bridge-only stamps and still stamps real body', () => {
    root.innerHTML = `
      <div class="bento-panel-content">
        <span data-health-bridge="1"><span data-metric-value="999">999</span></span>
        <table><tr><td class="price">456.78</td></tr></table>
      </div>
    `;
    const r = stampVisiblePaintedMetrics(root);
    expect(r.stamped).toBeGreaterThanOrEqual(1);
    const painted = root.querySelector('td.price');
    expect(painted.getAttribute('data-metric-value')).toBe('456.78');
  });
});
