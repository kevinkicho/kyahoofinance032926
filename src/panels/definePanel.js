/**
 * Define a tab-independent panel module.
 *
 * Panels live under src/panels/ and are composed by market dashboards.
 * They do not depend on being written inside a tab file.
 *
 * @typedef {object} PanelDefinition
 * @property {string} key              Canonical id "marketId:panelId" (or shared key)
 * @property {string} panelId          React-grid / data-panel-key id
 * @property {string[]} markets        Tabs that may mount this panel
 * @property {string} title
 * @property {string} [source]         DataFooter source label
 * @property {string} [contentClassName]
 * @property {string} [className]
 * @property {(ctx: object) => string|null|undefined} [getSubtitle]
 * @property {(ctx: object) => boolean} [isLive]
 * @property {(ctx: object) => boolean} [isDisabled]
 * @property {import('react').ComponentType<any>} Body
 * @property {string} [modulePath]     For manifest / agents
 */

/**
 * @param {PanelDefinition} def
 * @returns {PanelDefinition}
 */
export function definePanel(def) {
  if (!def?.key || !def?.panelId || !def?.Body) {
    throw new Error('definePanel requires key, panelId, and Body');
  }
  if (!Array.isArray(def.markets) || def.markets.length === 0) {
    throw new Error(`definePanel(${def.key}): markets[] required`);
  }
  return {
    source: 'Market data',
    contentClassName: '',
    className: '',
    getSubtitle: () => undefined,
    isLive: () => false,
    isDisabled: () => false,
    ...def,
  };
}
