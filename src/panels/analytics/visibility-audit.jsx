import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:visibility-audit
 * Body prefers ctx.__render('visibility-audit') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['visibility-audit'], ctx.__subtitle['visibility-audit'], ctx.__disabled['visibility-audit']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('visibility-audit', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:visibility-audit] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Panel Visibility Audit — awaiting data"}
      reason={"analytics:visibility-audit"}
    />
  );
}

export default definePanel({
  key: "analytics:visibility-audit",
  panelId: "visibility-audit",
  markets: ["analytics"],
  title: "Panel Visibility Audit",
  source: 'Internal Diagnostics / RTDB',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/visibility-audit.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['visibility-audit'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['visibility-audit']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['visibility-audit']),
  Body,
});
