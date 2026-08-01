import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:treasury-tic
 * Body prefers ctx.__render('treasury-tic') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['treasury-tic'], ctx.__subtitle['treasury-tic'], ctx.__disabled['treasury-tic']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('treasury-tic', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:treasury-tic] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Treasury TIC Holdings — awaiting data"}
      reason={"fx:treasury-tic"}
    />
  );
}

export default definePanel({
  key: "fx:treasury-tic",
  panelId: "treasury-tic",
  markets: ["fx"],
  title: "Treasury TIC Holdings",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/treasury-tic.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['treasury-tic'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['treasury-tic']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['treasury-tic']),
  Body,
});
