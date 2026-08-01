import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:coverage-matrix
 * Body prefers ctx.__render('coverage-matrix') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['coverage-matrix'], ctx.__subtitle['coverage-matrix'], ctx.__disabled['coverage-matrix']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('coverage-matrix', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:coverage-matrix] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Endpoint Coverage Matrix — awaiting data"}
      reason={"analytics:coverage-matrix"}
    />
  );
}

export default definePanel({
  key: "analytics:coverage-matrix",
  panelId: "coverage-matrix",
  markets: ["analytics"],
  title: "Endpoint Coverage Matrix",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/coverage-matrix.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['coverage-matrix'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['coverage-matrix']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['coverage-matrix']),
  Body,
});
