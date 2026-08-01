import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:futures
 * Body prefers ctx.__render('futures') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['futures'], ctx.__subtitle['futures'], ctx.__disabled['futures']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('futures', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:futures] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Futures Curve — awaiting data"}
      reason={"commodities:futures"}
    />
  );
}

export default definePanel({
  key: "commodities:futures",
  panelId: "futures",
  markets: ["commodities"],
  title: "Futures Curve",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/futures.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['futures'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['futures']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['futures']),
  Body,
});
