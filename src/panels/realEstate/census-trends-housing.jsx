import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:census-trends-housing
 * Body prefers ctx.__render('census-trends-housing') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['census-trends-housing'], ctx.__subtitle['census-trends-housing'], ctx.__disabled['census-trends-housing']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('census-trends-housing', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:census-trends-housing] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Census Housing Trends — awaiting data"}
      reason={"realEstate:census-trends-housing"}
    />
  );
}

export default definePanel({
  key: "realEstate:census-trends-housing",
  panelId: "census-trends-housing",
  markets: ["realEstate"],
  title: "Census Housing Trends",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/census-trends-housing.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['census-trends-housing'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['census-trends-housing']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['census-trends-housing']),
  Body,
});
