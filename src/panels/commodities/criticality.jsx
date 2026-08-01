import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:criticality
 * Body prefers ctx.__render('criticality') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['criticality'], ctx.__subtitle['criticality'], ctx.__disabled['criticality']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('criticality', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:criticality] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Criticality Leaderboard — awaiting data"}
      reason={"commodities:criticality"}
    />
  );
}

export default definePanel({
  key: "commodities:criticality",
  panelId: "criticality",
  markets: ["commodities"],
  title: "Criticality Leaderboard",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/criticality.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['criticality'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['criticality']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['criticality']),
  Body,
});
