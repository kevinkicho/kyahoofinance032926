import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:census-housing
 * Body prefers ctx.__render('census-housing') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['census-housing'], ctx.__subtitle['census-housing'], ctx.__disabled['census-housing']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('census-housing', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:census-housing] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Census Housing KPI — awaiting data"}
      reason={"realEstate:census-housing"}
    />
  );
}

export default definePanel({
  key: "realEstate:census-housing",
  panelId: "census-housing",
  markets: ["realEstate"],
  title: "Census Housing KPI",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/census-housing.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['census-housing'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['census-housing']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['census-housing']),
  Body,
});
