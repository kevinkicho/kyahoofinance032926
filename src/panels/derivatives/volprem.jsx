import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:volprem
 * Body prefers ctx.__render('volprem') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['volprem'], ctx.__subtitle['volprem'], ctx.__disabled['volprem']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('volprem', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:volprem] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Vol Premium — awaiting data"}
      reason={"derivatives:volprem"}
    />
  );
}

export default definePanel({
  key: "derivatives:volprem",
  panelId: "volprem",
  markets: ["derivatives"],
  title: "Vol Premium",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/volprem.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['volprem'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['volprem']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['volprem']),
  Body,
});
