import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=globalMacro', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(22000);
const out = await page.evaluate(() => {
  const wrapper = document.querySelector('.react-grid-layout');
  if (!wrapper) return { error: 'no react-grid-layout found' };
  return Array.from(wrapper.children).map(item => ({
    title: item.querySelector('.bento-panel-title, h3')?.textContent?.slice(0, 40),
    cls: item.className,
    style: item.getAttribute('style'),
    width: item.getBoundingClientRect().width,
  }));
});
out.forEach((it, i) => console.log(i, '"' + (it.title || '') + '"', 'w='+Math.round(it.width), 'style='+(it.style||'').slice(0,120)));
await browser.close();
