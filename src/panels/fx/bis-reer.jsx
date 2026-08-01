import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:bis-reer
 * Body prefers ctx.__render('bis-reer') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bis-reer'], ctx.__subtitle['bis-reer'], ctx.__disabled['bis-reer']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bis-reer', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:bis-reer] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BIS REER Comparison — awaiting data"}
      reason={"fx:bis-reer"}
    />
  );
}

export default definePanel({
  key: "fx:bis-reer",
  panelId: "bis-reer",
  markets: ["fx"],
  title: "BIS REER Comparison",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/bis-reer.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bis-reer'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bis-reer']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bis-reer']),
  Body,
});
