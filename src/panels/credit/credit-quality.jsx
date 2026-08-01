import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:credit-quality
 * Body prefers ctx.__render('credit-quality') from the market tab during migration.
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('credit-quality', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:credit-quality] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Credit Quality Premium (Moody's) — awaiting data"}
      reason={"credit:credit-quality"}
    />
  );
}

export default definePanel({
  key: "credit:credit-quality",
  panelId: "credit-quality",
  markets: ["credit"],
  title: "Credit Quality Premium (Moody's)",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/credit-quality.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['credit-quality'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['credit-quality']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['credit-quality']),
  Body,
});
