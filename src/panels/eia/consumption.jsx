import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:consumption
 * Body prefers ctx.__render('consumption') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['consumption'], ctx.__subtitle['consumption'], ctx.__disabled['consumption']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('consumption', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel eia:consumption] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Electricity Consumption — awaiting data"}
      reason={"eia:consumption"}
    />
  );
}

export default definePanel({
  key: "eia:consumption",
  panelId: "consumption",
  markets: ["eia"],
  title: "Electricity Consumption",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/consumption.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['consumption'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['consumption']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['consumption']),
  Body,
});
