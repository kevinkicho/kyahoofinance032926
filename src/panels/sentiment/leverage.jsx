import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:leverage
 * Body prefers ctx.__render('leverage') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['leverage'], ctx.__subtitle['leverage'], ctx.__disabled['leverage']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('leverage', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:leverage] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Leverage Metrics — awaiting data"}
      reason={"sentiment:leverage"}
    />
  );
}

export default definePanel({
  key: "sentiment:leverage",
  panelId: "leverage",
  markets: ["sentiment"],
  title: "Leverage Metrics",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/leverage.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['leverage'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['leverage']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['leverage']),
  Body,
});
