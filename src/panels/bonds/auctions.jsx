import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:auctions
 * Body prefers ctx.__render('auctions') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['auctions'], ctx.__subtitle['auctions'], ctx.__disabled['auctions']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('auctions', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:auctions] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Treasury Auctions — awaiting data"}
      reason={"bonds:auctions"}
    />
  );
}

export default definePanel({
  key: "bonds:auctions",
  panelId: "auctions",
  markets: ["bonds"],
  title: "Treasury Auctions",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/auctions.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['auctions'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['auctions']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['auctions']),
  Body,
});
