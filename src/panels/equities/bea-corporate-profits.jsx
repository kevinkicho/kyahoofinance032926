import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:bea-corporate-profits
 * Body prefers ctx.__render('bea-corporate-profits') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bea-corporate-profits'], ctx.__subtitle['bea-corporate-profits'], ctx.__disabled['bea-corporate-profits']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bea-corporate-profits', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:bea-corporate-profits] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BEA Corporate Profits — awaiting data"}
      reason={"equities:bea-corporate-profits"}
    />
  );
}

export default definePanel({
  key: "equities:bea-corporate-profits",
  panelId: "bea-corporate-profits",
  markets: ["equities"],
  title: "BEA Corporate Profits",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content",
  modulePath: "src/panels/equities/bea-corporate-profits.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bea-corporate-profits'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bea-corporate-profits']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bea-corporate-profits']),
  Body,
});
