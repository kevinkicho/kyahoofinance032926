import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: calendar:key-data
 * Body prefers ctx.__render('key-data') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['key-data'], ctx.__subtitle['key-data'], ctx.__disabled['key-data']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('key-data', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel calendar:key-data] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Key US Releases — awaiting data"}
      reason={"calendar:key-data"}
    />
  );
}

export default definePanel({
  key: "calendar:key-data",
  panelId: "key-data",
  markets: ["calendar"],
  title: "Key US Releases",
  source: 'Market data',
  className: "cal-bento-card",
  contentClassName: "cal-panel-scroll",
  modulePath: "src/panels/calendar/key-data.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['key-data'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['key-data']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['key-data']),
  Body,
});
