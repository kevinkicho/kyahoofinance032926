import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:materials-grid
 * Body prefers ctx.__render('materials-grid') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['materials-grid'], ctx.__subtitle['materials-grid'], ctx.__disabled['materials-grid']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('materials-grid', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:materials-grid] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Strategic Materials Grid — awaiting data"}
      reason={"commodities:materials-grid"}
    />
  );
}

export default definePanel({
  key: "commodities:materials-grid",
  panelId: "materials-grid",
  markets: ["commodities"],
  title: "Strategic Materials Grid",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/materials-grid.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['materials-grid'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['materials-grid']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['materials-grid']),
  Body,
});
