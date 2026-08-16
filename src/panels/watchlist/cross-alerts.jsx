import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: watchlist:cross-alerts
 * Body prefers ctx.__render('cross-alerts') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cross-alerts'], ctx.__subtitle['cross-alerts'], ctx.__disabled['cross-alerts']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cross-alerts', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel watchlist:cross-alerts] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cross-Market Alert Board — awaiting data"}
      reason={"watchlist:cross-alerts"}
    />
  );
}

export default definePanel({
  key: "watchlist:cross-alerts",
  panelId: "cross-alerts",
  markets: ["watchlist"],
  title: "Cross-Market Alert Board",
  source: 'Internal cross-market snapshots',
  className: "watch-bento-card",
  contentClassName: "watch-panel-scroll",
  modulePath: "src/panels/watchlist/cross-alerts.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cross-alerts'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cross-alerts']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cross-alerts']),
  Body,
});
