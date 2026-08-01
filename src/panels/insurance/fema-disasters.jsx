import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:fema-disasters
 * Body prefers ctx.__render('fema-disasters') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fema-disasters'], ctx.__subtitle['fema-disasters'], ctx.__disabled['fema-disasters']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fema-disasters', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:fema-disasters] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"FEMA Disaster Declarations — awaiting data"}
      reason={"insurance:fema-disasters"}
    />
  );
}

export default definePanel({
  key: "insurance:fema-disasters",
  panelId: "fema-disasters",
  markets: ["insurance"],
  title: "FEMA Disaster Declarations",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/fema-disasters.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fema-disasters'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fema-disasters']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fema-disasters']),
  Body,
});
