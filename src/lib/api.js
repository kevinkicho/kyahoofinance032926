// Firebase project id (from .firebaserc). Used to construct a sane default
// Functions URL for this specific deployment.
const FIREBASE_PROJECT = 'kfinance032926';

// Preferred default for this project (us-central1 is Firebase's common default region).
// After `firebase deploy --only functions` the CLI will print the exact URL
// for the `api` Cloud Function. Override with VITE_API_BASE_URL if it differs
// (custom domain, different region, or Cloud Run direct URL).
// The actual live URL printed by `firebase deploy --only functions` for this project.
// Using the .run.app (often a Cloud Run backing for the 2nd-gen function) ensures
// the path construction (base + /api/xxx) matches what the Express mounts expect.
const DEFAULT_PROD_API_BASE = 'https://api-4uzq3y2xva-uc.a.run.app';

/**
 * Resolve the backend base at runtime.
 * Priority:
 *   1. Explicit VITE_API_BASE_URL (set at build time via .env or CI)
 *   2. Smart default for known static hosting (GitHub Pages) → always use the Functions URL
 *   3. The project default above
 */
function resolveProdBase() {
  const envBase =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    '';

  if (envBase) return envBase.replace(/\/$/, ''); // trim trailing slash

  // If we can detect we are running on a static host (GitHub Pages, Cloudflare Pages, etc.)
  // then we *must* talk to the external backend. Relative /api will 404.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (
      host.endsWith('.github.io') ||
      host.endsWith('.pages.dev') ||
      host.includes('githubusercontent')
    ) {
      // Return the default Functions URL. User can still override via the VITE var at build.
      return DEFAULT_PROD_API_BASE;
    }
  }

  return DEFAULT_PROD_API_BASE;
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    // In dev, return '' so that fetch('/api/xxx') goes through Vite's dev proxy
    // (configured in vite.config.js for all the /api/* routes).
    return '';
  }
  // Always re-resolve at call time so that even in lazily loaded chunks or
  // after deploys, we correctly detect the current host (github.io etc) and
  // force the external backend. This prevents mixed old/new chunks from
  // accidentally using relative paths on static hosting.
  return resolveProdBase();
}

/** Small diagnostic object useful for footers, toasts, or "copy debug info". */
export function getApiInfo() {
  const base = getApiBaseUrl();
  return {
    base,
    isDev: !!import.meta.env.DEV,
    isExternal: /^https?:\/\//i.test(base),
    project: FIREBASE_PROJECT,
  };
}

/**
 * Build a full API URL for the current environment.
 * Use this everywhere instead of hard-coding '/api/...' strings.
 * - Dev: returns '/api/...' (hits Vite proxy)
 * - Prod (GH Pages): returns 'https://<backend>/api/...'
 */
export function apiUrl(endpoint) {
  const base = getApiBaseUrl();
  if (!endpoint) return base || '';
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

export async function apiFetch(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiFetch(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
};