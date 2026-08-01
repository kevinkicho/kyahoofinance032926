import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:routes
 * Body prefers ctx.__render('routes') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['routes'], ctx.__subtitle['routes'], ctx.__disabled['routes']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('routes', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:routes] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Express Routes — awaiting data"}
      reason={"analytics:routes"}
    />
  );
}

export default definePanel({
  key: "analytics:routes",
  panelId: "routes",
  markets: ["analytics"],
  title: "Express Routes",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/routes.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['routes'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['routes']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['routes']),
  Body,
});
