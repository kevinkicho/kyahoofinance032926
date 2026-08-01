import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:bis-property-prices
 * Body prefers ctx.__render('bis-property-prices') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bis-property-prices'], ctx.__subtitle['bis-property-prices'], ctx.__disabled['bis-property-prices']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bis-property-prices', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:bis-property-prices] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BIS Property Price Comparison — awaiting data"}
      reason={"realEstate:bis-property-prices"}
    />
  );
}

export default definePanel({
  key: "realEstate:bis-property-prices",
  panelId: "bis-property-prices",
  markets: ["realEstate"],
  title: "BIS Property Price Comparison",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/bis-property-prices.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bis-property-prices'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bis-property-prices']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bis-property-prices']),
  Body,
});
