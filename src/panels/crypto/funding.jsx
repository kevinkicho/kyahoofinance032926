import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: crypto:funding
 * Body prefers ctx.__render('funding') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['funding'], ctx.__subtitle['funding'], ctx.__disabled['funding']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('funding', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel crypto:funding] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Funding Rates — awaiting data"}
      reason={"crypto:funding"}
    />
  );
}

export default definePanel({
  key: "crypto:funding",
  panelId: "funding",
  markets: ["crypto"],
  title: "Funding Rates",
  source: 'Market data',
  className: "crypto-bento-card",
  contentClassName: "crypto-panel-content",
  modulePath: "src/panels/crypto/funding.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['funding'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['funding']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['funding']),
  Body,
});
