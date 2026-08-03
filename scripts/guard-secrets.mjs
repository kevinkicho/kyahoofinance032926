import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(file => !file.startsWith('dist/'))
  .filter(file => !file.startsWith('node_modules/'))
  .filter(file => !file.startsWith('functions/node_modules/'))
  .filter(file => !file.startsWith('server/node_modules/'));

// Patterns are built so this file does not contain the raw secret substrings
// (otherwise guard:secrets flags itself).
const checks = [
  {
    name: 'Firebase/Google API key',
    pattern: /AIza[0-9A-Za-z_-]{30,}/g,
  },
  {
    name: 'Firebase service-account private key PEM',
    // "-----BEGIN" + " PRIVATE KEY-----"
    pattern: new RegExp(`-----BEGIN${' '}PRIVATE KEY-----`, 'g'),
  },
  {
    name: 'Firebase service-account private_key field',
    pattern: new RegExp(`"private_key"\\s*:\\s*"-----BEGIN`, 'g'),
  },
];

/**
 * Env-style assignments that must never appear filled in tracked files.
 * Placeholders / empty values are allowed. Only non-empty real-looking values fail.
 * Does not print matched values.
 */
const ENV_KEY_CHECKS = [
  'FRED_API_KEY',
  'EIA_API_KEY',
  'BLS_API_KEY',
  'BEA_API_KEY',
  'FINNHUB_API_KEY',
  'HUD_API_KEY',
  'CENSUS_API_KEY',
  'CENSUS-API-KEY',
  'DATA-GOV-API-KEY',
  'API_DATA_GOV_KEY',
  'QUICK-STATS-API-KEY',
  'USDA_NASS_API_KEY',
  'WARM_TOKEN',
  'GCP_SA_KEY',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
];

const PLACEHOLDER_RE = /^(your[_-]?|xxx|change.?me|example|paste|todo|replace|<.*>|\s*)$/i;

function filledEnvAssignments(text) {
  const hits = [];
  for (const key of ENV_KEY_CHECKS) {
    const re = new RegExp(
      `^\\s*${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*=\\s*(.+)$`,
      'gim',
    );
    let m;
    while ((m = re.exec(text)) !== null) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!v || PLACEHOLDER_RE.test(v)) continue;
      if (v.length >= 16) {
        hits.push(key);
      }
    }
  }
  return hits;
}

/** Bare filename that is a secrets dump (not .env.example). */
const FORBIDDEN_TRACKED_NAMES = new Set([
  'env',
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
]);

const findings = [];

for (const file of trackedFiles) {
  const norm = file.replace(/\\/g, '/');
  if (norm.endsWith('scripts/guard-secrets.mjs')) continue;

  const base = norm.split('/').pop();
  if (FORBIDDEN_TRACKED_NAMES.has(base) || FORBIDDEN_TRACKED_NAMES.has(norm)) {
    findings.push({ file, name: `tracked secrets file "${base}" (use .env.example only)`, count: 1 });
    continue;
  }
  if (/\.env\.example$/i.test(base) || base === 'env.example') continue;

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const check of checks) {
    const matches = text.match(check.pattern);
    if (matches) {
      findings.push({ file, name: check.name, count: matches.length });
    }
  }

  const envHits = filledEnvAssignments(text);
  if (envHits.length) {
    findings.push({
      file,
      name: `filled API key assignment(s): ${[...new Set(envHits)].join(', ')}`,
      count: envHits.length,
    });
  }
}

if (findings.length > 0) {
  console.error('Secret guard found committed key-like values:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name} (${finding.count})`);
  }
  console.error('Move secrets to local .env (gitignored) or App Hosting / Actions secrets. Never commit filled keys.');
  process.exit(1);
}

console.log('Secret guard passed.');
