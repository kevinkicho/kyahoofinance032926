/**
 * Panel health information system — layered facts + single presentation policy.
 *
 * L0 market plane — DataProvider / HubFooter (not here)
 * L1 panel data  — panelData.js (pure, no DOM)
 * L2 panel paint — panelPaint.js (DOM + bridge tags)
 * Present        — present.js (chips/dots)
 *
 * @see docs/PANEL_HEALTH_CHRONIC_REVIEW.md
 */

export {
  DATA,
  PAINT,
  VIA,
  CONFIRM,
  factsFromReport,
  attachHealthLayers,
} from './types.js';

export {
  evaluatePanelData,
  evaluateMarketPanelData,
  evaluateAllMarketsDataOnly,
  reportFromPanelData,
  evaluateContractPanelFields,
  getPanelSpec,
  getRegistryEntry,
  resolvePanelFieldValue,
  collectSamples,
} from './panelData.js';

export { evaluatePanelPaint } from './panelPaint.js';

export {
  toTopbarDot,
  toSplashChip,
  toMarketSplashKind,
  toMarketTallies,
  countHealthStatuses,
  topbarColorToSplash,
} from './present.js';
