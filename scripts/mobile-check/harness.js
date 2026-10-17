// 手机横屏模拟：打开游戏并收集报错/失败请求
const { serve, launch } = require('../store-assets/lib');

const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

async function openDevice(browser, url, dev, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.dpr,
    isMobile: true, hasTouch: true, userAgent: UA[dev.ua],
  });
  if (opts.blockFonts) await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const log = { errors: [], failed: [] };
  page.on('pageerror', (e) => log.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => log.failed.push('failed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  page.on('response', (r) => { if (r.status() >= 400) log.failed.push(r.status() + ' ' + r.url()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const i = dev.insets;
  await page.evaluate((i) => {
    const s = document.documentElement.style;
    s.setProperty('--sal', i.l + 'px'); s.setProperty('--sar', i.r + 'px');
    s.setProperty('--sat', i.t + 'px'); s.setProperty('--sab', i.b + 'px');
    window.dispatchEvent(new Event('resize'));
  }, i);
  await page.waitForTimeout(500);
  return { ctx, page, log };
}

// 真实触摸（CDP）：产生 pointerType=touch 的事件
async function touchDrag(page, from, to, steps = 14) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps) });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

module.exports = { serve, launch, openDevice, touchDrag };
