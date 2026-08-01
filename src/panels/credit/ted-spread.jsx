import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:ted-spread
 * Body prefers ctx.__render('ted-spread') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ted-spread'], ctx.__subtitle['ted-spread'], ctx.__disabled['ted-spread']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ted-spread', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:ted-spread] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"TED Spread — awaiting data"}
      reason={"credit:ted-spread"}
    />
  );
}

export default definePanel({
  key: "credit:ted-spread",
  panelId: "ted-spread",
  markets: ["credit"],
  title: "TED Spread",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/ted-spread.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ted-spread'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ted-spread']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ted-spread']),
  Body,
});
