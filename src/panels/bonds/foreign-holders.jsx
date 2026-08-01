import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:foreign-holders
 * Body prefers ctx.__render('foreign-holders') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['foreign-holders'], ctx.__subtitle['foreign-holders'], ctx.__disabled['foreign-holders']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('foreign-holders', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:foreign-holders] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Foreign Holders — awaiting data"}
      reason={"bonds:foreign-holders"}
    />
  );
}

export default definePanel({
  key: "bonds:foreign-holders",
  panelId: "foreign-holders",
  markets: ["bonds"],
  title: "Foreign Holders",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/foreign-holders.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['foreign-holders'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['foreign-holders']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['foreign-holders']),
  Body,
});
