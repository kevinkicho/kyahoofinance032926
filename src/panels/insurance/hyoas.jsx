import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:hyoas
 * Body prefers ctx.__render('hyoas') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['hyoas'], ctx.__subtitle['hyoas'], ctx.__disabled['hyoas']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('hyoas', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:hyoas] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"HY OAS Spread — awaiting data"}
      reason={"insurance:hyoas"}
    />
  );
}

export default definePanel({
  key: "insurance:hyoas",
  panelId: "hyoas",
  markets: ["insurance"],
  title: "HY OAS Spread",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/hyoas.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['hyoas'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['hyoas']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['hyoas']),
  Body,
});
