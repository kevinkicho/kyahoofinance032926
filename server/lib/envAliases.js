/**
 * Normalize common .env key spellings so routes that read CANONICAL names work
 * when users paste provider-style names (hyphens, mixed case).
 *
 * Never logs values. Safe to call once at process boot after dotenv.
 */

const ALIASES = [
  // [canonical, ...alternates]
  ['CENSUS_API_KEY', 'CENSUS-API-KEY', 'CENSUS_KEY', 'census_api_key'],
  ['FRED_API_KEY', 'FRED-API-KEY', 'FRED_KEY'],
  ['BLS_API_KEY', 'BLS-API-KEY', 'BLS_KEY'],
  ['EIA_API_KEY', 'EIA-API-KEY', 'EIA_KEY'],
  ['BEA_API_KEY', 'BEA-API-KEY', 'BEA_KEY'],
  ['HUD_API_KEY', 'HUD-API-KEY', 'HUD_KEY'],
  ['OLLAMA_API_KEY', 'OLLAMA-API-KEY', 'ollama_api_key'],
];

/**
 * @returns {{ applied: string[] }} which canonical keys were filled from an alias
 */
export function applyEnvAliases(env = process.env) {
  const applied = [];
  for (const [canonical, ...alts] of ALIASES) {
    const cur = String(env[canonical] || '').trim();
    if (cur) continue;
    for (const alt of alts) {
      const v = String(env[alt] || '').trim();
      if (v) {
        env[canonical] = v;
        applied.push(`${alt}→${canonical}`);
        break;
      }
    }
  }
  return { applied };
}

/** Resolve a key trying canonical then hyphen form. */
export function envKey(name, env = process.env) {
  const v = env[name] || env[name.replace(/_/g, '-')] || env[name.replace(/-/g, '_')] || '';
  return String(v).trim();
}
