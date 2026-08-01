import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:reitetf
 * Body prefers ctx.__render('reitetf') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['reitetf'], ctx.__subtitle['reitetf'], ctx.__disabled['reitetf']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('reitetf', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:reitetf] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"REIT ETF (VNQ) — awaiting data"}
      reason={"realEstate:reitetf"}
    />
  );
}

export default definePanel({
  key: "realEstate:reitetf",
  panelId: "reitetf",
  markets: ["realEstate"],
  title: "REIT ETF (VNQ)",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/reitetf.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['reitetf'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['reitetf']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['reitetf']),
  Body,
});
