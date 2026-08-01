import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:imf-cofer
 * Body prefers ctx.__render('imf-cofer') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['imf-cofer'], ctx.__subtitle['imf-cofer'], ctx.__disabled['imf-cofer']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('imf-cofer', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:imf-cofer] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"IMF COFER — awaiting data"}
      reason={"globalMacro:imf-cofer"}
    />
  );
}

export default definePanel({
  key: "globalMacro:imf-cofer",
  panelId: "imf-cofer",
  markets: ["globalMacro"],
  title: "IMF COFER",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/imf-cofer.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['imf-cofer'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['imf-cofer']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['imf-cofer']),
  Body,
});
