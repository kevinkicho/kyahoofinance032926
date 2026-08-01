import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:sec-filings
 * Body prefers ctx.__render('sec-filings') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['sec-filings'], ctx.__subtitle['sec-filings'], ctx.__disabled['sec-filings']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('sec-filings', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:sec-filings] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"SEC Filing Activity — awaiting data"}
      reason={"equities:sec-filings"}
    />
  );
}

export default definePanel({
  key: "equities:sec-filings",
  panelId: "sec-filings",
  markets: ["equities"],
  title: "SEC Filing Activity",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content",
  modulePath: "src/panels/equities/sec-filings.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sec-filings'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sec-filings']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sec-filings']),
  Body,
});
