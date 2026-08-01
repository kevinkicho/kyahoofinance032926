import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:afford-stack
 * Body prefers ctx.__render('afford-stack') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['afford-stack'], ctx.__subtitle['afford-stack'], ctx.__disabled['afford-stack']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('afford-stack', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:afford-stack] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Housing Affordability Stack — awaiting data"}
      reason={"realEstate:afford-stack"}
    />
  );
}

export default definePanel({
  key: "realEstate:afford-stack",
  panelId: "afford-stack",
  markets: ["realEstate"],
  title: "Housing Affordability Stack",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/afford-stack.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['afford-stack'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['afford-stack']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['afford-stack']),
  Body,
});
