import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:energy-stack
 * Body prefers ctx.__render('energy-stack') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['energy-stack'], ctx.__subtitle['energy-stack'], ctx.__disabled['energy-stack']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('energy-stack', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:energy-stack] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Energy Stack — awaiting data"}
      reason={"commodities:energy-stack"}
    />
  );
}

export default definePanel({
  key: "commodities:energy-stack",
  panelId: "energy-stack",
  markets: ["commodities"],
  title: "Energy Stack",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/energy-stack.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['energy-stack'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['energy-stack']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['energy-stack']),
  Body,
});
