import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:credit-spreads
 * Body prefers ctx.__render('credit-spreads') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['credit-spreads'], ctx.__subtitle['credit-spreads'], ctx.__disabled['credit-spreads']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('credit-spreads', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:credit-spreads] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Credit Spreads — awaiting data"}
      reason={"credit:credit-spreads"}
    />
  );
}

export default definePanel({
  key: "credit:credit-spreads",
  panelId: "credit-spreads",
  markets: ["credit"],
  title: "Credit Spreads",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/credit-spreads.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['credit-spreads'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['credit-spreads']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['credit-spreads']),
  Body,
});
