import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:fhfa-hpi
 * Body prefers ctx.__render('fhfa-hpi') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fhfa-hpi'], ctx.__subtitle['fhfa-hpi'], ctx.__disabled['fhfa-hpi']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fhfa-hpi', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:fhfa-hpi] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"FHFA House Price Index — awaiting data"}
      reason={"realEstate:fhfa-hpi"}
    />
  );
}

export default definePanel({
  key: "realEstate:fhfa-hpi",
  panelId: "fhfa-hpi",
  markets: ["realEstate"],
  title: "FHFA House Price Index",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/fhfa-hpi.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fhfa-hpi'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fhfa-hpi']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fhfa-hpi']),
  Body,
});
