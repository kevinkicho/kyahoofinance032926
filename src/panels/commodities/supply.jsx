import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:supply
 * Body prefers ctx.__render('supply') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['supply'], ctx.__subtitle['supply'], ctx.__disabled['supply']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('supply', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:supply] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Supply & Demand — awaiting data"}
      reason={"commodities:supply"}
    />
  );
}

export default definePanel({
  key: "commodities:supply",
  panelId: "supply",
  markets: ["commodities"],
  title: "Supply & Demand",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/supply.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['supply'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['supply']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['supply']),
  Body,
});
