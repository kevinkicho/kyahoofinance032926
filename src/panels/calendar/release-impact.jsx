import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:release-impact
 * Body prefers ctx.__render('release-impact') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['release-impact'], ctx.__subtitle['release-impact'], ctx.__disabled['release-impact']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('release-impact', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:release-impact] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Release Impact Tracker — awaiting data"}
      reason={"calendar:release-impact"}
    />
  );
}

export default definePanel({
  key: "calendar:release-impact",
  panelId: "release-impact",
  markets: ["calendar"],
  title: "Release Impact Tracker",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/release-impact.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['release-impact'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['release-impact']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['release-impact']),
  Body,
});
