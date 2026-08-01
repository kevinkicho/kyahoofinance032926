import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:bank-sector
 * Body prefers ctx.__render('bank-sector') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bank-sector'], ctx.__subtitle['bank-sector'], ctx.__disabled['bank-sector']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bank-sector', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:bank-sector] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"US Banking Sector (FDIC) — awaiting data"}
      reason={"credit:bank-sector"}
    />
  );
}

export default definePanel({
  key: "credit:bank-sector",
  panelId: "bank-sector",
  markets: ["credit"],
  title: "US Banking Sector (FDIC)",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/bank-sector.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bank-sector'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bank-sector']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bank-sector']),
  Body,
});
