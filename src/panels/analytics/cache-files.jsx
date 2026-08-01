import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:cache-files
 * Body prefers ctx.__render('cache-files') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cache-files'], ctx.__subtitle['cache-files'], ctx.__disabled['cache-files']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cache-files', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:cache-files] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"File Cache — awaiting data"}
      reason={"analytics:cache-files"}
    />
  );
}

export default definePanel({
  key: "analytics:cache-files",
  panelId: "cache-files",
  markets: ["analytics"],
  title: "File Cache",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/cache-files.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cache-files'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cache-files']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cache-files']),
  Body,
});
