import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:universe-updates
 * Body prefers ctx.__render('universe-updates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['universe-updates'], ctx.__subtitle['universe-updates'], ctx.__disabled['universe-updates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('universe-updates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:universe-updates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Universe Expansion Queue — awaiting data"}
      reason={"equities:universe-updates"}
    />
  );
}

export default definePanel({
  key: "equities:universe-updates",
  panelId: "universe-updates",
  markets: ["equities"],
  title: "Universe Expansion Queue",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content eq-panel-scroll",
  modulePath: "src/panels/equities/universe-updates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['universe-updates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['universe-updates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['universe-updates']),
  Body,
});
