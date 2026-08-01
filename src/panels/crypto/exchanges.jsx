import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:exchanges
 * Body prefers ctx.__render('exchanges') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['exchanges'], ctx.__subtitle['exchanges'], ctx.__disabled['exchanges']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('exchanges', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:exchanges] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Top Exchanges — awaiting data"}
      reason={"crypto:exchanges"}
    />
  );
}

export default definePanel({
  key: "crypto:exchanges",
  panelId: "exchanges",
  markets: ["crypto"],
  title: "Top Exchanges",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/exchanges.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['exchanges'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['exchanges']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['exchanges']),
  Body,
});
