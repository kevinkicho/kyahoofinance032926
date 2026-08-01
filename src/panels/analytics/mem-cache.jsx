import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:mem-cache
 * Body prefers ctx.__render('mem-cache') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['mem-cache'], ctx.__subtitle['mem-cache'], ctx.__disabled['mem-cache']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('mem-cache', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:mem-cache] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Memory Cache — awaiting data"}
      reason={"analytics:mem-cache"}
    />
  );
}

export default definePanel({
  key: "analytics:mem-cache",
  panelId: "mem-cache",
  markets: ["analytics"],
  title: "Memory Cache",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/mem-cache.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['mem-cache'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['mem-cache']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['mem-cache']),
  Body,
});
