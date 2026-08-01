import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:caprate
 * Body prefers ctx.__render('caprate') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['caprate'], ctx.__subtitle['caprate'], ctx.__disabled['caprate']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('caprate', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:caprate] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cap Rates by Sector — awaiting data"}
      reason={"realEstate:caprate"}
    />
  );
}

export default definePanel({
  key: "realEstate:caprate",
  panelId: "caprate",
  markets: ["realEstate"],
  title: "Cap Rates by Sector",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/caprate.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['caprate'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['caprate']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['caprate']),
  Body,
});
