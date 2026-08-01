import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:exposure-matrix
 * Body prefers ctx.__render('exposure-matrix') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['exposure-matrix'], ctx.__subtitle['exposure-matrix'], ctx.__disabled['exposure-matrix']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('exposure-matrix', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:exposure-matrix] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Material-to-Sector Exposure Matrix — awaiting data"}
      reason={"commodities:exposure-matrix"}
    />
  );
}

export default definePanel({
  key: "commodities:exposure-matrix",
  panelId: "exposure-matrix",
  markets: ["commodities"],
  title: "Material-to-Sector Exposure Matrix",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/exposure-matrix.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['exposure-matrix'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['exposure-matrix']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['exposure-matrix']),
  Body,
});
