import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:prices
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
      console.warn('[panel eia:prices] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"US Electricity Retail Prices — awaiting data"}
      reason={"eia:prices"}
    />
  );
}

export default definePanel({
  key: "eia:prices",
  panelId: "prices",
  markets: ["eia"],
  title: "US Electricity Retail Prices",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/prices.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['prices'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['prices']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['prices']),
  Body,
});
