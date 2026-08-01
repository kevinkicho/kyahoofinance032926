import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:eia-petrol
 * Body prefers ctx.__render('eia-petrol') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['eia-petrol'], ctx.__subtitle['eia-petrol'], ctx.__disabled['eia-petrol']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('eia-petrol', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:eia-petrol] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Petroleum & Natural Gas — awaiting data"}
      reason={"commodities:eia-petrol"}
    />
  );
}

export default definePanel({
  key: "commodities:eia-petrol",
  panelId: "eia-petrol",
  markets: ["commodities"],
  title: "Petroleum & Natural Gas",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/eia-petrol.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['eia-petrol'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['eia-petrol']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['eia-petrol']),
  Body,
});
