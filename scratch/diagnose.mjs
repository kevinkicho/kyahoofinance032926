import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.argv[2] || 'https://kevinkicho.github.io/kyahoofinance032926/';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
});
const page = await context.newPage();

const consoleErrors = [];
const networkFailures = [];
const pageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push({ text: msg.text(), location: msg.location() });
  }
});

page.on('response', resp => {
  if (!resp.ok() && resp.status() >= 400) {
    networkFailures.push({ url: resp.url(), status: resp.status(), statusText: resp.statusText() });
  }
});

page.on('pageerror', err => {
  pageErrors.push({ message: err.message, stack: err.stack?.slice(0, 500) });
});

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
// Wait a bit more for lazy-loaded content
await page.waitForTimeout(8000);

// Try clicking through market tabs to trigger more errors
const tabLinks = await page.$$('a[href*="/market/"], button[data-market], [class*="tab"], nav a');
console.log(`Found ${tabLinks.length} potential tab links`);

// Collect all errors from initial load
const report = {
  url: URL,
  timestamp: new Date().toISOString(),
  consoleErrors: consoleErrors.slice(0, 100),
  networkFailures: networkFailures.slice(0, 100),
  pageErrors: pageErrors.slice(0, 50),
  totalConsoleErrors: consoleErrors.length,
  totalNetworkFailures: networkFailures.length,
  totalPageErrors: pageErrors.length,
};

writeFileSync('/tmp/opencode/diagnosis.json', JSON.stringify(report, null, 2));
console.log(`\n=== DIAGNOSIS REPORT ===`);
console.log(`Console errors: ${consoleErrors.length}`);
console.log(`Network failures: ${networkFailures.length}`);
console.log(`Page errors: ${pageErrors.length}`);

if (consoleErrors.length > 0) {
  console.log('\n--- Top Console Errors ---');
  consoleErrors.slice(0, 20).forEach((e, i) => console.log(`${i+1}. ${e.text?.slice(0, 300)}`));
}
if (networkFailures.length > 0) {
  console.log('\n--- Top Network Failures ---');
  networkFailures.slice(0, 20).forEach((e, i) => console.log(`${i+1}. ${e.status} ${e.url?.slice(0, 200)}`));
}
if (pageErrors.length > 0) {
  console.log('\n--- Page Errors ---');
  pageErrors.slice(0, 10).forEach((e, i) => console.log(`${i+1}. ${e.message?.slice(0, 300)}`));
}

await browser.close();
