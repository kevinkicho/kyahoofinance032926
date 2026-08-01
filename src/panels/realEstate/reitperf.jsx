import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:reitperf
 * Body prefers ctx.__render('reitperf') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['reitperf'], ctx.__subtitle['reitperf'], ctx.__disabled['reitperf']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('reitperf', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:reitperf] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"REIT Performance — awaiting data"}
      reason={"realEstate:reitperf"}
    />
  );
}

export default definePanel({
  key: "realEstate:reitperf",
  panelId: "reitperf",
  markets: ["realEstate"],
  title: "REIT Performance",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/reitperf.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['reitperf'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['reitperf']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['reitperf']),
  Body,
});
