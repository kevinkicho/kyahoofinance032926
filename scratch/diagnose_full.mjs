import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.argv[2] || 'https://kevinkicho.github.io/kyahoofinance032926/';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
});
const page = await context.newPage();

const allConsoleErrors = [];
const allNetworkFailures = [];
const allPageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    allConsoleErrors.push({ text: msg.text(), location: msg.location() });
  }
});

page.on('response', resp => {
  if (!resp.ok() && resp.status() >= 400) {
    allNetworkFailures.push({ url: resp.url(), status: resp.status(), statusText: resp.statusText() });
  }
});

page.on('pageerror', err => {
  allPageErrors.push({ message: err.message, stack: err.stack?.slice(0, 500) });
});

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

// Collect initial load errors
const initialConsole = [...allConsoleErrors];
const initialNetwork = [...allNetworkFailures];
const initialPage = [...allPageErrors];

// Now click through all market tabs
const marketTabs = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia'
];

for (const tab of marketTabs) {
  // Try clicking links that contain the tab name
  const link = await page.$(`a[href*="/market/${tab}"], a[href*="${tab}"], [data-market="${tab}"]`);
  if (link) {
    console.log(`Clicking tab: ${tab}`);
    await link.click();
    await page.waitForTimeout(4000);
  } else {
    // Try finding by text
    const textLink = await page.$(`text="${tab}"`);
    if (textLink) {
      console.log(`Clicking tab by text: ${tab}`);
      await textLink.click();
      await page.waitForTimeout(4000);
    }
  }
}

// Deduplicate errors by text
const seen = new Set();
const uniqueConsole = allConsoleErrors.filter(e => {
  const key = e.text?.slice(0, 200);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const report = {
  url: URL,
  timestamp: new Date().toISOString(),
  initialLoad: {
    consoleErrors: initialConsole.length,
    networkFailures: initialNetwork.length,
    pageErrors: initialPage.length,
  },
  totalAfterAllTabs: {
    consoleErrors: allConsoleErrors.length,
    networkFailures: allNetworkFailures.length,
    pageErrors: allPageErrors.length,
  },
  uniqueConsoleErrors: uniqueConsole.slice(0, 50),
  uniqueNetworkFailures: [...new Set(allNetworkFailures.map(f => `${f.status} ${f.url}`))].slice(0, 30),
  pageErrors: allPageErrors.slice(0, 20),
};

writeFileSync('/tmp/opencode/diagnosis_full.json', JSON.stringify(report, null, 2));

console.log(`\n=== FULL DIAGNOSIS ===`);
console.log(`Initial load: ${initialConsole.length} console errors, ${initialNetwork.length} network failures`);
console.log(`After all tabs: ${allConsoleErrors.length} console errors, ${allNetworkFailures.length} network failures`);
console.log(`Unique console errors: ${uniqueConsole.length}`);
console.log(`Page errors: ${allPageErrors.length}`);

console.log('\n--- Unique Console Errors ---');
uniqueConsole.forEach((e, i) => console.log(`${i+1}. ${e.text?.slice(0, 300)}`));

console.log('\n--- Unique Network Failures ---');
[...new Set(allNetworkFailures.map(f => `${f.status} ${f.url}`))].forEach((e, i) => console.log(`${i+1}. ${e}`));

if (allPageErrors.length > 0) {
  console.log('\n--- Page Errors ---');
  allPageErrors.forEach((e, i) => console.log(`${i+1}. ${e.message?.slice(0, 300)}`));
}

await browser.close();
