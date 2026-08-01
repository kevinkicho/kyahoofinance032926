import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:carry
 * Body prefers ctx.__render('carry') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['carry'], ctx.__subtitle['carry'], ctx.__disabled['carry']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('carry', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:carry] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Carry Map — awaiting data"}
      reason={"fx:carry"}
    />
  );
}

export default definePanel({
  key: "fx:carry",
  panelId: "carry",
  markets: ["fx"],
  title: "Carry Map",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/carry.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['carry'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['carry']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['carry']),
  Body,
});
