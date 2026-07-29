/**
 * Point git at repo-managed hooks (.githooks/) so pre-push always runs preflight.
 * Idempotent; safe to run on every npm install via the "prepare" script.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const hooksPath = '.githooks';

if (!existsSync(join(ROOT, hooksPath, 'pre-push'))) {
  console.warn('install-hooks: .githooks/pre-push missing; skip');
  process.exit(0);
}

// Only configure when we are inside a git work tree
try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
} catch {
  process.exit(0);
}

try {
  const current = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  if (current === hooksPath || current.replace(/\\/g, '/') === hooksPath) {
    process.exit(0);
  }
} catch {
  // not set yet
}

execFileSync('git', ['config', 'core.hooksPath', hooksPath], { cwd: ROOT });
console.log(`install-hooks: core.hooksPath → ${hooksPath}`);
