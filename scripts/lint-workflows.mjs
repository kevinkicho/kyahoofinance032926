/**
 * Static lint for GitHub Actions workflows.
 * Catches policy mistakes that unit tests never see and that fail only on GitHub.
 *
 * Known failure mode (this repo hit it repeatedly):
 *   if: ${{ secrets.FOO != '' }}
 * GitHub rejects secret comparisons in `if:` and aborts the run with no useful logs.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const WORKFLOWS = join(ROOT, '.github', 'workflows');

const RULES = [
  {
    id: 'secrets-compare-empty',
    // secrets.X != '' / secrets.X == '' / secrets.X !== "" etc.
    pattern: /secrets\.[A-Za-z0-9_]+\s*(!=|==|!==|===)\s*['"]{2}/,
    message:
      'Do not compare secrets to empty string in if:. GitHub rejects this and fails the run. Use a public repo variable (vars.ENABLE_*) as a feature flag instead.',
  },
  {
    id: 'secrets-tojson-empty',
    pattern: /toJson\(secrets\.[A-Za-z0-9_]+\)\s*(!=|==)/,
    message:
      'Do not use toJson(secrets.*) comparisons in if:. Prefer vars.* feature flags.',
  },
  {
    id: 'secrets-truthy-bare',
    // if: ${{ secrets.FOO }} is also invalid / unreliable for presence checks
    pattern: /if:\s*\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}/,
    message:
      'Do not use bare secrets.NAME in if:. Secret presence cannot be tested that way. Use vars.* flags.',
  },
];

function listYmlFiles(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip archive/ examples unless we want them linted — still lint so legacy
      // copies do not reintroduce bad patterns if someone reactivates them.
      listYmlFiles(full, out);
    } else if (/\.ya?ml$/i.test(name) || name.endsWith('.yml.legacy')) {
      out.push(full);
    }
  }
  return out;
}

const files = listYmlFiles(WORKFLOWS);
if (files.length === 0) {
  console.log('lint-workflows: no workflow files found (ok)');
  process.exit(0);
}

const findings = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const rel = relative(ROOT, file).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore pure comments
    if (/^\s*#/.test(line)) continue;
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: rel,
          line: i + 1,
          rule: rule.id,
          message: rule.message,
          snippet: line.trim(),
        });
      }
    }
  }
}

if (findings.length) {
  console.error('lint-workflows: FAILED\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.rule}]`);
    console.error(`    ${f.snippet}`);
    console.error(`    → ${f.message}\n`);
  }
  console.error(`${findings.length} workflow issue(s). Fix before push.`);
  process.exit(1);
}

console.log(`lint-workflows: ok (${files.length} file(s))`);
