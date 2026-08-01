import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:onchain
 * Body prefers ctx.__render('onchain') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['onchain'], ctx.__subtitle['onchain'], ctx.__disabled['onchain']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('onchain', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:onchain] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"On-Chain Metrics — awaiting data"}
      reason={"crypto:onchain"}
    />
  );
}

export default definePanel({
  key: "crypto:onchain",
  panelId: "onchain",
  markets: ["crypto"],
  title: "On-Chain Metrics",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/onchain.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['onchain'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['onchain']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['onchain']),
  Body,
});
