import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:catastrophes
 * Body prefers ctx.__render('catastrophes') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['catastrophes'], ctx.__subtitle['catastrophes'], ctx.__disabled['catastrophes']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('catastrophes', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:catastrophes] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Catastrophes (FEMA+USGS) — awaiting data"}
      reason={"insurance:catastrophes"}
    />
  );
}

export default definePanel({
  key: "insurance:catastrophes",
  panelId: "catastrophes",
  markets: ["insurance"],
  title: "Catastrophes (FEMA+USGS)",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/catastrophes.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['catastrophes'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['catastrophes']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['catastrophes']),
  Body,
});
