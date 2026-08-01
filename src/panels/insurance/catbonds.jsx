import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:catbonds
 * Body prefers ctx.__render('catbonds') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['catbonds'], ctx.__subtitle['catbonds'], ctx.__disabled['catbonds']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('catbonds', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:catbonds] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cat Bond Spreads — awaiting data"}
      reason={"insurance:catbonds"}
    />
  );
}

export default definePanel({
  key: "insurance:catbonds",
  panelId: "catbonds",
  markets: ["insurance"],
  title: "Cat Bond Spreads",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/catbonds.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['catbonds'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['catbonds']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['catbonds']),
  Body,
});
