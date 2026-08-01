import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:sector
 * Body prefers ctx.__render('sector') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['sector'], ctx.__subtitle['sector'], ctx.__disabled['sector']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('sector', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:sector] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Sector Performance — awaiting data"}
      reason={"commodities:sector"}
    />
  );
}

export default definePanel({
  key: "commodities:sector",
  panelId: "sector",
  markets: ["commodities"],
  title: "Sector Performance",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/sector.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sector'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sector']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sector']),
  Body,
});
