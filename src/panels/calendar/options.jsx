import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:options
 * Body prefers ctx.__render('options') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['options'], ctx.__subtitle['options'], ctx.__disabled['options']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('options', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:options] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Options Expiry — awaiting data"}
      reason={"calendar:options"}
    />
  );
}

export default definePanel({
  key: "calendar:options",
  panelId: "options",
  markets: ["calendar"],
  title: "Options Expiry",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/options.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['options'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['options']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['options']),
  Body,
});
