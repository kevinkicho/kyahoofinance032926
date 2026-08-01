import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:foreclosure
 * Body prefers ctx.__render('foreclosure') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['foreclosure'], ctx.__subtitle['foreclosure'], ctx.__disabled['foreclosure']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('foreclosure', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:foreclosure] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Distress Indicators — awaiting data"}
      reason={"realEstate:foreclosure"}
    />
  );
}

export default definePanel({
  key: "realEstate:foreclosure",
  panelId: "foreclosure",
  markets: ["realEstate"],
  title: "Distress Indicators",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/foreclosure.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['foreclosure'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['foreclosure']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['foreclosure']),
  Body,
});
