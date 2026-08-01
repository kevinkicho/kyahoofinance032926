import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:freshness
 * Body prefers ctx.__render('freshness') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['freshness'], ctx.__subtitle['freshness'], ctx.__disabled['freshness']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('freshness', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:freshness] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Data Freshness — awaiting data"}
      reason={"analytics:freshness"}
    />
  );
}

export default definePanel({
  key: "analytics:freshness",
  panelId: "freshness",
  markets: ["analytics"],
  title: "Data Freshness",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/freshness.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['freshness'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['freshness']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['freshness']),
  Body,
});
