// Quick verification that the 4 Tier-1 panels are present in the DOM and rendering data.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const SETTLE = 12000;

async function checkTab(page, market, expectedPanels) {
  console.log(`\n=== ${market} ===`);
  await page.goto(`${BASE}/?market=${market}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE);

  for (const expected of expectedPanels) {
    const found = await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('[class*="bento-card"]'));
      for (const c of cards) {
        const h = c.querySelector('.bento-card__title, [class*="bento"][class*="title"], h3, h4');
        if (h && h.textContent && h.textContent.toLowerCase().includes(title.toLowerCase())) {
          // Count any meaningful child text
          const text = c.textContent || '';
          const badge = c.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data');
          const badgeText = badge?.textContent?.trim() || 'none';
          // ECharts canvas presence
          const hasChart = !!c.querySelector('canvas, svg.echarts-svg, .echarts-for-react');
          return { found: true, badgeText, hasChart, textLen: text.length };
        }
      }
      return { found: false };
    }, expected);

    if (found.found) {
      console.log(`  ✓ "${expected}" — badge=${found.badgeText} chart=${found.hasChart} chars=${found.textLen}`);
    } else {
      console.log(`  ✗ "${expected}" NOT FOUND`);
    }
  }

  // Take a clipped screenshot of just the bottom portion of bento layout
  // Scroll every scrollable container all the way down.
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 5) el.scrollTop = el.scrollHeight;
    });
  });
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch();
  // Tall viewport so the full bento grid is visible without scrolling.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
  const page = await ctx.newPage();

  page.on('pageerror', e => console.log(`  [pageerror] ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console.error] ${m.text()}`); });

  await checkTab(page, 'bonds', ['Foreign Holders', 'Money Market']);

  // Bonds: scroll to bottom and capture
  await page.goto(`${BASE}/?market=bonds`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE);
  // Scroll every scrollable container all the way down.
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 5) el.scrollTop = el.scrollHeight;
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/tier1-bonds-bottom.png', fullPage: false });

  await checkTab(page, 'credit', ['Banking Sector']);
  await page.goto(`${BASE}/?market=credit`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE);
  // Scroll every scrollable container all the way down.
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 5) el.scrollTop = el.scrollHeight;
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/tier1-credit-bottom.png', fullPage: false });

  await checkTab(page, 'globalMacro', ['Euro Area']);
  await page.goto(`${BASE}/?market=globalMacro`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE);
  // Scroll every scrollable container all the way down.
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 5) el.scrollTop = el.scrollHeight;
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/tier1-macro-bottom.png', fullPage: false });

  await browser.close();
  console.log('\nDone. Screenshots: /tmp/tier1-*-bottom.png');
}

main().catch(e => { console.error(e); process.exit(1); });
