import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:em-yields
 * Body prefers ctx.__render('em-yields') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['em-yields'], ctx.__subtitle['em-yields'], ctx.__disabled['em-yields']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('em-yields', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:em-yields] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"EM ETF Yields — awaiting data"}
      reason={"credit:em-yields"}
    />
  );
}

export default definePanel({
  key: "credit:em-yields",
  panelId: "em-yields",
  markets: ["credit"],
  title: "EM ETF Yields",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/em-yields.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['em-yields'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['em-yields']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['em-yields']),
  Body,
});
