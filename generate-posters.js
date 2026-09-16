const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const W = 1920, H = 1080;
const DIR = path.join(__dirname, 'store-posters');

async function screenshot(browser, htmlFile, pngFile) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.title.includes('ready'), { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: pngFile,
    type: 'png',
    clip: { x: 0, y: 0, width: W, height: H },
    omitBackground: false
  });
  const sz = fs.statSync(pngFile).size;
  console.log(`  ✅ ${path.basename(pngFile)} (${(sz / 1024).toFixed(1)} KB)`);
  await page.close();
}

async function main() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

  console.log('🎨 Generating posters for 《墨守成规》 (' + W + '×' + H + ')...\n');

  const browser = await chromium.launch();

  try {
    await screenshot(browser, path.join(DIR, 'poster1.html'), path.join(DIR, 'poster1-tower-defense.png'));
    await screenshot(browser, path.join(DIR, 'poster2.html'), path.join(DIR, 'poster2-fusion-system.png'));
    await screenshot(browser, path.join(DIR, 'poster3.html'), path.join(DIR, 'poster3-conquest-mode.png'));
  } finally {
    await browser.close();
  }

  console.log('\n🎉 All done! Files in: store-posters/');
}

main().catch(console.error);
