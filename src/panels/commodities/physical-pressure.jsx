import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:physical-pressure
 * Body prefers ctx.__render('physical-pressure') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['physical-pressure'], ctx.__subtitle['physical-pressure'], ctx.__disabled['physical-pressure']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('physical-pressure', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:physical-pressure] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Physical Pressure — awaiting data"}
      reason={"commodities:physical-pressure"}
    />
  );
}

export default definePanel({
  key: "commodities:physical-pressure",
  panelId: "physical-pressure",
  markets: ["commodities"],
  title: "Physical Pressure",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/physical-pressure.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['physical-pressure'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['physical-pressure']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['physical-pressure']),
  Body,
});
