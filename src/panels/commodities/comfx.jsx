import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:comfx
 * Body prefers ctx.__render('comfx') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['comfx'], ctx.__subtitle['comfx'], ctx.__disabled['comfx']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('comfx', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:comfx] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Commodity FX (vs USD) — awaiting data"}
      reason={"commodities:comfx"}
    />
  );
}

export default definePanel({
  key: "commodities:comfx",
  panelId: "comfx",
  markets: ["commodities"],
  title: "Commodity FX (vs USD)",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/comfx.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['comfx'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['comfx']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['comfx']),
  Body,
});
