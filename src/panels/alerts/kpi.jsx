import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: alerts:kpi
 * Body prefers ctx.__render('kpi') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['kpi'], ctx.__subtitle['kpi'], ctx.__disabled['kpi']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('kpi', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel alerts:kpi] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Alert Status — awaiting data"}
      reason={"alerts:kpi"}
    />
  );
}

export default definePanel({
  key: "alerts:kpi",
  panelId: "kpi",
  markets: ["alerts"],
  title: "Alert Status",
  source: 'Market data',
  className: "alerts-bento-card",
  contentClassName: "alerts-panel-content",
  modulePath: "src/panels/alerts/kpi.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['kpi'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['kpi']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['kpi']),
  Body,
});
