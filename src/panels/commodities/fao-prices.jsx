import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:fao-prices
 * Body prefers ctx.__render('fao-prices') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fao-prices'], ctx.__subtitle['fao-prices'], ctx.__disabled['fao-prices']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fao-prices', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:fao-prices] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"FAO Food Price Index — awaiting data"}
      reason={"commodities:fao-prices"}
    />
  );
}

export default definePanel({
  key: "commodities:fao-prices",
  panelId: "fao-prices",
  markets: ["commodities"],
  title: "FAO Food Price Index",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/fao-prices.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fao-prices'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fao-prices']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fao-prices']),
  Body,
});
