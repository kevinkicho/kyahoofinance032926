import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:vix1y
 * Body prefers ctx.__render('vix1y') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['vix1y'], ctx.__subtitle['vix1y'], ctx.__disabled['vix1y']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('vix1y', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:vix1y] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"VIX — 1 Year — awaiting data"}
      reason={"derivatives:vix1y"}
    />
  );
}

export default definePanel({
  key: "derivatives:vix1y",
  panelId: "vix1y",
  markets: ["derivatives"],
  title: "VIX — 1 Year",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/vix1y.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['vix1y'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['vix1y']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['vix1y']),
  Body,
});
