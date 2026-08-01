import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:material-detail
 * Body prefers ctx.__render('material-detail') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['material-detail'], ctx.__subtitle['material-detail'], ctx.__disabled['material-detail']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('material-detail', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:material-detail] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Strategic Material Detail — awaiting data"}
      reason={"commodities:material-detail"}
    />
  );
}

export default definePanel({
  key: "commodities:material-detail",
  panelId: "material-detail",
  markets: ["commodities"],
  title: "Strategic Material Detail",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/material-detail.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['material-detail'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['material-detail']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['material-detail']),
  Body,
});
