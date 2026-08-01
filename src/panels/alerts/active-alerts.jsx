import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: alerts:active-alerts
 * Body prefers ctx.__render('active-alerts') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['active-alerts'], ctx.__subtitle['active-alerts'], ctx.__disabled['active-alerts']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('active-alerts', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel alerts:active-alerts] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Active Alerts — awaiting data"}
      reason={"alerts:active-alerts"}
    />
  );
}

export default definePanel({
  key: "alerts:active-alerts",
  panelId: "active-alerts",
  markets: ["alerts"],
  title: "Active Alerts",
  source: 'Market data',
  className: "alerts-bento-card",
  contentClassName: "alerts-panel-content",
  modulePath: "src/panels/alerts/active-alerts.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['active-alerts'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['active-alerts']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['active-alerts']),
  Body,
});
