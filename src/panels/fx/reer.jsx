import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:reer
 * Body prefers ctx.__render('reer') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['reer'], ctx.__subtitle['reer'], ctx.__disabled['reer']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('reer', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:reer] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"REER Chart — awaiting data"}
      reason={"fx:reer"}
    />
  );
}

export default definePanel({
  key: "fx:reer",
  panelId: "reer",
  markets: ["fx"],
  title: "REER Chart",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/reer.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['reer'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['reer']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['reer']),
  Body,
});
