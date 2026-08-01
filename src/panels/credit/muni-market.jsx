import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:muni-market
 * Body prefers ctx.__render('muni-market') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['muni-market'], ctx.__subtitle['muni-market'], ctx.__disabled['muni-market']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('muni-market', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:muni-market] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"US Municipal Bond Market (MSRB) — awaiting data"}
      reason={"credit:muni-market"}
    />
  );
}

export default definePanel({
  key: "credit:muni-market",
  panelId: "muni-market",
  markets: ["credit"],
  title: "US Municipal Bond Market (MSRB)",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/muni-market.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['muni-market'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['muni-market']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['muni-market']),
  Body,
});
