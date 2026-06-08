const FIREBASE_FUNCTIONS_URL = 'https://us-central1-kfinance032926.cloudfunctions.net/api';

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return '/api';
  }
  return FIREBASE_FUNCTIONS_URL;
}

export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
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