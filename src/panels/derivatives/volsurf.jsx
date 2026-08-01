import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:volsurf
 * Body prefers ctx.__render('volsurf') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['volsurf'], ctx.__subtitle['volsurf'], ctx.__disabled['volsurf']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('volsurf', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:volsurf] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Vol Surface — awaiting data"}
      reason={"derivatives:volsurf"}
    />
  );
}

export default definePanel({
  key: "derivatives:volsurf",
  panelId: "volsurf",
  markets: ["derivatives"],
  title: "Vol Surface",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/volsurf.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['volsurf'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['volsurf']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['volsurf']),
  Body,
});
