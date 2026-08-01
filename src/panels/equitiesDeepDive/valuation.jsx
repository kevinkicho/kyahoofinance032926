import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:valuation
 * Body prefers ctx.__render('valuation') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['valuation'], ctx.__subtitle['valuation'], ctx.__disabled['valuation']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('valuation', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:valuation] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Key Metrics — awaiting data"}
      reason={"equitiesDeepDive:valuation"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:valuation",
  panelId: "valuation",
  markets: ["equitiesDeepDive"],
  title: "Key Metrics",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/valuation.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['valuation'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['valuation']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['valuation']),
  Body,
});
