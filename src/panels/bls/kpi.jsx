import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:kpi
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
      console.warn('[panel bls:kpi] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Key Labor Market Indicators — awaiting data"}
      reason={"bls:kpi"}
    />
  );
}

export default definePanel({
  key: "bls:kpi",
  panelId: "kpi",
  markets: ["bls"],
  title: "Key Labor Market Indicators",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/kpi.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['kpi'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['kpi']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['kpi']),
  Body,
});
