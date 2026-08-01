import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:regime
 * Body prefers ctx.__render('regime') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['regime'], ctx.__subtitle['regime'], ctx.__disabled['regime']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('regime', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:regime] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Commodity Regime Dashboard — awaiting data"}
      reason={"commodities:regime"}
    />
  );
}

export default definePanel({
  key: "commodities:regime",
  panelId: "regime",
  markets: ["commodities"],
  title: "Commodity Regime Dashboard",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/regime.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['regime'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['regime']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['regime']),
  Body,
});
