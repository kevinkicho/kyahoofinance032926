import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:trends
 * Body prefers ctx.__render('trends') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['trends'], ctx.__subtitle['trends'], ctx.__disabled['trends']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('trends', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel eia:trends] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Price Trends (3-Year Monthly) — awaiting data"}
      reason={"eia:trends"}
    />
  );
}

export default definePanel({
  key: "eia:trends",
  panelId: "trends",
  markets: ["eia"],
  title: "Price Trends (3-Year Monthly)",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/trends.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['trends'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['trends']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['trends']),
  Body,
});
