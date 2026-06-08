let cachedConfig: any = null;

export function getConfig() {
  if (cachedConfig) return cachedConfig;
  
  try {
    const { config } = require('firebase-functions');
    cachedConfig = config();
  } catch {
    cachedConfig = {};
  }
  
  return cachedConfig;
}

export function getApiKey(key: string): string {
  const config = getConfig();
  return config?.api?.[key] || process.env[key] || '';
}

export const FRED_API_KEY = () => getApiKey('fred_api_key');
export const EIA_API_KEY = () => getApiKey('eia_api_key');
export const BLS_API_KEY = () => getApiKey('bls_api_key');
export const BEA_API_KEY = () => getApiKey('bea_api_key');
export const EDGAR_USER_AGENT = () => getApiKey('edgar_user_agent');
export const USDA_NASS_API_KEY = () => getApiKey('usda_nass_api_key');
export const YAHOO_APP_ID = () => getApiKey('yahoo_app_id');
export const YAHOO_CLIENT_ID = () => getApiKey('yahoo_client_id');
export const YAHOO_CLIENT_SECRET = () => getApiKey('yahoo_client_secret');