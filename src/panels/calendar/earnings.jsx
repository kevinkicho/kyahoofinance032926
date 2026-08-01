import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:earnings
 * Body prefers ctx.__render('earnings') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['earnings'], ctx.__subtitle['earnings'], ctx.__disabled['earnings']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('earnings', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:earnings] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Earnings Season — awaiting data"}
      reason={"calendar:earnings"}
    />
  );
}

export default definePanel({
  key: "calendar:earnings",
  panelId: "earnings",
  markets: ["calendar"],
  title: "Earnings Season",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/earnings.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['earnings'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['earnings']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['earnings']),
  Body,
});
