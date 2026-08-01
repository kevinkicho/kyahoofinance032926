import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:cftc
 * Body prefers ctx.__render('cftc') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cftc'], ctx.__subtitle['cftc'], ctx.__disabled['cftc']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cftc', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:cftc] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CFTC Positioning — awaiting data"}
      reason={"sentiment:cftc"}
    />
  );
}

export default definePanel({
  key: "sentiment:cftc",
  panelId: "cftc",
  markets: ["sentiment"],
  title: "CFTC Positioning",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/cftc.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cftc'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cftc']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cftc']),
  Body,
});
