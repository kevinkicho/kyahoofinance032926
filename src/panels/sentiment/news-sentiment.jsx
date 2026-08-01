import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:news-sentiment
 * Body prefers ctx.__render('news-sentiment') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['news-sentiment'], ctx.__subtitle['news-sentiment'], ctx.__disabled['news-sentiment']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('news-sentiment', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:news-sentiment] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Daily News Sentiment Index (SF Fed) — awaiting data"}
      reason={"sentiment:news-sentiment"}
    />
  );
}

export default definePanel({
  key: "sentiment:news-sentiment",
  panelId: "news-sentiment",
  markets: ["sentiment"],
  title: "Daily News Sentiment Index (SF Fed)",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/news-sentiment.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['news-sentiment'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['news-sentiment']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['news-sentiment']),
  Body,
});
