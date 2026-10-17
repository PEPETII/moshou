// 渲染 16:9 宣传图（HTML/SVG 水墨合成，仅含游戏标题）→ 2560x1440 PNG
const fs = require('fs');
const path = require('path');
const { launch, OUT } = require('./lib');

(async () => {
  const dir = path.join(OUT, '宣传图');
  fs.mkdirSync(dir, { recursive: true });
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2560 / 1920 });
  const page = await ctx.newPage();
  await page.goto('file:///' + path.join(__dirname, 'promo', 'promo.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const file = path.join(dir, '墨守成规-宣传图-16x9.png');
  await page.screenshot({ path: file });
  console.log('saved', file, (fs.statSync(file).size / 1024).toFixed(0) + 'KB');
  await b.close();
})();
