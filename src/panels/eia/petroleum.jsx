import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:petroleum
 * Body prefers ctx.__render('petroleum') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['petroleum'], ctx.__subtitle['petroleum'], ctx.__disabled['petroleum']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('petroleum', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel eia:petroleum] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Petroleum — awaiting data"}
      reason={"eia:petroleum"}
    />
  );
}

export default definePanel({
  key: "eia:petroleum",
  panelId: "petroleum",
  markets: ["eia"],
  title: "Petroleum",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/petroleum.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['petroleum'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['petroleum']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['petroleum']),
  Body,
});
