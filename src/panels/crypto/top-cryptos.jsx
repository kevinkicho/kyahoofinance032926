import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:top-cryptos
 * Body prefers ctx.__render('top-cryptos') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['top-cryptos'], ctx.__subtitle['top-cryptos'], ctx.__disabled['top-cryptos']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('top-cryptos', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:top-cryptos] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Top Cryptos — awaiting data"}
      reason={"crypto:top-cryptos"}
    />
  );
}

export default definePanel({
  key: "crypto:top-cryptos",
  panelId: "top-cryptos",
  markets: ["crypto"],
  title: "Top Cryptos",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/top-cryptos.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['top-cryptos'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['top-cryptos']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['top-cryptos']),
  Body,
});
