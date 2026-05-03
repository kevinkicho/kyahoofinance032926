#!/usr/bin/env node
// Interactive .env creator. Run on a fresh checkout via:
//   node scripts/setup-env.js
//
// Behaviour:
//   - If .env doesn't exist, copy .env.example to .env, then prompt for
//     each blank key. The user can press Enter to skip any key — affected
//     routes will serve a placeholder until the key is filled in later.
//   - If .env exists, only prompt for keys that are blank in it. Keys
//     already filled are left alone.
//
// Stdin/stdout only — no external deps.

import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

// (key, description, signup URL) — only the prompted set; the example file
// has the full list including the OAuth bits which most users skip.
const PROMPT_KEYS = [
  ['FRED_API_KEY', 'FRED — Federal Reserve Economic Data (powers bonds/macro/credit/etc.)',                          'https://fred.stlouisfed.org/docs/api/api_key.html'],
  ['EIA_API_KEY',  'EIA — US Energy Information Administration (powers commodities supply/demand + eia tab)',      'https://www.eia.gov/opendata/register.php'],
  ['BLS_API_KEY',  'BLS — Bureau of Labor Statistics (optional; falls back to FRED if blank)',                       'https://data.bls.gov/registrationEngine/'],
];

function readEnvFile(p) {
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnvFile(p, kv) {
  // Preserve the .env.example structure so comments stay; only the
  // prompted keys are rewritten with new values.
  const example = fs.existsSync(EXAMPLE_PATH) ? fs.readFileSync(EXAMPLE_PATH, 'utf8') : '';
  let out = example;
  for (const [k, v] of Object.entries(kv)) {
    const pattern = new RegExp(`^${k}=.*$`, 'm');
    const line = `${k}=${v ?? ''}`;
    out = pattern.test(out) ? out.replace(pattern, line) : `${out}\n${line}`;
  }
  fs.writeFileSync(p, out);
}

async function prompt(rl, q) {
  return new Promise(res => rl.question(q, ans => res(ans.trim())));
}

(async () => {
  console.log('\n=== Global Market Hub · environment setup ===\n');
  if (!fs.existsSync(EXAMPLE_PATH)) {
    console.error('error: .env.example missing — re-pull repo');
    process.exit(1);
  }

  let existing = readEnvFile(ENV_PATH);
  if (!fs.existsSync(ENV_PATH)) {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log(`Created ${path.relative(ROOT, ENV_PATH)} from template.\n`);
    existing = readEnvFile(ENV_PATH);
  } else {
    console.log(`Found existing ${path.relative(ROOT, ENV_PATH)} — only prompting for blanks.\n`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const updates = {};
  for (const [key, desc, url] of PROMPT_KEYS) {
    if (existing[key]) {
      console.log(`  ✓ ${key} already set`);
      continue;
    }
    console.log(`\n  ${key}`);
    console.log(`    ${desc}`);
    console.log(`    Get key: ${url}`);
    const ans = await prompt(rl, `    Enter ${key} (or press Enter to skip): `);
    if (ans) updates[key] = ans;
  }
  rl.close();

  if (Object.keys(updates).length > 0) {
    writeEnvFile(ENV_PATH, { ...existing, ...updates });
    console.log(`\nWrote ${Object.keys(updates).length} key(s) to ${path.relative(ROOT, ENV_PATH)}.`);
  } else {
    console.log('\nNo changes.');
  }

  console.log('\nNext: run `npm start` (the server will warn about any keys still blank).');
})();
