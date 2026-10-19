// 冒烟自检：无头打开原型，强制满蓄放两个大招，截图并抽样统计，输出控制台报错
// 用法（在本目录的上一级执行）：
//   npm i -D playwright && npx playwright install chromium
//   node tools/smoke-test.js
// 已有 Chromium 时可设置 CHROMIUM_PATH 环境变量跳过下载。
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const opts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const out = path.resolve(__dirname, 'out');
  require('fs').mkdirSync(out, { recursive: true });
  await page.goto(url);
  await page.waitForTimeout(2500);
  const stage = await page.$('#stage');
  await stage.screenshot({ path: path.join(out, '1-开场.png') });

  await page.evaluate(() => Towers.list.forEach((t) => { t.charge = 1; }));
  await page.keyboard.press('q');
  await page.waitForTimeout(800);
  await stage.screenshot({ path: path.join(out, '2-焚.png') });
  await page.keyboard.press('w');
  await page.waitForTimeout(500);
  await stage.screenshot({ path: path.join(out, '3-潮.png') });

  await page.click('#cast-auto');
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(5000);
    const s = await page.evaluate(() => ({
      击杀: World.kills, 场上: World.enemies.length, 漏过: World.leaks,
      火蓄力: Towers.get('fire').charge.toFixed(2), 水蓄力: Towers.get('water').charge.toFixed(2),
    }));
    console.log(JSON.stringify(s));
  }
  console.log(errors.length ? '控制台报错：\n' + errors.join('\n') : '控制台零报错');
  console.log('截图已写入 ' + out);
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
