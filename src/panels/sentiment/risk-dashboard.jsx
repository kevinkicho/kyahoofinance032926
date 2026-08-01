import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:risk-dashboard
 * Body prefers ctx.__render('risk-dashboard') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['risk-dashboard'], ctx.__subtitle['risk-dashboard'], ctx.__disabled['risk-dashboard']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('risk-dashboard', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:risk-dashboard] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Risk Dashboard — awaiting data"}
      reason={"sentiment:risk-dashboard"}
    />
  );
}

export default definePanel({
  key: "sentiment:risk-dashboard",
  panelId: "risk-dashboard",
  markets: ["sentiment"],
  title: "Risk Dashboard",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/risk-dashboard.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['risk-dashboard'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['risk-dashboard']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['risk-dashboard']),
  Body,
});
