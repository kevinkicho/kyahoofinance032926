import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:cli
 * Body prefers ctx.__render('cli') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cli'], ctx.__subtitle['cli'], ctx.__disabled['cli']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cli', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:cli] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"OECD Leading Indicators — awaiting data"}
      reason={"globalMacro:cli"}
    />
  );
}

export default definePanel({
  key: "globalMacro:cli",
  panelId: "cli",
  markets: ["globalMacro"],
  title: "OECD Leading Indicators",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/cli.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cli'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cli']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cli']),
  Body,
});
