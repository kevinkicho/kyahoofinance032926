import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: watchlist:my-tickers
 * Body prefers ctx.__render('my-tickers') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['my-tickers'], ctx.__subtitle['my-tickers'], ctx.__disabled['my-tickers']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('my-tickers', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel watchlist:my-tickers] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"My Tickers — awaiting data"}
      reason={"watchlist:my-tickers"}
    />
  );
}

export default definePanel({
  key: "watchlist:my-tickers",
  panelId: "my-tickers",
  markets: ["watchlist"],
  title: "My Tickers",
  source: 'Market data',
  className: "watch-bento-card",
  contentClassName: "watch-panel-scroll",
  modulePath: "src/panels/watchlist/my-tickers.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['my-tickers'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['my-tickers']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['my-tickers']),
  Body,
});
