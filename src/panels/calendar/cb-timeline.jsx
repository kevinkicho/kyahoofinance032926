import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:cb-timeline
 * Body prefers ctx.__render('cb-timeline') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cb-timeline'], ctx.__subtitle['cb-timeline'], ctx.__disabled['cb-timeline']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cb-timeline', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:cb-timeline] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Upcoming Meetings — awaiting data"}
      reason={"calendar:cb-timeline"}
    />
  );
}

export default definePanel({
  key: "calendar:cb-timeline",
  panelId: "cb-timeline",
  markets: ["calendar"],
  title: "Upcoming Meetings",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/cb-timeline.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cb-timeline'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cb-timeline']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cb-timeline']),
  Body,
});
