// Resolve the backend base URL for API calls.
// Local-first: prefer same-origin / Vite proxy; only use an external base when
// explicitly configured or when hosted on known static hosts.

/**
 * Resolve the production API base at runtime.
 * Priority:
 *   1. Explicit VITE_API_BASE_URL (build-time env)
 *   2. localhost / 127.0.0.1 → empty string (same origin or Vite proxy)
 *   3. Known static hosts (GitHub Pages etc.) → require VITE_API_BASE_URL
 *   4. Otherwise empty (relative /api — works when Express serves the SPA)
 */
function resolveProdBase() {
  const envBase =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    '';

  if (envBase) return String(envBase).replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      // Production localhost: Express serves dist/ and /api on the same origin,
      // or Vite preview proxies — relative paths are correct.
      return '';
    }
    if (
      host.endsWith('.github.io') ||
      host.endsWith('.pages.dev') ||
      host.includes('githubusercontent')
    ) {
      // Static hosting without a co-located API needs an explicit base.
      // Without VITE_API_BASE_URL, relative /api will 404 — surface that clearly.
      console.warn(
        '[api] Static host detected but VITE_API_BASE_URL is not set. API calls will use relative /api paths.'
      );
      return '';
    }
  }

  // Default: same-origin relative paths (Docker / Express-served SPA / local).
  return '';
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    // Dev: empty so fetch('/api/xxx') goes through Vite's proxy.
    return '';
  }
  return resolveProdBase();
}

/** Small diagnostic object useful for footers, toasts, or "copy debug info". */
export function getApiInfo() {
  const base = getApiBaseUrl();
  return {
    base,
    isDev: !!import.meta.env.DEV,
    isExternal: /^https?:\/\//i.test(base),
    host: typeof window !== 'undefined' ? window.location.hostname : null,
  };
}

/**
 * Build a full API URL for the current environment.
 * - Dev / localhost prod: '/api/...' (Vite proxy or same-origin Express)
 * - Explicit VITE_API_BASE_URL: 'https://backend/api/...'
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
    body: JSON.stringify(data),
  }),
};
