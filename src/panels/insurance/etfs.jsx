import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:etfs
 * Body prefers ctx.__render('etfs') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['etfs'], ctx.__subtitle['etfs'], ctx.__disabled['etfs']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('etfs', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:etfs] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Sector / Industry Pulse — awaiting data"}
      reason={"insurance:etfs"}
    />
  );
}

export default definePanel({
  key: "insurance:etfs",
  panelId: "etfs",
  markets: ["insurance"],
  title: "Sector / Industry Pulse",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/etfs.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['etfs'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['etfs']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['etfs']),
  Body,
});
