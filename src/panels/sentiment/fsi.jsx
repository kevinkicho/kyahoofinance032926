import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:fsi
 * Body prefers ctx.__render('fsi') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fsi'], ctx.__subtitle['fsi'], ctx.__disabled['fsi']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fsi', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:fsi] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Financial Stress Index — awaiting data"}
      reason={"sentiment:fsi"}
    />
  );
}

export default definePanel({
  key: "sentiment:fsi",
  panelId: "fsi",
  markets: ["sentiment"],
  title: "Financial Stress Index",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/fsi.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fsi'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fsi']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fsi']),
  Body,
});
