import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:census-trade
 * Body prefers ctx.__render('census-trade') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['census-trade'], ctx.__subtitle['census-trade'], ctx.__disabled['census-trade']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('census-trade', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:census-trade] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Census Trade KPI — awaiting data"}
      reason={"realEstate:census-trade"}
    />
  );
}

export default definePanel({
  key: "realEstate:census-trade",
  panelId: "census-trade",
  markets: ["realEstate"],
  title: "Census Trade KPI",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/census-trade.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['census-trade'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['census-trade']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['census-trade']),
  Body,
});
