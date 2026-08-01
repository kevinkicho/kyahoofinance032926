import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:metrics
 * Body prefers ctx.__render('metrics') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['metrics'], ctx.__subtitle['metrics'], ctx.__disabled['metrics']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('metrics', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:metrics] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Spread Monitor — awaiting data"}
      reason={"bonds:metrics"}
    />
  );
}

export default definePanel({
  key: "bonds:metrics",
  panelId: "metrics",
  markets: ["bonds"],
  title: "Spread Monitor",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/metrics.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['metrics'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['metrics']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['metrics']),
  Body,
});
