import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:etf
 * Body prefers ctx.__render('etf') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['etf'], ctx.__subtitle['etf'], ctx.__disabled['etf']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('etf', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:etf] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"ETF Performance — awaiting data"}
      reason={"equitiesDeepDive:etf"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:etf",
  panelId: "etf",
  markets: ["equitiesDeepDive"],
  title: "ETF Performance",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/etf.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['etf'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['etf']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['etf']),
  Body,
});
