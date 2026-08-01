import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:usda-ag
 * Body prefers ctx.__render('usda-ag') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['usda-ag'], ctx.__subtitle['usda-ag'], ctx.__disabled['usda-ag']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('usda-ag', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:usda-ag] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"US Ag Commodity Prices — awaiting data"}
      reason={"commodities:usda-ag"}
    />
  );
}

export default definePanel({
  key: "commodities:usda-ag",
  panelId: "usda-ag",
  markets: ["commodities"],
  title: "US Ag Commodity Prices",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/usda-ag.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['usda-ag'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['usda-ag']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['usda-ag']),
  Body,
});
