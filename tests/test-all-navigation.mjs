import { chromium } from 'playwright';

async function testAllNavigation() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMessages.push(`[ERROR] ${err.message}`));

  console.log('=== TEST ALL NAVIGATION (CURRENT STATE) ===\n');

  // Test 1: Load Homepage
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  console.log('1. Homepage loaded:');
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  console.log('   H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));

  // Test 2: Click "Paket & Harga"
  console.log('\n2. Clicking "Paket & Harga"...');
  await page.evaluate(() => { window.__STAYED__ = true; });
  await page.locator('header nav a:has-text("Paket & Harga")').click();
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  console.log('   H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));
  console.log('   Client-side preserved?', await page.evaluate(() => window.__STAYED__));
  let actives = await page.$$eval('header nav a', links =>
    links.filter(a => a.getAttribute('aria-current') === 'page' || a.className.includes('bg-primary-container')).map(a => a.textContent.trim())
  );
  console.log('   Active links:', actives);

  // Test 3: Click "Lokasi & Rute"
  console.log('\n3. Clicking "Lokasi & Rute"...');
  await page.evaluate(() => { window.__STAYED__ = true; });
  await page.locator('header nav a:has-text("Lokasi & Rute")').click();
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  console.log('   H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));
  console.log('   Client-side preserved?', await page.evaluate(() => window.__STAYED__));
  actives = await page.$$eval('header nav a', links =>
    links.filter(a => a.getAttribute('aria-current') === 'page' || a.className.includes('bg-primary-container')).map(a => a.textContent.trim())
  );
  console.log('   Active links:', actives);

  // Test 4: Click "Galeri"
  console.log('\n4. Clicking "Galeri"...');
  await page.evaluate(() => { window.__STAYED__ = true; });
  await page.locator('header nav a:has-text("Galeri")').click();
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  console.log('   H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));
  console.log('   ScrollY:', await page.evaluate(() => window.scrollY));
  console.log('   Client-side preserved?', await page.evaluate(() => window.__STAYED__));
  actives = await page.$$eval('header nav a', links =>
    links.filter(a => a.getAttribute('aria-current') === 'page' || a.className.includes('bg-primary-container')).map(a => a.textContent.trim())
  );
  console.log('   Active links:', actives);

  // Test 5: Click "FAQ"
  console.log('\n5. Clicking "FAQ"...');
  await page.evaluate(() => { window.__STAYED__ = true; });
  await page.locator('header nav a:has-text("FAQ")').click();
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  console.log('   Title:', await page.title());
  console.log('   H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));
  console.log('   Client-side preserved?', await page.evaluate(() => window.__STAYED__));
  actives = await page.$$eval('header nav a', links =>
    links.filter(a => a.getAttribute('aria-current') === 'page' || a.className.includes('bg-primary-container')).map(a => a.textContent.trim())
  );
  console.log('   Active links:', actives);

  // Test 6: Direct URL visits
  console.log('\n6. Direct visit http://localhost:3000/harga ...');
  await page.goto('http://localhost:3000/harga', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  console.log('   Direct /harga Title:', await page.title());
  console.log('   Direct /harga H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));

  console.log('\n7. Direct visit http://localhost:3000/harga/index.html ...');
  await page.goto('http://localhost:3000/harga/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  console.log('   Direct /harga/index.html Title:', await page.title());
  console.log('   Direct /harga/index.html H1:', (await page.locator('h1').allTextContents()).map(s => s.trim()));

  await browser.close();
}

testAllNavigation().catch(err => {
  console.error(err);
  process.exit(1);
});

