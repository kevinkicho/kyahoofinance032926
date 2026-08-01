import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:census-trends-trade
 * Body prefers ctx.__render('census-trends-trade') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['census-trends-trade'], ctx.__subtitle['census-trends-trade'], ctx.__disabled['census-trends-trade']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('census-trends-trade', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:census-trends-trade] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Census Trade Trends — awaiting data"}
      reason={"realEstate:census-trends-trade"}
    />
  );
}

export default definePanel({
  key: "realEstate:census-trends-trade",
  panelId: "census-trends-trade",
  markets: ["realEstate"],
  title: "Census Trade Trends",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/census-trends-trade.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['census-trends-trade'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['census-trends-trade']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['census-trends-trade']),
  Body,
});
