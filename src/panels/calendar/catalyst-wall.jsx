import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:catalyst-wall
 * Body prefers ctx.__render('catalyst-wall') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['catalyst-wall'], ctx.__subtitle['catalyst-wall'], ctx.__disabled['catalyst-wall']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('catalyst-wall', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:catalyst-wall] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Market Catalyst Wall — awaiting data"}
      reason={"calendar:catalyst-wall"}
    />
  );
}

export default definePanel({
  key: "calendar:catalyst-wall",
  panelId: "catalyst-wall",
  markets: ["calendar"],
  title: "Market Catalyst Wall",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/catalyst-wall.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['catalyst-wall'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['catalyst-wall']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['catalyst-wall']),
  Body,
});
