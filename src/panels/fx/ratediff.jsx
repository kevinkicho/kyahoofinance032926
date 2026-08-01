import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:ratediff
 * Body prefers ctx.__render('ratediff') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ratediff'], ctx.__subtitle['ratediff'], ctx.__disabled['ratediff']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ratediff', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:ratediff] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Rate Differentials — awaiting data"}
      reason={"fx:ratediff"}
    />
  );
}

export default definePanel({
  key: "fx:ratediff",
  panelId: "ratediff",
  markets: ["fx"],
  title: "Rate Differentials",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/ratediff.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ratediff'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ratediff']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ratediff']),
  Body,
});
