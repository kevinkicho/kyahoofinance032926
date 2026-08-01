import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:hud-affordability-by-metro
 * Body prefers ctx.__render('hud-affordability-by-metro') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['hud-affordability-by-metro'], ctx.__subtitle['hud-affordability-by-metro'], ctx.__disabled['hud-affordability-by-metro']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('hud-affordability-by-metro', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:hud-affordability-by-metro] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"HUD Affordability by Metro — awaiting data"}
      reason={"realEstate:hud-affordability-by-metro"}
    />
  );
}

export default definePanel({
  key: "realEstate:hud-affordability-by-metro",
  panelId: "hud-affordability-by-metro",
  markets: ["realEstate"],
  title: "HUD Affordability by Metro",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/hud-affordability-by-metro.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['hud-affordability-by-metro'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['hud-affordability-by-metro']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['hud-affordability-by-metro']),
  Body,
});
