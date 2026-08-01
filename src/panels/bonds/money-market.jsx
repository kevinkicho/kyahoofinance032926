import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:money-market
 * Body prefers ctx.__render('money-market') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['money-market'], ctx.__subtitle['money-market'], ctx.__disabled['money-market']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('money-market', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:money-market] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Money Market — awaiting data"}
      reason={"bonds:money-market"}
    />
  );
}

export default definePanel({
  key: "bonds:money-market",
  panelId: "money-market",
  markets: ["bonds"],
  title: "Money Market",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/money-market.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['money-market'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['money-market']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['money-market']),
  Body,
});
