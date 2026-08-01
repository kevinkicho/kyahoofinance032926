import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:cb-rates
 * Body prefers ctx.__render('cb-rates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cb-rates'], ctx.__subtitle['cb-rates'], ctx.__disabled['cb-rates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cb-rates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:cb-rates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Central Bank Rates — awaiting data"}
      reason={"calendar:cb-rates"}
    />
  );
}

export default definePanel({
  key: "calendar:cb-rates",
  panelId: "cb-rates",
  markets: ["calendar"],
  title: "Central Bank Rates",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/cb-rates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cb-rates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cb-rates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cb-rates']),
  Body,
});
