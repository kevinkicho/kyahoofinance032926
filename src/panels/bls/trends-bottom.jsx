import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:trends-bottom
 * Body prefers ctx.__render('trends-bottom') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['trends-bottom'], ctx.__subtitle['trends-bottom'], ctx.__disabled['trends-bottom']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('trends-bottom', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:trends-bottom] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Trends (3-Year) — Bottom — awaiting data"}
      reason={"bls:trends-bottom"}
    />
  );
}

export default definePanel({
  key: "bls:trends-bottom",
  panelId: "trends-bottom",
  markets: ["bls"],
  title: "Trends (3-Year) — Bottom",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/trends-bottom.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['trends-bottom'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['trends-bottom']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['trends-bottom']),
  Body,
});
