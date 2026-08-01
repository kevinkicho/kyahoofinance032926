import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: watchlist:my-metrics
 * Body prefers ctx.__render('my-metrics') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['my-metrics'], ctx.__subtitle['my-metrics'], ctx.__disabled['my-metrics']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('my-metrics', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel watchlist:my-metrics] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"My Metrics — awaiting data"}
      reason={"watchlist:my-metrics"}
    />
  );
}

export default definePanel({
  key: "watchlist:my-metrics",
  panelId: "my-metrics",
  markets: ["watchlist"],
  title: "My Metrics",
  source: 'Market data',
  className: "watch-bento-card",
  contentClassName: "watch-panel-scroll",
  modulePath: "src/panels/watchlist/my-metrics.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['my-metrics'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['my-metrics']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['my-metrics']),
  Body,
});
