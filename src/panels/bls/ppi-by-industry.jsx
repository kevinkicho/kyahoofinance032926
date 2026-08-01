import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:ppi-by-industry
 * Body prefers ctx.__render('ppi-by-industry') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ppi-by-industry'], ctx.__subtitle['ppi-by-industry'], ctx.__disabled['ppi-by-industry']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ppi-by-industry', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:ppi-by-industry] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"PPI by Industry — awaiting data"}
      reason={"bls:ppi-by-industry"}
    />
  );
}

export default definePanel({
  key: "bls:ppi-by-industry",
  panelId: "ppi-by-industry",
  markets: ["bls"],
  title: "PPI by Industry",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/ppi-by-industry.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ppi-by-industry'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ppi-by-industry']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ppi-by-industry']),
  Body,
});
