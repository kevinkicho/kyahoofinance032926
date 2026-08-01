import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: alerts:alert-rules
 * Body prefers ctx.__render('alert-rules') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['alert-rules'], ctx.__subtitle['alert-rules'], ctx.__disabled['alert-rules']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('alert-rules', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel alerts:alert-rules] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Alert Rules — awaiting data"}
      reason={"alerts:alert-rules"}
    />
  );
}

export default definePanel({
  key: "alerts:alert-rules",
  panelId: "alert-rules",
  markets: ["alerts"],
  title: "Alert Rules",
  source: 'Market data',
  className: "alerts-bento-card",
  contentClassName: "alerts-panel-content",
  modulePath: "src/panels/alerts/alert-rules.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['alert-rules'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['alert-rules']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['alert-rules']),
  Body,
});
