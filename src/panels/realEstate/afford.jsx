import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:afford
 * Body prefers ctx.__render('afford') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['afford'], ctx.__subtitle['afford'], ctx.__disabled['afford']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('afford', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:afford] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Affordability Index — awaiting data"}
      reason={"realEstate:afford"}
    />
  );
}

export default definePanel({
  key: "realEstate:afford",
  panelId: "afford",
  markets: ["realEstate"],
  title: "Affordability Index",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/afford.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['afford'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['afford']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['afford']),
  Body,
});
