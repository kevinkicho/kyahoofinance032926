import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:metrics
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
      console.warn('[panel realEstate:metrics] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Key Metrics — awaiting data"}
      reason={"realEstate:metrics"}
    />
  );
}

export default definePanel({
  key: "realEstate:metrics",
  panelId: "metrics",
  markets: ["realEstate"],
  title: "Key Metrics",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/metrics.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['metrics'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['metrics']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['metrics']),
  Body,
});
