import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:global-liquidity
 * Body prefers ctx.__render('global-liquidity') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['global-liquidity'], ctx.__subtitle['global-liquidity'], ctx.__disabled['global-liquidity']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('global-liquidity', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:global-liquidity] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BIS Global Liquidity — awaiting data"}
      reason={"globalMacro:global-liquidity"}
    />
  );
}

export default definePanel({
  key: "globalMacro:global-liquidity",
  panelId: "global-liquidity",
  markets: ["globalMacro"],
  title: "BIS Global Liquidity",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/global-liquidity.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['global-liquidity'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['global-liquidity']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['global-liquidity']),
  Body,
});
