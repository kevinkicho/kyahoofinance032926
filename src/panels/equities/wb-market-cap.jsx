import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:wb-market-cap
 * Body prefers ctx.__render('wb-market-cap') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wb-market-cap'], ctx.__subtitle['wb-market-cap'], ctx.__disabled['wb-market-cap']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wb-market-cap', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:wb-market-cap] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"World Bank Market Cap — awaiting data"}
      reason={"equities:wb-market-cap"}
    />
  );
}

export default definePanel({
  key: "equities:wb-market-cap",
  panelId: "wb-market-cap",
  markets: ["equities"],
  title: "World Bank Market Cap",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content",
  modulePath: "src/panels/equities/wb-market-cap.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wb-market-cap'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wb-market-cap']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wb-market-cap']),
  Body,
});
