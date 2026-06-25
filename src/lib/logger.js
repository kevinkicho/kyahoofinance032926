// AppLogger — structured event log for AI agent consumption
// Captures UI state, data fetches, user interactions, and errors.
// Stored in localStorage + console output.

const MAX_LOG_ENTRIES = 500;
const STORAGE_KEY = 'app-log';
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB

let logEntries = [];
let sessionId = Date.now().toString(36);

function loadLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) logEntries = JSON.parse(raw);
  } catch {}
}

function saveLog() {
  try {
    // Trim to max size
    while (JSON.stringify(logEntries).length > MAX_STORAGE_SIZE && logEntries.length > 100) {
      logEntries.shift();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logEntries));
  } catch {}
}

loadLog();

function addEntry(type, data) {
  const entry = {
    ts: new Date().toISOString(),
    session: sessionId,
    type,
    ...data,
  };
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) logEntries.shift();
  saveLog();
  // Console output for AI agent visibility
  console.log(`[LOG:${type}]`, JSON.stringify(data).slice(0, 300));
}

// ── Public API ──

export function logMarketSwitch(from, to) {
  addEntry('market-switch', { from, to });
}

export function logPanelRender(marketId, panelId, status) {
  addEntry('panel-render', { market: marketId, panel: panelId, status });
}

export function logPanelHealth(marketId, health) {
  addEntry('panel-health', { market: marketId, panels: health });
}

export function logDataFetch(marketId, url, status, durationMs) {
  addEntry('data-fetch', { market: marketId, url, status, duration: durationMs });
}

export function logDataReceived(marketId, keys) {
  addEntry('data-received', { market: marketId, keys });
}

export function logError(source, message, details) {
  addEntry('error', { source, message, details: details?.slice?.(0, 500) || details });
}

export function logUserAction(action, data) {
  addEntry('user-action', { action, ...data });
}

export function logUiState(state) {
  addEntry('ui-state', state);
}

// Export log for AI agent
export function exportLog() {
  return JSON.stringify(logEntries, null, 2);
}

// Clear log
export function clearLog() {
  logEntries = [];
  localStorage.removeItem(STORAGE_KEY);
}

// Get log entries
export function getLog() {
  return [...logEntries];
}

// Expose on window for Playwright access
if (typeof window !== 'undefined') {
  window.__APP_LOG = {
    export: exportLog,
    clear: clearLog,
    get: getLog,
    log: addEntry,
  };
}
