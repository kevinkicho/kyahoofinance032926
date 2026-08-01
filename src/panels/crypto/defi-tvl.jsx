import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:defi-tvl
 * Body prefers ctx.__render('defi-tvl') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['defi-tvl'], ctx.__subtitle['defi-tvl'], ctx.__disabled['defi-tvl']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('defi-tvl', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:defi-tvl] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"DeFi TVL by Chain — awaiting data"}
      reason={"crypto:defi-tvl"}
    />
  );
}

export default definePanel({
  key: "crypto:defi-tvl",
  panelId: "defi-tvl",
  markets: ["crypto"],
  title: "DeFi TVL by Chain",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/defi-tvl.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['defi-tvl'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['defi-tvl']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['defi-tvl']),
  Body,
});
