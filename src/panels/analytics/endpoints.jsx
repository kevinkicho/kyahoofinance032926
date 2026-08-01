import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:endpoints
 * Body prefers ctx.__render('endpoints') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['endpoints'], ctx.__subtitle['endpoints'], ctx.__disabled['endpoints']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('endpoints', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:endpoints] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Endpoint Metrics — awaiting data"}
      reason={"analytics:endpoints"}
    />
  );
}

export default definePanel({
  key: "analytics:endpoints",
  panelId: "endpoints",
  markets: ["analytics"],
  title: "Endpoint Metrics",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/endpoints.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['endpoints'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['endpoints']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['endpoints']),
  Body,
});
