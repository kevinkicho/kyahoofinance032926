import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:default-rates
 * Body prefers ctx.__render('default-rates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['default-rates'], ctx.__subtitle['default-rates'], ctx.__disabled['default-rates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('default-rates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:default-rates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Default Rates — awaiting data"}
      reason={"credit:default-rates"}
    />
  );
}

export default definePanel({
  key: "credit:default-rates",
  panelId: "default-rates",
  markets: ["credit"],
  title: "Default Rates",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/default-rates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['default-rates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['default-rates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['default-rates']),
  Body,
});
