/**
 * Regression: MarketPanelGrid composition mounts catalog panels with stable keys.
 * Empty shells / missing registry caused "no panels" after extraction.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('react-grid-layout', () => ({
  useContainerWidth: () => ({ width: 1200, mounted: true, containerRef: { current: null }, measureWidth: () => {} }),
  Responsive: ({ children }) => <div data-testid="rgl">{children}</div>,
  ResponsiveGridLayout: ({ children }) => <div data-testid="rgl">{children}</div>,
}));
vi.mock('react-grid-layout/legacy', () => ({
  Responsive: ({ children }) => <div data-testid="rgl">{children}</div>,
}));

import MarketPanelGrid from '../../panels/MarketPanelGrid';
import { listPanelsForMarket } from '../../panels/registry';
import { MARKET_PANELS } from '../../data/marketPanels';

const BONDS_LAYOUT = {
  lg: (MARKET_PANELS.bonds || []).map((p, i) => ({
    i: p.id,
    x: (i % 3) * 4,
    y: Math.floor(i / 3) * 3,
    w: 4,
    h: 3,
  })),
};

describe('MarketPanelGrid composition', () => {
  it('registers at least as many bonds panels as MARKET_PANELS', () => {
    expect(listPanelsForMarket('bonds').length).toBeGreaterThanOrEqual(MARKET_PANELS.bonds.length);
  });

  it('mounts a data-panel-key for every bonds catalog panel', () => {
    const { container } = render(
      <MarketPanelGrid
        marketId="bonds"
        layout={BONDS_LAYOUT}
        storageKey="test-bonds-grid"
        accent="bonds"
        ctx={{
          bonds: {
            yieldCurveData: { US: { '10y': 4.5 } },
          },
          __render: (id) => <div data-testid={`body-${id}`}>body-{id}</div>,
          __live: Object.fromEntries((MARKET_PANELS.bonds || []).map((p) => [p.id, true])),
        }}
        provenance={{ timestamp: '2026-07-31', isCurrent: true }}
      />,
    );

    for (const p of MARKET_PANELS.bonds) {
      const el = container.querySelector(`[data-panel-key="${p.id}"]`);
      expect(el, `missing data-panel-key=${p.id}`).toBeTruthy();
    }
  });

  it('does not leave only empty shells when bridge panel uses __render', () => {
    // kpi is a scaffold bridge module (uses ctx.__render); yield is hand-written.
    const { container } = render(
      <MarketPanelGrid
        marketId="bonds"
        layout={{ lg: [{ i: 'kpi', x: 0, y: 0, w: 12, h: 2 }] }}
        storageKey="test-kpi-only"
        accent="bonds"
        ctx={{
          __render: (id) => (id === 'kpi' ? <div className="probe-body">kpis</div> : null),
          __live: { kpi: true },
        }}
        only={['kpi']}
      />,
    );
    expect(container.querySelector('[data-panel-key="kpi"]')).toBeTruthy();
    expect(container.querySelector('.probe-body')?.textContent).toBe('kpis');
    expect(container.querySelectorAll('.bento-grid-slot--empty').length).toBe(0);
  });
});
