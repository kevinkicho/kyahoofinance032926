import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:prices
 * Body prefers ctx.__render('prices') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['prices'], ctx.__subtitle['prices'], ctx.__disabled['prices']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('prices', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:prices] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Commodity Prices — awaiting data"}
      reason={"commodities:prices"}
    />
  );
}

export default definePanel({
  key: "commodities:prices",
  panelId: "prices",
  markets: ["commodities"],
  title: "Commodity Prices",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/prices.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['prices'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['prices']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['prices']),
  Body,
});
