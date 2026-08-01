import p_kpi from './kpi.jsx';
import p_provenance from './provenance.jsx';
import p_diagnostics from './diagnostics.jsx';
import p_server from './server.jsx';
import p_api_usage from './api-usage.jsx';
import p_source_health from './source-health.jsx';
import p_endpoints from './endpoints.jsx';
import p_freshness from './freshness.jsx';
import p_error_log from './error-log.jsx';
import p_mem_cache from './mem-cache.jsx';
import p_cache_files from './cache-files.jsx';
import p_routes from './routes.jsx';
import p_panel_trace from './panel-trace.jsx';
import p_coverage_matrix from './coverage-matrix.jsx';

/** @type {import('../definePanel').PanelDefinition[]} */
export const ANALYTICS_PANELS = [
  p_kpi,
  p_provenance,
  p_diagnostics,
  p_server,
  p_api_usage,
  p_source_health,
  p_endpoints,
  p_freshness,
  p_error_log,
  p_mem_cache,
  p_cache_files,
  p_routes,
  p_panel_trace,
  p_coverage_matrix
];

export const ANALYTICS_PANEL_BY_ID = Object.fromEntries(
  ANALYTICS_PANELS.map((p) => [p.panelId, p]),
);
