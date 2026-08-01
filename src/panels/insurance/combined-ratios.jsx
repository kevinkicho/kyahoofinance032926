import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:combined-ratios
 * Body prefers ctx.__render('combined-ratios') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['combined-ratios'], ctx.__subtitle['combined-ratios'], ctx.__disabled['combined-ratios']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('combined-ratios', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:combined-ratios] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Insurer Combined Ratios (EDGAR) — awaiting data"}
      reason={"insurance:combined-ratios"}
    />
  );
}

export default definePanel({
  key: "insurance:combined-ratios",
  panelId: "combined-ratios",
  markets: ["insurance"],
  title: "Insurer Combined Ratios (EDGAR)",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/combined-ratios.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['combined-ratios'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['combined-ratios']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['combined-ratios']),
  Body,
});
