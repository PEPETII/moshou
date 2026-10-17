// 对解压后的 H5 包做冒烟测试：手机横屏进入主菜单 → 塔防 → 战斗，无报错、无 404
const path = require('path');
const http = require('http');
const fs = require('fs');
const { launch } = require('../store-assets/lib');
const devices = require('./devices');
const root = path.resolve(process.argv[2]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
(async () => {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(root, p === '/' ? 'index.html' : p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { console.log('404', req.url); res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const b = await launch();
  let fail = 0;
  for (const dev of devices) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.dpr, isMobile: true, hasTouch: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());   // 模拟字体外链不可达
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const b1 = await page.locator('#btn-levels').boundingBox();
    await page.touchscreen.tap(b1.x + b1.width / 2, b1.y + b1.height / 2); await page.waitForTimeout(700);
    await page.evaluate(() => window.gameInstance.startGame('1-1'));
    await page.waitForFunction(() => !window.gameInstance.inkTrailAnimation.active, null, { timeout: 30000 });
    await page.evaluate(() => { window.gameInstance.startWave(); });
    await page.waitForTimeout(3000);
    const state = await page.evaluate(() => ({ wave: window.gameInstance.wave, enemies: window.gameInstance.enemies.length }));
    const okRun = state.wave === 1 && errs.length === 0;
    if (!okRun) fail++;
    console.log((okRun ? '  OK  ' : ' FAIL ') + dev.name, JSON.stringify(state), errs.join(' | '));
    await ctx.close();
  }
  await b.close(); server.close();
  process.exit(fail ? 1 : 0);
})();
