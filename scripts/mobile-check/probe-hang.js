// 外链字体请求挂起（模拟弱网或外链不可达）时，首屏是否仍能正常进入主菜单
const devices = require('./devices');
const { serve, launch } = require('./harness');
(async () => {
  const { server, url } = await serve();
  const b = await launch();
  const dev = devices[0];
  const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, () => { /* 永不响应 */ });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('loading-container').classList.contains('hidden'), null, { timeout: 20000 }).catch(() => console.log('加载页 20s 仍未消失'));
  console.log('进入主菜单耗时', Date.now() - t0, 'ms；菜单可见:', await page.evaluate(() => !!document.querySelector('.menu-btn') && getComputedStyle(document.getElementById('main-menu')).display !== 'none'));
  await b.close(); server.close();
})();
