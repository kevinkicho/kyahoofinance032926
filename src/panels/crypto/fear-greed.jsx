import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:fear-greed
 * Body prefers ctx.__render('fear-greed') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fear-greed'], ctx.__subtitle['fear-greed'], ctx.__disabled['fear-greed']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fear-greed', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:fear-greed] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Fear & Greed Index — awaiting data"}
      reason={"crypto:fear-greed"}
    />
  );
}

export default definePanel({
  key: "crypto:fear-greed",
  panelId: "fear-greed",
  markets: ["crypto"],
  title: "Fear & Greed Index",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/fear-greed.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fear-greed'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fear-greed']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fear-greed']),
  Body,
});
