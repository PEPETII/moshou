// 图鉴横屏巡检（工单 P2）：横屏矩阵下截图图鉴三页，并检查首屏可见、溢出与栏内滚动
// 用法: node scripts/mobile-check/probe-codex.js <截图目录> [设备名...]   不给设备名则跑全部
const fs = require('fs');
const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');

const OUT = process.argv[2];
const only = process.argv.slice(3);

async function tap(page, sel, wait = 500) {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) throw new Error('找不到可见元素 ' + sel);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(wait);
}

// 当前页：关键元素是否完整落在视口内、页面是否溢出、各栏是否只在栏内滚动
function audit(page, keys) {
  return page.evaluate((keys) => {
    const iw = innerWidth, ih = innerHeight;
    const rect = (s) => { const e = document.querySelector(s); return e && e.getBoundingClientRect(); };
    const offscreen = keys.filter((s) => {
      const r = rect(s);
      return !r || r.width === 0 || r.left < -1 || r.top < -1 || r.right > iw + 1 || r.bottom > ih + 1;
    });
    const small = [...document.querySelectorAll('.ink-page:not(.hidden) button')]
      .map((b) => b.getBoundingClientRect()).filter((r) => r.width && (r.width < 43.5 || r.height < 43.5)).length;
    const cols = [...document.querySelectorAll('.ink-page:not(.hidden) .codex-split > *')]
      .map((e) => `${e.id || e.className.split(' ')[0]} ${e.scrollHeight}/${e.clientHeight}`);
    return {
      offscreen, small, cols,
      pageOverflow: document.documentElement.scrollWidth > iw || document.documentElement.scrollHeight > ih,
    };
  }, keys);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await serve();
  const browser = await launch();
  const report = [];
  for (const dev of devices.filter((d) => !only.length || only.includes(d.name))) {
    const { ctx, page, log } = await openDevice(browser, url, dev);
    const shot = (name) => page.screenshot({ path: path.join(OUT, `${dev.name}-${name}.png`) });
    const row = { device: `${dev.name} ${dev.w}x${dev.h}` };

    await tap(page, '#btn-encyclopedia');
    await shot('1-图鉴');
    row.home = await audit(page, ['#back-to-menu-from-encyclopedia', '#btn-tower-encyclopedia', '#btn-enemy-encyclopedia']);

    await tap(page, '#btn-tower-encyclopedia', 2600);   // 等书写动画写完
    await shot('2-炮塔志-火');
    row.towers = await audit(page, ['#back-to-encyclopedia-from-towers', '#tower-codex-home',
      '#tower-encyclopedia-grid .ink-item', '#tower-detail-panel .codex-glyph__canvas']);
    row.towers.selected = await page.$eval('#tower-encyclopedia-grid', (l) =>
      [...l.querySelectorAll('.ink-item')].map((i) => i.getAttribute('aria-selected')).join(','));

    await tap(page, '#tower-encyclopedia-grid .ink-item:nth-child(2)', 2600);
    await shot('3-炮塔志-水');

    await tap(page, '#back-to-encyclopedia-from-towers');
    await tap(page, '#btn-enemy-encyclopedia');
    await shot('4-妖异录');
    row.enemies = await audit(page, ['#back-to-encyclopedia-from-enemies', '#enemy-codex-home',
      '#enemy-encyclopedia-grid .ink-item', '#enemy-detail-panel .ink-stat']);

    await tap(page, '#enemy-codex-home');
    row.backHome = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.menu-buttons')).display !== 'none' &&
      document.querySelector('#enemy-encyclopedia-container').classList.contains('hidden'));

    row.errors = log.errors;
    report.push(row);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 1));
})();
