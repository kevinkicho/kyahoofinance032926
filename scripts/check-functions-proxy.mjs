/**
 * Ensures Cloud Functions public `api` does not re-introduce a full local
 * market route tree (drift vs server/). Proxy-only is required.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const indexTs = join(root, 'functions', 'src', 'index.ts');
if (!existsSync(indexTs)) {
  console.log('check-functions-proxy: no functions/src/index.ts (ok)');
  process.exit(0);
}

const text = readFileSync(indexTs, 'utf8');
const bad = [];

if (/path\.join\(__dirname,\s*["']routes["']/.test(text) || /require\(.*routes\/\$\{/.test(text)) {
  bad.push('functions/src/index.ts still dynamically loads local routes/* market handlers');
}
if (!/functions-proxy|proxied-from|appHostingBase|APP_HOSTING_BASE/.test(text)) {
  bad.push('functions/src/index.ts missing App Hosting proxy markers');
}
if (/loadRoutes\s*\(/.test(text) && /essentialRoutes/.test(text)) {
  bad.push('functions/src/index.ts still defines loadRoutes/essentialRoutes dual path');
}

if (bad.length) {
  console.error('check-functions-proxy failed:');
  for (const b of bad) console.error(' -', b);
  process.exit(1);
}

console.log('check-functions-proxy: ok (proxy-only Functions api)');
