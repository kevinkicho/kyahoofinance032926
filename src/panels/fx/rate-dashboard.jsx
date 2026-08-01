import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:rate-dashboard
 * Body prefers ctx.__render('rate-dashboard') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['rate-dashboard'], ctx.__subtitle['rate-dashboard'], ctx.__disabled['rate-dashboard']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('rate-dashboard', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:rate-dashboard] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Rate Dashboard — awaiting data"}
      reason={"fx:rate-dashboard"}
    />
  );
}

export default definePanel({
  key: "fx:rate-dashboard",
  panelId: "rate-dashboard",
  markets: ["fx"],
  title: "Rate Dashboard",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/rate-dashboard.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['rate-dashboard'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['rate-dashboard']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['rate-dashboard']),
  Body,
});
