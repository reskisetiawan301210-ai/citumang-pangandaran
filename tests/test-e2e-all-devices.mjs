import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = 'tests/screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runE2E() {
  console.log('=== RUNNING COMPREHENSIVE E2E VERIFICATION ===\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const viewports = [
    { name: 'Desktop-1440', width: 1440, height: 900, isMobile: false },
    { name: 'Tablet-768', width: 768, height: 1024, isMobile: false },
    { name: 'Mobile-390', width: 390, height: 844, isMobile: true },
    { name: 'Mobile-360', width: 360, height: 800, isMobile: true }
  ];

  let allPassed = true;

  // ----------------------------------------------------
  // TEST SUITE 1: DESKTOP DETAILED FLOW
  // ----------------------------------------------------
  console.log('--- TEST SUITE 1: DESKTOP 1440 ---');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await desktopContext.newPage();

  const consoleLogs = [];
  dPage.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  dPage.on('pageerror', err => consoleLogs.push(`[ERROR] ${err.message}`));

  // 1. Initial Load & Preloader check
  await dPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await dPage.waitForTimeout(1200); // Allow initial loader to dismiss
  const loaderHidden = await dPage.evaluate(() => {
    const el = document.getElementById('page-loader');
    return !el || el.style.display === 'none' || el.classList.contains('opacity-0');
  });
  console.log('1. Homepage loaded, preloader dismissed?', loaderHidden ? 'PASS ✓' : 'FAIL ✗');
  if (!loaderHidden) allPassed = false;

  await dPage.screenshot({ path: `${screenshotsDir}/desktop-home.png` });

  // 2. Set marker to prove Client-side navigation (No full reload)
  await dPage.evaluate(() => { window.__SPA_MARKER__ = 9999; });

  // 3. Click Header "Paket & Harga"
  await dPage.locator('header nav a:has-text("Paket & Harga")').click();
  await dPage.waitForTimeout(400);
  const m1 = await dPage.evaluate(() => window.__SPA_MARKER__);
  const url1 = dPage.url();
  const t1 = await dPage.title();
  const h1_1 = (await dPage.locator('h1').allTextContents())[0]?.trim();
  const scroll1 = await dPage.evaluate(() => window.scrollY);
  console.log('2. Navigate to /harga:');
  console.log('   Marker preserved (No reload):', m1 === 9999 ? 'PASS ✓' : 'FAIL ✗');
  console.log('   URL:', url1, url1.includes('/harga') ? 'PASS ✓' : 'FAIL ✗');
  console.log('   Title:', t1);
  console.log('   H1:', h1_1);
  console.log('   ScrollY:', scroll1, scroll1 === 0 ? 'PASS ✓' : 'FAIL ✗');
  await dPage.screenshot({ path: `${screenshotsDir}/desktop-harga.png` });

  // 4. Click Header "Lokasi & Rute"
  await dPage.locator('header nav a:has-text("Lokasi & Rute")').click();
  await dPage.waitForTimeout(400);
  const m2 = await dPage.evaluate(() => window.__SPA_MARKER__);
  const url2 = dPage.url();
  const t2 = await dPage.title();
  const h1_2 = (await dPage.locator('h1').allTextContents())[0]?.trim();
  console.log('3. Navigate to /lokasi:');
  console.log('   Marker preserved:', m2 === 9999 ? 'PASS ✓' : 'FAIL ✗');
  console.log('   URL:', url2, url2.includes('/lokasi') ? 'PASS ✓' : 'FAIL ✗');
  console.log('   Title:', t2);
  console.log('   H1:', h1_2);
  await dPage.screenshot({ path: `${screenshotsDir}/desktop-lokasi.png` });

  // 5. Click Header "Galeri"
  await dPage.locator('header nav a:has-text("Galeri")').click();
  await dPage.waitForTimeout(400);
  const m3 = await dPage.evaluate(() => window.__SPA_MARKER__);
  const url3 = dPage.url();
  const t3 = await dPage.title();
  const h1_3 = (await dPage.locator('h1').allTextContents())[0]?.trim();
  const galPhotosCount = await dPage.locator('#gallery-grid [data-gallery-index]').count();
  console.log('4. Navigate to /galeri:');
  console.log('   Marker preserved:', m3 === 9999 ? 'PASS ✓' : 'FAIL ✗');
  console.log('   URL:', url3, url3.includes('/galeri') ? 'PASS ✓' : 'FAIL ✗');
  console.log('   Title:', t3);
  console.log('   H1:', h1_3);
  console.log('   Dynamic photos loaded:', galPhotosCount, galPhotosCount >= 10 ? 'PASS ✓' : 'FAIL ✗');
  await dPage.screenshot({ path: `${screenshotsDir}/desktop-galeri.png` });

  // 6. Test Lightbox on Galeri page
  console.log('5. Testing Lightbox on Galeri...');
  const firstPhoto = dPage.locator('#gallery-grid [data-gallery-index="0"]');
  await firstPhoto.click();
  await dPage.waitForTimeout(300);
  const lightboxVisible = await dPage.locator('#lightbox-modal').isVisible();
  console.log('   Lightbox opened?', lightboxVisible ? 'PASS ✓' : 'FAIL ✗');
  // Click Next
  await dPage.locator('#lightbox-next').click();
  await dPage.waitForTimeout(200);
  const counterText = await dPage.locator('#lightbox-counter').textContent();
  console.log('   Next photo counter:', counterText);
  // Close Lightbox
  await dPage.locator('#lightbox-close').click();
  await dPage.waitForTimeout(200);
  const lightboxClosed = !(await dPage.locator('#lightbox-modal').isVisible());
  console.log('   Lightbox closed?', lightboxClosed ? 'PASS ✓' : 'FAIL ✗');

  // 7. Click Header "FAQ"
  await dPage.locator('header nav a:has-text("FAQ")').click();
  await dPage.waitForTimeout(400);
  const m4 = await dPage.evaluate(() => window.__SPA_MARKER__);
  const url4 = dPage.url();
  const t4 = await dPage.title();
  const h1_4 = (await dPage.locator('h1').allTextContents())[0]?.trim();
  const faqItems = await dPage.locator('details').count();
  console.log('6. Navigate to /faq:');
  console.log('   Marker preserved:', m4 === 9999 ? 'PASS ✓' : 'FAIL ✗');
  console.log('   URL:', url4, url4.includes('/faq') ? 'PASS ✓' : 'FAIL ✗');
  console.log('   Title:', t4);
  console.log('   H1:', h1_4);
  console.log('   FAQ questions count:', faqItems, faqItems >= 12 ? 'PASS ✓' : 'FAIL ✗');
  await dPage.screenshot({ path: `${screenshotsDir}/desktop-faq.png` });

  // 8. Test FAQ Accordion / Details toggle
  console.log('7. Testing FAQ accordion toggle...');
  const secondFaq = dPage.locator('details').nth(1);
  const secondSummary = secondFaq.locator('summary');
  const wasOpenInitially = await secondFaq.evaluate(el => el.open);
  await secondSummary.click();
  await dPage.waitForTimeout(200);
  const isOpenAfterClick = await secondFaq.evaluate(el => el.open);
  console.log('   FAQ Q2 toggled from closed to open?', !wasOpenInitially && isOpenAfterClick ? 'PASS ✓' : 'FAIL ✗');

  // 9. Click Logo to return to Home
  console.log('8. Clicking Logo to return to / ...');
  await dPage.locator('header a:has(img[alt*="Logo"])').first().click();
  await dPage.waitForTimeout(400);
  const m5 = await dPage.evaluate(() => window.__SPA_MARKER__);
  const homeUrl = dPage.url();
  console.log('   Returned to home?', homeUrl === 'http://localhost:3000/' ? 'PASS ✓' : 'FAIL ✗');
  console.log('   Marker preserved:', m5 === 9999 ? 'PASS ✓' : 'FAIL ✗');
  const activeLinkHome = await dPage.$$eval('header nav a', links =>
    links.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.textContent.trim())
  );
  console.log('   Active nav on Home:', activeLinkHome, activeLinkHome.length === 1 && activeLinkHome[0] === 'Beranda' ? 'PASS (Strict single active) ✓' : 'FAIL ✗');

  // 10. Test Reservation Modal
  console.log('9. Testing Reservation Modal...');
  const resBtn = dPage.locator('header button[data-action="reservation"]').first();
  await resBtn.click();
  await dPage.waitForTimeout(300);
  const modalVisible = await dPage.locator('#reservation-modal').isVisible();
  console.log('   Modal opened?', modalVisible ? 'PASS ✓' : 'FAIL ✗');

  // Submit empty to verify error validation
  await dPage.locator('#reservation-form button[type="submit"]').click();
  await dPage.waitForTimeout(200);
  const nameError = await dPage.locator('#res-name-error').textContent();
  console.log('   Name validation triggered?', nameError.length > 0 ? 'PASS ✓' : 'FAIL ✗');

  // Fill form
  await dPage.locator('#res-name').fill('Budi Santoso');
  await dPage.locator('#res-phone').fill('081234567890');
  await dPage.screenshot({ path: `${screenshotsDir}/desktop-reservation-modal.png` });

  // Close modal with button
  await dPage.locator('#close-reservation-btn').click();
  await dPage.waitForTimeout(200);
  const modalClosed = !(await dPage.locator('#reservation-modal').isVisible());
  console.log('   Modal closed?', modalClosed ? 'PASS ✓' : 'FAIL ✗');

  // 11. Test Footer Links
  console.log('10. Testing Footer Links...');
  // Kebijakan Privasi
  await dPage.locator('footer a:has-text("Kebijakan Privasi")').click();
  await dPage.waitForTimeout(400);
  console.log('   Footer -> Kebijakan Privasi URL:', dPage.url(), dPage.url().includes('/kebijakan-privasi') ? 'PASS ✓' : 'FAIL ✗');

  // Syarat & Ketentuan
  await dPage.locator('footer a:has-text("Syarat & Ketentuan")').click();
  await dPage.waitForTimeout(400);
  console.log('   Footer -> Syarat & Ketentuan URL:', dPage.url(), dPage.url().includes('/syarat-ketentuan') ? 'PASS ✓' : 'FAIL ✗');

  // 12. Test Browser Back and Forward
  console.log('11. Testing Browser Back & Forward...');
  await dPage.goBack();
  await dPage.waitForTimeout(300);
  console.log('   After Back URL:', dPage.url(), dPage.url().includes('/kebijakan-privasi') ? 'PASS ✓' : 'FAIL ✗');
  await dPage.goForward();
  await dPage.waitForTimeout(300);
  console.log('   After Forward URL:', dPage.url(), dPage.url().includes('/syarat-ketentuan') ? 'PASS ✓' : 'FAIL ✗');

  await desktopContext.close();

  // ----------------------------------------------------
  // TEST SUITE 2: MOBILE VIEWPORT (390 & 360)
  // ----------------------------------------------------
  for (const vp of [viewports[2], viewports[3]]) {
    console.log(`\n--- TEST SUITE: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const mContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true });
    const mPage = await mContext.newPage();

    await mPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await mPage.waitForTimeout(800);

    // Check no horizontal scroll overflow
    const hasHorizontalOverflow = await mPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`1. Horizontal overflow on ${vp.name}?`, !hasHorizontalOverflow ? 'NONE (PASS ✓)' : 'OVERFLOW DETECTED (FAIL ✗)');

    // Hamburger Menu Toggle
    const burger = mPage.locator('#mobile-menu-toggle');
    await burger.click();
    await mPage.waitForTimeout(300);
    const drawerOpen = await mPage.locator('#mobile-menu').isVisible();
    console.log('2. Mobile drawer opened?', drawerOpen ? 'PASS ✓' : 'FAIL ✗');
    await mPage.screenshot({ path: `${screenshotsDir}/${vp.name}-drawer-open.png` });

    // Click "Paket & Harga" in mobile drawer
    await mPage.locator('#mobile-menu a:has-text("Paket & Harga")').click();
    await mPage.waitForTimeout(400);
    const drawerClosed = !(await mPage.locator('#mobile-menu').isVisible());
    const mUrl = mPage.url();
    const mScroll = await mPage.evaluate(() => window.scrollY);
    console.log('3. Mobile Nav -> /harga:');
    console.log('   Drawer auto-closed?', drawerClosed ? 'PASS ✓' : 'FAIL ✗');
    console.log('   URL:', mUrl, mUrl.includes('/harga') ? 'PASS ✓' : 'FAIL ✗');
    console.log('   Scroll top:', mScroll, mScroll === 0 ? 'PASS ✓' : 'FAIL ✗');
    await mPage.screenshot({ path: `${screenshotsDir}/${vp.name}-harga.png` });

    // Test Mobile Floating WhatsApp / Reservation Button
    const waFloating = mPage.locator('[aria-label*="WhatsApp"]').first();
    const isFloatingVisible = await waFloating.isVisible();
    console.log('4. Floating WA button visible?', isFloatingVisible ? 'PASS ✓' : 'FAIL ✗');
    await waFloating.click();
    await mPage.waitForTimeout(300);
    const mModalOpen = await mPage.locator('#reservation-modal').isVisible();
    console.log('   Clicking floating WA button opens modal?', mModalOpen ? 'PASS ✓' : 'FAIL ✗');
    await mPage.locator('#close-reservation-btn').first().click();
    await mPage.waitForTimeout(200);

    await mContext.close();
  }

  // ----------------------------------------------------
  // TEST SUITE 3: CONSOLE ERRORS CHECK
  // ----------------------------------------------------
  const severeErrors = consoleLogs.filter(l => l.includes('[ERROR]') || l.includes('Uncaught'));
  console.log('\n--- CONSOLE ERRORS SUMMARY ---');
  console.log('Total console logs captured:', consoleLogs.length);
  console.log('Severe errors count:', severeErrors.length);
  if (severeErrors.length > 0) {
    console.log('Errors:', severeErrors);
  }

  await browser.close();
  console.log('\n=== E2E TESTING COMPLETE ===');
}

runE2E().catch(err => {
  console.error('E2E runner crashed:', err);
  process.exit(1);
});
