/**
 * Local quality gate — what agents and humans must pass before push.
 *
 * Default (fast, always):
 *   1. guard:secrets
 *   2. lint-workflows  (catches GHA YAML policy errors unit tests miss)
 *   3. vitest (npm test)
 *
 * Full (--full or PREFLIGHT_FULL=1):
 *   + vite build
 *   + functions build (if functions/ exists with build script)
 *
 * Usage:
 *   npm run preflight
 *   npm run preflight:full
 *   node scripts/preflight.mjs --full
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const full =
  process.argv.includes('--full') ||
  process.env.PREFLIGHT_FULL === '1' ||
  process.env.PREFLIGHT_FULL === 'true';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function run(label, command, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${command} ${args.join(' ')}`);
  const r = spawnSync(command, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`\n✖ preflight failed at: ${label}`);
    process.exit(r.status ?? 1);
  }
  console.log(`✔ ${label}`);
}

console.log(`preflight starting${full ? ' (full)' : ''}…`);

run('Secret guard', npm, ['run', 'guard:secrets']);
run('Workflow lint', 'node', ['scripts/lint-workflows.mjs']);
run('Functions proxy drift check', 'node', ['scripts/check-functions-proxy.mjs']);
run('Unit tests (vitest)', npm, ['test']);

if (full) {
  run('Frontend production build', npm, ['run', 'build']);

  const fnPkg = join(ROOT, 'functions', 'package.json');
  if (existsSync(fnPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(fnPkg, 'utf8'));
      if (pkg.scripts?.build) {
        run('Cloud Functions build', npm, ['run', 'build'], {
          cwd: join(ROOT, 'functions'),
        });
      }
    } catch {
      /* ignore parse errors; skip functions build */
    }
  }
}

console.log(`\n✅ preflight passed${full ? ' (full)' : ''}`);
console.log(
  full
    ? 'Safe to commit and push (for this local gate).'
    : 'Safe to push for unit/workflow gates. Use npm run preflight:full before large deploys.',
);
