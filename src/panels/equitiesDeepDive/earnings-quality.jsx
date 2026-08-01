import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:earnings-quality
 * Body prefers ctx.__render('earnings-quality') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['earnings-quality'], ctx.__subtitle['earnings-quality'], ctx.__disabled['earnings-quality']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('earnings-quality', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:earnings-quality] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Earnings Quality & Revision Monitor — awaiting data"}
      reason={"equitiesDeepDive:earnings-quality"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:earnings-quality",
  panelId: "earnings-quality",
  markets: ["equitiesDeepDive"],
  title: "Earnings Quality & Revision Monitor",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/earnings-quality.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['earnings-quality'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['earnings-quality']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['earnings-quality']),
  Body,
});
