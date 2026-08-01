import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:scores
 * Body prefers ctx.__render('scores') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['scores'], ctx.__subtitle['scores'], ctx.__disabled['scores']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('scores', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:scores] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Stock Factor Scores — awaiting data"}
      reason={"equitiesDeepDive:scores"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:scores",
  panelId: "scores",
  markets: ["equitiesDeepDive"],
  title: "Stock Factor Scores",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/scores.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['scores'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['scores']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['scores']),
  Body,
});
