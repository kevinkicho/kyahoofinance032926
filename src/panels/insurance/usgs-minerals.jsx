import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:usgs-minerals
 * Body prefers ctx.__render('usgs-minerals') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['usgs-minerals'], ctx.__subtitle['usgs-minerals'], ctx.__disabled['usgs-minerals']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('usgs-minerals', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:usgs-minerals] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"USGS Earthquake Activity (30d) — awaiting data"}
      reason={"insurance:usgs-minerals"}
    />
  );
}

export default definePanel({
  key: "insurance:usgs-minerals",
  panelId: "usgs-minerals",
  markets: ["insurance"],
  title: "USGS Earthquake Activity (30d)",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/usgs-minerals.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['usgs-minerals'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['usgs-minerals']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['usgs-minerals']),
  Body,
});
