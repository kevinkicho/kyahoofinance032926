import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:panel-trace
 * Body prefers ctx.__render('panel-trace') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['panel-trace'], ctx.__subtitle['panel-trace'], ctx.__disabled['panel-trace']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('panel-trace', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:panel-trace] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Panel Trace Inspector — awaiting data"}
      reason={"analytics:panel-trace"}
    />
  );
}

export default definePanel({
  key: "analytics:panel-trace",
  panelId: "panel-trace",
  markets: ["analytics"],
  title: "Panel Trace Inspector",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/panel-trace.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['panel-trace'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['panel-trace']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['panel-trace']),
  Body,
});
