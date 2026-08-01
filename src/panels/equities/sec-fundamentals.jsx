import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equities:sec-fundamentals
 * Body prefers ctx.__render('sec-fundamentals') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['sec-fundamentals'], ctx.__subtitle['sec-fundamentals'], ctx.__disabled['sec-fundamentals']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('sec-fundamentals', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equities:sec-fundamentals] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"SEC Fundamentals — awaiting data"}
      reason={"equities:sec-fundamentals"}
    />
  );
}

export default definePanel({
  key: "equities:sec-fundamentals",
  panelId: "sec-fundamentals",
  markets: ["equities"],
  title: "SEC Fundamentals",
  source: 'Market data',
  className: "eq-bento-card",
  contentClassName: "eq-panel-content",
  modulePath: "src/panels/equities/sec-fundamentals.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sec-fundamentals'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sec-fundamentals']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sec-fundamentals']),
  Body,
});
