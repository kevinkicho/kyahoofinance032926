import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:catloss
 * Body prefers ctx.__render('catloss') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['catloss'], ctx.__subtitle['catloss'], ctx.__disabled['catloss']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('catloss', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:catloss] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Natural Catastrophe Losses — awaiting data"}
      reason={"insurance:catloss"}
    />
  );
}

export default definePanel({
  key: "insurance:catloss",
  panelId: "catloss",
  markets: ["insurance"],
  title: "Natural Catastrophe Losses",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/catloss.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['catloss'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['catloss']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['catloss']),
  Body,
});
