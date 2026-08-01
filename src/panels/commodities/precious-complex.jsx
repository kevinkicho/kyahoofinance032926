import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:precious-complex
 * Body prefers ctx.__render('precious-complex') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['precious-complex'], ctx.__subtitle['precious-complex'], ctx.__disabled['precious-complex']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('precious-complex', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:precious-complex] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Precious Metals Complex — awaiting data"}
      reason={"commodities:precious-complex"}
    />
  );
}

export default definePanel({
  key: "commodities:precious-complex",
  panelId: "precious-complex",
  markets: ["commodities"],
  title: "Precious Metals Complex",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/precious-complex.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['precious-complex'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['precious-complex']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['precious-complex']),
  Body,
});
