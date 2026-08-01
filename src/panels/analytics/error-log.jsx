import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:error-log
 * Body prefers ctx.__render('error-log') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['error-log'], ctx.__subtitle['error-log'], ctx.__disabled['error-log']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('error-log', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:error-log] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Error Log — awaiting data"}
      reason={"analytics:error-log"}
    />
  );
}

export default definePanel({
  key: "analytics:error-log",
  panelId: "error-log",
  markets: ["analytics"],
  title: "Error Log",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/error-log.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['error-log'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['error-log']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['error-log']),
  Body,
});
