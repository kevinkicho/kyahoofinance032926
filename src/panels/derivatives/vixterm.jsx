import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:vixterm
 * Body prefers ctx.__render('vixterm') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['vixterm'], ctx.__subtitle['vixterm'], ctx.__disabled['vixterm']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('vixterm', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:vixterm] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"VIX Term Structure — awaiting data"}
      reason={"derivatives:vixterm"}
    />
  );
}

export default definePanel({
  key: "derivatives:vixterm",
  panelId: "vixterm",
  markets: ["derivatives"],
  title: "VIX Term Structure",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/vixterm.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['vixterm'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['vixterm']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['vixterm']),
  Body,
});
