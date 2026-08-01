import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:api-usage
 * Body prefers ctx.__render('api-usage') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['api-usage'], ctx.__subtitle['api-usage'], ctx.__disabled['api-usage']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('api-usage', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:api-usage] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"API Usage — awaiting data"}
      reason={"analytics:api-usage"}
    />
  );
}

export default definePanel({
  key: "analytics:api-usage",
  panelId: "api-usage",
  markets: ["analytics"],
  title: "API Usage",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/api-usage.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['api-usage'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['api-usage']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['api-usage']),
  Body,
});
