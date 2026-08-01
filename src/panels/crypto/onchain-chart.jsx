import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:onchain-chart
 * Body prefers ctx.__render('onchain-chart') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['onchain-chart'], ctx.__subtitle['onchain-chart'], ctx.__disabled['onchain-chart']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('onchain-chart', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:onchain-chart] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BTC Hashrate (30d) — awaiting data"}
      reason={"crypto:onchain-chart"}
    />
  );
}

export default definePanel({
  key: "crypto:onchain-chart",
  panelId: "onchain-chart",
  markets: ["crypto"],
  title: "BTC Hashrate (30d)",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/onchain-chart.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['onchain-chart'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['onchain-chart']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['onchain-chart']),
  Body,
});
