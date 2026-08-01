import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:wb-debt
 * Body prefers ctx.__render('wb-debt') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wb-debt'], ctx.__subtitle['wb-debt'], ctx.__disabled['wb-debt']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wb-debt', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:wb-debt] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"World Bank Debt Statistics — awaiting data"}
      reason={"credit:wb-debt"}
    />
  );
}

export default definePanel({
  key: "credit:wb-debt",
  panelId: "wb-debt",
  markets: ["credit"],
  title: "World Bank Debt Statistics",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/wb-debt.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wb-debt'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wb-debt']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wb-debt']),
  Body,
});
