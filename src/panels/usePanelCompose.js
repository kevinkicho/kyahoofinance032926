/**
 * Helpers for market dashboards that compose independent panels.
 * Tabs stay composition roots: data bag + __render + live/subtitle flags.
 */
import { useCallback, useMemo } from 'react';

/**
 * Build a stable panel ctx for MarketPanelGrid / PanelSlot.
 *
 * @param {object} opts
 * @param {object} [opts.data]          Domain data bags (e.g. { bonds, fx })
 * @param {(id: string, ctx: object) => any} opts.render  Body renderer by panelId
 * @param {Record<string, boolean>} [opts.live]
 * @param {Record<string, string>} [opts.subtitle]
 * @param {Record<string, boolean>} [opts.disabled]
 * @param {Record<string, boolean>} [opts.noFooter]
 * @param {Record<string, string>} [opts.source]
 * @param {any[]} [opts.deps]           Extra deps for memo (render is included)
 */
export function usePanelCompose({
  data = {},
  render,
  live = {},
  subtitle = {},
  disabled = {},
  noFooter = {},
  source = {},
  deps = [],
}) {
  const __render = useCallback(
    (panelId, ctx) => (typeof render === 'function' ? render(panelId, ctx) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  return useMemo(
    () => ({
      ...data,
      __render,
      __live: live,
      __subtitle: subtitle,
      __disabled: disabled,
      __noFooter: noFooter,
      __source: source,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [__render, live, subtitle, disabled, noFooter, source, ...deps],
  );
}
