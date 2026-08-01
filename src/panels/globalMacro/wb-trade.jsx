import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:wb-trade
 * Body prefers ctx.__render('wb-trade') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wb-trade'], ctx.__subtitle['wb-trade'], ctx.__disabled['wb-trade']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wb-trade', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:wb-trade] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"World Bank Trade Openness — awaiting data"}
      reason={"globalMacro:wb-trade"}
    />
  );
}

export default definePanel({
  key: "globalMacro:wb-trade",
  panelId: "wb-trade",
  markets: ["globalMacro"],
  title: "World Bank Trade Openness",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/wb-trade.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wb-trade'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wb-trade']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wb-trade']),
  Body,
});
