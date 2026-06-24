const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Failed to connect to 5173, trying 3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 15000 });
  }

  console.log('Waiting for market tabs to load...');
  await page.waitForSelector('.market-tab-wrapper', { timeout: 10000 });
  
  const wrappers = await page.$$('.market-tab-wrapper');
  console.log(`Found ${wrappers.length} market tabs.`);
  
  // Find a tab that has a dropdown (e.g. Real Estate usually has panels)
  // Let's just hover over the second or third tab (Derivatives or Real Estate)
  let foundDropdown = false;
  for (let i = 0; i < wrappers.length; i++) {
    const wrapper = wrappers[i];
    const button = await wrapper.$('button');
    const label = await button.innerText();
    
    console.log(`\nHovering over tab: ${label}...`);
    // Scroll into view and hover the wrapper
    await wrapper.hover();
    
    // Wait a brief moment for CSS hover to apply
    await page.waitForTimeout(500);
    
    // Check if dropdown is visible inside this wrapper
    const dropdown = await wrapper.$('.market-panel-dropdown');
    if (dropdown) {
      const isVisible = await dropdown.isVisible();
      console.log(`Dropdown element exists. Is visible? ${isVisible}`);
      if (isVisible) {
        foundDropdown = true;
        const text = await dropdown.innerText();
        console.log(`Dropdown contents:\n${text.trim().split('\n')[0]}`); // Print header
      }
    } else {
      console.log('No dropdown element in this tab.');
    }
  }

  if (!foundDropdown) {
    console.log('\n❌ ERROR: No dropdown became visible on hover across all tabs!');
    
    // Let's capture CSS to debug
    const displayStyle = await page.evaluate(() => {
      const el = document.querySelector('.market-panel-dropdown');
      if (!el) return 'No dropdown found in DOM';
      return window.getComputedStyle(el).display;
    });
    console.log(`Current computed display for first dropdown: ${displayStyle}`);
  } else {
    console.log('\n✅ SUCCESS: Dropdowns are appearing on hover!');
  }

  await browser.close();
})();
