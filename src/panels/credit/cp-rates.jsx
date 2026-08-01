import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:cp-rates
 * Body prefers ctx.__render('cp-rates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cp-rates'], ctx.__subtitle['cp-rates'], ctx.__disabled['cp-rates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cp-rates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:cp-rates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Commercial Paper — awaiting data"}
      reason={"credit:cp-rates"}
    />
  );
}

export default definePanel({
  key: "credit:cp-rates",
  panelId: "cp-rates",
  markets: ["credit"],
  title: "Commercial Paper",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/cp-rates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cp-rates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cp-rates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cp-rates']),
  Body,
});
