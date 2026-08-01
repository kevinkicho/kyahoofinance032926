import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:source-health
 * Body prefers ctx.__render('source-health') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['source-health'], ctx.__subtitle['source-health'], ctx.__disabled['source-health']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('source-health', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:source-health] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Data Source Health — awaiting data"}
      reason={"analytics:source-health"}
    />
  );
}

export default definePanel({
  key: "analytics:source-health",
  panelId: "source-health",
  markets: ["analytics"],
  title: "Data Source Health",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/source-health.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['source-health'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['source-health']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['source-health']),
  Body,
});
