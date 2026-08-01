import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:wti-brent
 * Body prefers ctx.__render('wti-brent') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wti-brent'], ctx.__subtitle['wti-brent'], ctx.__disabled['wti-brent']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wti-brent', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:wti-brent] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"WTI vs Brent Spread — awaiting data"}
      reason={"commodities:wti-brent"}
    />
  );
}

export default definePanel({
  key: "commodities:wti-brent",
  panelId: "wti-brent",
  markets: ["commodities"],
  title: "WTI vs Brent Spread",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/wti-brent.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wti-brent'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wti-brent']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wti-brent']),
  Body,
});
