import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:heatmap
 * Body prefers ctx.__render('heatmap') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['heatmap'], ctx.__subtitle['heatmap'], ctx.__disabled['heatmap']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('heatmap', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:heatmap] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Equity Heatmap — awaiting data"}
      reason={"equities:heatmap"}
    />
  );
}

export default definePanel({
  key: "equities:heatmap",
  panelId: "heatmap",
  markets: ["equities"],
  title: "Equity Heatmap",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content",
  modulePath: "src/panels/equities/heatmap.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['heatmap'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['heatmap']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['heatmap']),
  Body,
});
