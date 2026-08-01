import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:movers
 * Body prefers ctx.__render('movers') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['movers'], ctx.__subtitle['movers'], ctx.__disabled['movers']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('movers', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:movers] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Top Movers — awaiting data"}
      reason={"fx:movers"}
    />
  );
}

export default definePanel({
  key: "fx:movers",
  panelId: "movers",
  markets: ["fx"],
  title: "Top Movers",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/movers.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['movers'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['movers']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['movers']),
  Body,
});
