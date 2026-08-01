import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:delinquency
 * Body prefers ctx.__render('delinquency') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['delinquency'], ctx.__subtitle['delinquency'], ctx.__disabled['delinquency']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('delinquency', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:delinquency] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Delinquency Rates — awaiting data"}
      reason={"credit:delinquency"}
    />
  );
}

export default definePanel({
  key: "credit:delinquency",
  panelId: "delinquency",
  markets: ["credit"],
  title: "Delinquency Rates",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/delinquency.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['delinquency'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['delinquency']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['delinquency']),
  Body,
});
