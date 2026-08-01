import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:curvespreads
 * Body prefers ctx.__render('curvespreads') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['curvespreads'], ctx.__subtitle['curvespreads'], ctx.__disabled['curvespreads']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('curvespreads', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:curvespreads] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Curve Spreads — awaiting data"}
      reason={"bonds:curvespreads"}
    />
  );
}

export default definePanel({
  key: "bonds:curvespreads",
  panelId: "curvespreads",
  markets: ["bonds"],
  title: "Curve Spreads",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/curvespreads.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['curvespreads'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['curvespreads']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['curvespreads']),
  Body,
});
