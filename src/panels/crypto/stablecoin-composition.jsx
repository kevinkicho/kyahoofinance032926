import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:stablecoin-composition
 * Body prefers ctx.__render('stablecoin-composition') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['stablecoin-composition'], ctx.__subtitle['stablecoin-composition'], ctx.__disabled['stablecoin-composition']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('stablecoin-composition', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:stablecoin-composition] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Stablecoin Composition — awaiting data"}
      reason={"crypto:stablecoin-composition"}
    />
  );
}

export default definePanel({
  key: "crypto:stablecoin-composition",
  panelId: "stablecoin-composition",
  markets: ["crypto"],
  title: "Stablecoin Composition",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/stablecoin-composition.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['stablecoin-composition'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['stablecoin-composition']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['stablecoin-composition']),
  Body,
});
