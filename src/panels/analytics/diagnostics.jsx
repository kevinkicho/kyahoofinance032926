import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:diagnostics
 * Body prefers ctx.__render('diagnostics') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['diagnostics'], ctx.__subtitle['diagnostics'], ctx.__disabled['diagnostics']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('diagnostics', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:diagnostics] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"API Health Diagnostics — awaiting data"}
      reason={"analytics:diagnostics"}
    />
  );
}

export default definePanel({
  key: "analytics:diagnostics",
  panelId: "diagnostics",
  markets: ["analytics"],
  title: "API Health Diagnostics",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/diagnostics.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['diagnostics'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['diagnostics']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['diagnostics']),
  Body,
});
