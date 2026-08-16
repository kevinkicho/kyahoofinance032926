import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:us-trade
 * Body prefers ctx.__render('us-trade') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['us-trade'], ctx.__subtitle['us-trade'], ctx.__disabled['us-trade']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('us-trade', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:us-trade] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"US Trade Balance — awaiting data"}
      reason={"commodities:us-trade"}
    />
  );
}

export default definePanel({
  key: "commodities:us-trade",
  panelId: "us-trade",
  markets: ["commodities"],
  title: "US Trade Balance",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/us-trade.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['us-trade'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['us-trade']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['us-trade']),
  Body,
});