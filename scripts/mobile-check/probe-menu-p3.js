// 主菜单 / 设置 / 选关横屏巡检（工单 P3）：截图 + 首屏可见、溢出、触控尺寸 + 设置同步与入境回归
// 用法: node scripts/mobile-check/probe-menu-p3.js <截图目录> [设备名...]   不给设备名则跑全部
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

// keys：必须完整落在视口内的元素；scope：统计小于 44px 按钮的范围
function audit(page, keys, scope) {
  return page.evaluate(({ keys, scope }) => {
    const iw = innerWidth, ih = innerHeight;
    const offscreen = keys.filter((s) => {
      const e = document.querySelector(s);
      const r = e && e.getBoundingClientRect();
      return !r || r.width === 0 || r.left < -1 || r.top < -1 || r.right > iw + 1 || r.bottom > ih + 1;
    });
    const small = [...document.querySelectorAll(scope + ' button')]
      .filter((b) => b.offsetParent && getComputedStyle(b).display !== 'none')
      .map((b) => [b, b.getBoundingClientRect()])
      .filter(([, r]) => r.width && (r.width < 43.5 || r.height < 43.5))
      .map(([b, r]) => `${b.id || b.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const scrollers = [...document.querySelectorAll(scope + ' *')]
      .filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1)
      .map((e) => `${e.id || e.className.toString().split(' ')[0]} ${e.scrollHeight}/${e.clientHeight}`);
    return { offscreen, small, scrollers,
      pageOverflow: document.documentElement.scrollWidth > iw || document.documentElement.scrollHeight > ih };
  }, { keys, scope });
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
    await page.waitForTimeout(900); // 等题名与入口的入场动画
    await shot('1-主菜单');
    row.menu = await audit(page, ['#main-menu-title', '#btn-levels', '#btn-conquest', '#btn-encyclopedia', '#btn-settings'], '#main-menu .menu-stage');

    await tap(page, '#btn-settings');
    await shot('2-设置');
    row.settings = await audit(page, ['#back-to-menu-from-settings', '[data-settings-host="menu"] [data-setting="shake"]',
      '[data-settings-host="menu"] [data-volume="bgm"]'], '#settings-container');
    await tap(page, '[data-settings-host="menu"] [data-setting="shake"]', 200);
    row.settingsSync = await page.evaluate(() => ({
      battleShake: document.querySelector('[data-settings-host="battle"] [data-setting="shake"]').getAttribute('aria-checked'),
      stored: localStorage.getItem('moshou_screen_shake'),
      glyph: GlyphFX.shakeEnabled,
    }));
    await tap(page, '[data-settings-host="menu"] [data-setting="shake"]', 200); // 复原
    await tap(page, '#back-to-menu-from-settings');

    await tap(page, '#btn-levels');
    await shot('3-塔防择卷');
    row.tdThemes = await audit(page, ['#back-to-menu', '#td-theme-shelf .scroll-theme'], '#theme-select-container');
    await tap(page, '#td-theme-shelf .scroll-theme');
    await shot('4-塔防长卷');
    row.tdLevels = await audit(page, ['#back-to-themes', '#td-level-scroll .scroll-node', '#enter-level'], '#level-list-container');
    await tap(page, '#td-level-scroll .scroll-node:nth-child(2)', 300);
    await tap(page, '#enter-level', 1500);
    row.tdEnter = await page.evaluate(() => !document.getElementById('main-container').classList.contains('hidden'));

    // 战斗内：暂停 → 设置，确认与主菜单同一组件
    await page.evaluate(() => document.getElementById('density-picker-ok')?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('pause-btn').click());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('pause-settings').click());
    await page.waitForTimeout(300);
    await shot('5-战斗设置');
    row.battleSettingsItems = await page.evaluate(() =>
      document.querySelectorAll('[data-settings-host="battle"] .settings-switch').length);
    await page.evaluate(() => { document.getElementById('settings-back').click(); document.getElementById('pause-return').click(); });
    await page.waitForTimeout(600);

    await tap(page, '#btn-conquest');
    await shot('6-征服择卷');
    row.cqThemes = await audit(page, ['#back-to-menu-from-conquest-theme', '#cq-theme-shelf .scroll-theme'], '#conquest-theme-select-container');
    await tap(page, '#cq-theme-shelf .scroll-theme');
    await shot('7-征服长卷');
    row.cqLevels = await audit(page, ['#back-to-conquest-themes', '#cq-level-scroll .scroll-node', '#conquest-enter-level'], '#conquest-level-select-container');
    await tap(page, '#back-to-conquest-themes');
    await tap(page, '#back-to-menu-from-conquest-theme');
    row.backHome = await page.evaluate(() => getComputedStyle(document.querySelector('.menu-buttons')).display !== 'none');

    row.errors = log.errors.filter((e) => !/ERR_PROXY|fonts\.g/.test(e));
    report.push(row);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 1));
})();
