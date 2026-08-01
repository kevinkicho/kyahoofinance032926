import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:fed-risk-mood
 * Body prefers ctx.__render('fed-risk-mood') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fed-risk-mood'], ctx.__subtitle['fed-risk-mood'], ctx.__disabled['fed-risk-mood']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fed-risk-mood', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:fed-risk-mood] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Fed Narrative & Risk Mood — awaiting data"}
      reason={"sentiment:fed-risk-mood"}
    />
  );
}

export default definePanel({
  key: "sentiment:fed-risk-mood",
  panelId: "fed-risk-mood",
  markets: ["sentiment"],
  title: "Fed Narrative & Risk Mood",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/fed-risk-mood.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fed-risk-mood'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fed-risk-mood']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fed-risk-mood']),
  Body,
});
