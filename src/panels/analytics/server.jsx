import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:server
 * Body prefers ctx.__render('server') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['server'], ctx.__subtitle['server'], ctx.__disabled['server']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('server', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:server] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Server Info — awaiting data"}
      reason={"analytics:server"}
    />
  );
}

export default definePanel({
  key: "analytics:server",
  panelId: "server",
  markets: ["analytics"],
  title: "Server Info",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/server.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['server'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['server']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['server']),
  Body,
});
