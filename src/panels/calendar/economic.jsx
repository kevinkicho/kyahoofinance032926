import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:economic
 * Body prefers ctx.__render('economic') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['economic'], ctx.__subtitle['economic'], ctx.__disabled['economic']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('economic', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:economic] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Economic Calendar — awaiting data"}
      reason={"calendar:economic"}
    />
  );
}

export default definePanel({
  key: "calendar:economic",
  panelId: "economic",
  markets: ["calendar"],
  title: "Economic Calendar",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/economic.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['economic'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['economic']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['economic']),
  Body,
});
