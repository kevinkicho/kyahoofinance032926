import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:key-metrics
 * Body prefers ctx.__render('key-metrics') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['key-metrics'], ctx.__subtitle['key-metrics'], ctx.__disabled['key-metrics']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('key-metrics', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:key-metrics] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Key Metrics — awaiting data"}
      reason={"credit:key-metrics"}
    />
  );
}

export default definePanel({
  key: "credit:key-metrics",
  panelId: "key-metrics",
  markets: ["credit"],
  title: "Key Metrics",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/key-metrics.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['key-metrics'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['key-metrics']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['key-metrics']),
  Body,
});
