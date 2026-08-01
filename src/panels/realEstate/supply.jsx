import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:supply
 * Body prefers ctx.__render('supply') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['supply'], ctx.__subtitle['supply'], ctx.__disabled['supply']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('supply', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:supply] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Supply & Demand — awaiting data"}
      reason={"realEstate:supply"}
    />
  );
}

export default definePanel({
  key: "realEstate:supply",
  panelId: "supply",
  markets: ["realEstate"],
  title: "Supply & Demand",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/supply.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['supply'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['supply']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['supply']),
  Body,
});
