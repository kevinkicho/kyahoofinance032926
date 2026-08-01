import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:bank-stress
 * Body prefers ctx.__render('bank-stress') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bank-stress'], ctx.__subtitle['bank-stress'], ctx.__disabled['bank-stress']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bank-stress', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:bank-stress] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Bank Stress Monitor — awaiting data"}
      reason={"credit:bank-stress"}
    />
  );
}

export default definePanel({
  key: "credit:bank-stress",
  panelId: "bank-stress",
  markets: ["credit"],
  title: "Bank Stress Monitor",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/bank-stress.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bank-stress'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bank-stress']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bank-stress']),
  Body,
});
