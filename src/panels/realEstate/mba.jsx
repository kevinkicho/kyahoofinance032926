import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:mba
 * Body prefers ctx.__render('mba') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['mba'], ctx.__subtitle['mba'], ctx.__disabled['mba']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('mba', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:mba] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Mortgage Rates — awaiting data"}
      reason={"realEstate:mba"}
    />
  );
}

export default definePanel({
  key: "realEstate:mba",
  panelId: "mba",
  markets: ["realEstate"],
  title: "Mortgage Rates",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/mba.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['mba'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['mba']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['mba']),
  Body,
});
