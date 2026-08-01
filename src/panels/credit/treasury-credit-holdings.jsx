import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:treasury-credit-holdings
 * Body prefers ctx.__render('treasury-credit-holdings') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['treasury-credit-holdings'], ctx.__subtitle['treasury-credit-holdings'], ctx.__disabled['treasury-credit-holdings']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('treasury-credit-holdings', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:treasury-credit-holdings] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Treasury Credit Holdings — awaiting data"}
      reason={"credit:treasury-credit-holdings"}
    />
  );
}

export default definePanel({
  key: "credit:treasury-credit-holdings",
  panelId: "treasury-credit-holdings",
  markets: ["credit"],
  title: "Treasury Credit Holdings",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/treasury-credit-holdings.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['treasury-credit-holdings'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['treasury-credit-holdings']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['treasury-credit-holdings']),
  Body,
});
