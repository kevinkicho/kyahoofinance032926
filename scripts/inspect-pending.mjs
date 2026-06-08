// Detail every .df-pending element on a tab, including its panel + ancestor source label.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
  const page = await ctx.newPage();

  for (const market of ['alerts', 'derivatives']) {
    console.log('\n=== ' + market + ' ===');
    await page.goto(`${BASE}/?market=${market}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(15000);
    const pending = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.df-pending').forEach(el => {
        const root = el.closest('.df-root');
        const label = root?.querySelector('.df-label')?.textContent?.trim() || '(no label)';
        const card = el.closest('[class*="bento-card"]');
        const cardTitle = card?.querySelector('.bento-card__title, h3, h4')?.textContent?.trim() || '(no title)';
        // Whether this is a nested DataFooter (inside a BentoCard's body, not its built-in footer slot).
        const inFooterSlot = !!el.closest('.bento-card__footer, [class*="footer"]');
        out.push({ cardTitle, label, inFooterSlot });
      });
      return out;
    });
    pending.forEach(p => console.log('  PENDING in [' + p.cardTitle + ']  label="' + p.label + '" inFooterSlot=' + p.inFooterSlot));
  }
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
