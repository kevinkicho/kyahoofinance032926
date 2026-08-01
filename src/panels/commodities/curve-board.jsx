import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:curve-board
 * Body prefers ctx.__render('curve-board') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['curve-board'], ctx.__subtitle['curve-board'], ctx.__disabled['curve-board']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('curve-board', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:curve-board] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Curve Structure Board — awaiting data"}
      reason={"commodities:curve-board"}
    />
  );
}

export default definePanel({
  key: "commodities:curve-board",
  panelId: "curve-board",
  markets: ["commodities"],
  title: "Curve Structure Board",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/curve-board.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['curve-board'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['curve-board']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['curve-board']),
  Body,
});
