import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:hud-afford
 * Body prefers ctx.__render('hud-afford') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['hud-afford'], ctx.__subtitle['hud-afford'], ctx.__disabled['hud-afford']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('hud-afford', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:hud-afford] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"HUD Rental Affordability — awaiting data"}
      reason={"realEstate:hud-afford"}
    />
  );
}

export default definePanel({
  key: "realEstate:hud-afford",
  panelId: "hud-afford",
  markets: ["realEstate"],
  title: "HUD Rental Affordability",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/hud-afford.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['hud-afford'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['hud-afford']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['hud-afford']),
  Body,
});
