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

const findings = [];

for (const file of trackedFiles) {
  // Never scan the guard script itself for its own pattern sources.
  if (file.replace(/\\/g, '/').endsWith('scripts/guard-secrets.mjs')) continue;

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
}

if (findings.length > 0) {
  console.error('Secret guard found committed key-like values:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name} (${finding.count})`);
  }
  console.error('Move public runtime config to GitHub Actions variables or local .env instead.');
  process.exit(1);
}

console.log('Secret guard passed.');

