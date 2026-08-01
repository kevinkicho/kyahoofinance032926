import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:treasury
 * Body prefers ctx.__render('treasury') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['treasury'], ctx.__subtitle['treasury'], ctx.__disabled['treasury']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('treasury', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:treasury] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Treasury Auctions — awaiting data"}
      reason={"calendar:treasury"}
    />
  );
}

export default definePanel({
  key: "calendar:treasury",
  panelId: "treasury",
  markets: ["calendar"],
  title: "Treasury Auctions",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/treasury.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['treasury'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['treasury']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['treasury']),
  Body,
});
