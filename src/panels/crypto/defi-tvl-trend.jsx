import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:defi-tvl-trend
 * Body prefers ctx.__render('defi-tvl-trend') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['defi-tvl-trend'], ctx.__subtitle['defi-tvl-trend'], ctx.__disabled['defi-tvl-trend']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('defi-tvl-trend', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:defi-tvl-trend] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"DeFi TVL Trend — awaiting data"}
      reason={"crypto:defi-tvl-trend"}
    />
  );
}

export default definePanel({
  key: "crypto:defi-tvl-trend",
  panelId: "defi-tvl-trend",
  markets: ["crypto"],
  title: "DeFi TVL Trend",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/defi-tvl-trend.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['defi-tvl-trend'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['defi-tvl-trend']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['defi-tvl-trend']),
  Body,
});
