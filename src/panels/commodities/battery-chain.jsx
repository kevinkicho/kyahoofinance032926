import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:battery-chain
 * Body prefers ctx.__render('battery-chain') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['battery-chain'], ctx.__subtitle['battery-chain'], ctx.__disabled['battery-chain']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('battery-chain', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:battery-chain] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Battery Supply Chain — awaiting data"}
      reason={"commodities:battery-chain"}
    />
  );
}

export default definePanel({
  key: "commodities:battery-chain",
  panelId: "battery-chain",
  markets: ["commodities"],
  title: "Battery Supply Chain",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/battery-chain.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['battery-chain'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['battery-chain']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['battery-chain']),
  Body,
});
