import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:dxy
 * Body prefers ctx.__render('dxy') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['dxy'], ctx.__subtitle['dxy'], ctx.__disabled['dxy']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('dxy', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:dxy] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"DXY Tracker — awaiting data"}
      reason={"fx:dxy"}
    />
  );
}

export default definePanel({
  key: "fx:dxy",
  panelId: "dxy",
  markets: ["fx"],
  title: "DXY Tracker",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/dxy.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['dxy'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['dxy']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['dxy']),
  Body,
});
