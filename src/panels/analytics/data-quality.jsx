import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:data-quality
 * Body prefers ctx.__render('data-quality') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['data-quality'], ctx.__subtitle['data-quality'], ctx.__disabled['data-quality']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('data-quality', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:data-quality] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Data Quality Score — awaiting data"}
      reason={"analytics:data-quality"}
    />
  );
}

export default definePanel({
  key: "analytics:data-quality",
  panelId: "data-quality",
  markets: ["analytics"],
  title: "Data Quality Score",
  source: 'Internal Diagnostics / RTDB',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/data-quality.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['data-quality'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['data-quality']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['data-quality']),
  Body,
});
