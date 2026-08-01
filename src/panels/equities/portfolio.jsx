import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:portfolio
 * Body prefers ctx.__render('portfolio') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['portfolio'], ctx.__subtitle['portfolio'], ctx.__disabled['portfolio']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('portfolio', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:portfolio] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Portfolio Tracker — awaiting data"}
      reason={"equities:portfolio"}
    />
  );
}

export default definePanel({
  key: "equities:portfolio",
  panelId: "portfolio",
  markets: ["equities"],
  title: "Portfolio Tracker",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content pf-tracker-host",
  modulePath: "src/panels/equities/portfolio.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['portfolio'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['portfolio']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['portfolio']),
  Body,
});
