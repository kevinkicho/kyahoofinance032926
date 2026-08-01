import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:trends-top
 * Body prefers ctx.__render('trends-top') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['trends-top'], ctx.__subtitle['trends-top'], ctx.__disabled['trends-top']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('trends-top', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:trends-top] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Trends (3-Year) — Top — awaiting data"}
      reason={"bls:trends-top"}
    />
  );
}

export default definePanel({
  key: "bls:trends-top",
  panelId: "trends-top",
  markets: ["bls"],
  title: "Trends (3-Year) — Top",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/trends-top.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['trends-top'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['trends-top']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['trends-top']),
  Body,
});
