import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:co2
 * Body prefers ctx.__render('co2') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['co2'], ctx.__subtitle['co2'], ctx.__disabled['co2']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('co2', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel eia:co2] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CO₂ Emissions by Sector (US) — awaiting data"}
      reason={"eia:co2"}
    />
  );
}

export default definePanel({
  key: "eia:co2",
  panelId: "co2",
  markets: ["eia"],
  title: "CO₂ Emissions by Sector (US)",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/co2.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['co2'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['co2']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['co2']),
  Body,
});
