import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:btc-onchain
 * Body prefers ctx.__render('btc-onchain') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['btc-onchain'], ctx.__subtitle['btc-onchain'], ctx.__disabled['btc-onchain']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('btc-onchain', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:btc-onchain] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BTC On-Chain Activity — awaiting data"}
      reason={"crypto:btc-onchain"}
    />
  );
}

export default definePanel({
  key: "crypto:btc-onchain",
  panelId: "btc-onchain",
  markets: ["crypto"],
  title: "BTC On-Chain Activity",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/btc-onchain.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['btc-onchain'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['btc-onchain']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['btc-onchain']),
  Body,
});
