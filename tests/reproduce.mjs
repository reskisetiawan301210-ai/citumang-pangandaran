import { chromium } from 'playwright';

async function reproduce() {
  console.log('Launching browser (Edge)...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());

  // Check initial active nav
  const activeNavs = await page.$$eval('header nav a', links =>
    links.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href'), active: a.getAttribute('aria-current') === 'page', classes: a.className }))
  );
  console.log('Initial nav links:', JSON.stringify(activeNavs, null, 2));

  // Now click "Lokasi & Rute"
  console.log('\n--- CLICKING "Lokasi & Rute" ---');
  await page.evaluate(() => { window.__TEST_MARKER__ = 'survived'; });

  const lokasiLink = page.locator('header nav a:has-text("Lokasi & Rute")');
  await lokasiLink.click();

  // Wait a bit
  await page.waitForTimeout(2500);

  const markerAfter = await page.evaluate(() => window.__TEST_MARKER__).catch(() => undefined);
  console.log('Window marker after click:', markerAfter);
  if (markerAfter !== 'survived') {
    console.log('=> FULL PAGE RELOAD DETECTED! (window.__TEST_MARKER__ was lost)');
  } else {
    console.log('=> Client-side navigation (no full reload)');
  }

  console.log('Current URL after click:', page.url());
  console.log('Title after click:', await page.title());
  const h1Text = await page.locator('h1').allTextContents();
  console.log('H1s after click:', h1Text);

  const activeNavsAfter = await page.$$eval('header nav a', links =>
    links.map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href'), active: a.getAttribute('aria-current') === 'page', classes: a.className }))
  );
  console.log('Active nav links after click:', JSON.stringify(activeNavsAfter, null, 2));

  await browser.close();
}

reproduce().catch(err => {
  console.error('Reproduction error:', err);
  process.exit(1);
});
