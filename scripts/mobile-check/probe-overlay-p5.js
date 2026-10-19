// 弹窗与转场巡检（工单 P5）：胜负弹窗各情形的按钮组、尺寸与点击后的流程；择潮 / 暂停面板；转场动画开关。
// 用法: node scripts/mobile-check/probe-overlay-p5.js <截图目录> [设备名...]   不给设备名则跑全部
// 会直接调用 gameOver 并写入本地进度，只应在 Playwright 的临时浏览器环境中运行。
const fs = require('fs');
const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice } = require('./harness');

const OUT = process.argv[2];
const only = process.argv.slice(3);
const wait = (page, ms) => page.waitForTimeout(ms);

function modalState(page) {
  return page.evaluate(() => {
    const iw = innerWidth, ih = innerHeight;
    const box = document.getElementById('modal-content').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('#modal-actions button')];
    return {
      visible: !document.getElementById('modal').classList.contains('hidden'),
      inView: box.left >= -1 && box.top >= -1 && box.right <= iw + 1 && box.bottom <= ih + 1,
      labels: buttons.map((b) => (b.classList.contains('ink-btn--primary') ? `[${b.textContent}]` : b.textContent)).join(' '),
      small: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).length,
      stars: [...document.querySelectorAll('#modal-stars .modal-star')].map((s) => (s.classList.contains('is-lit') ? 1 : 0)).join(''),
    };
  });
}

const press = (page, label) => page.evaluate((label) => {
  [...document.querySelectorAll('#modal-actions button')].find((b) => b.textContent === label).click();
}, label);

async function startTd(page, levelIndex = 0) {
  await page.evaluate(async (i) => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    document.getElementById('btn-levels').click(); await w(250);
    document.querySelector('#td-theme-shelf .scroll-theme').click(); await w(250);
    document.querySelectorAll('#td-level-scroll .scroll-node')[i].click(); await w(100);
    document.getElementById('enter-level').click(); await w(900);
    document.getElementById('density-picker-ok').click(); await w(300);
  }, levelIndex);
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
    const g = (fn) => page.evaluate(fn);

    // 转场：页面出现时有墨晕动画
    await page.evaluate(() => document.getElementById('btn-settings').click());
    row.bloom = await g(() => getComputedStyle(document.getElementById('settings-container')).animationName);
    await page.evaluate(() => document.getElementById('back-to-menu-from-settings').click());

    // 塔防：择潮面板
    await page.evaluate(async () => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms));
      document.getElementById('btn-levels').click(); await w(250);
      document.querySelector('#td-theme-shelf .scroll-theme').click(); await w(250);
      document.getElementById('enter-level').click(); await w(900);
    });
    await wait(page, 400);
    await shot('1-择潮');
    row.density = await g(() => {
      const r = document.getElementById('density-picker-box').getBoundingClientRect();
      return r.bottom <= innerHeight + 1 && r.top >= -1 ? 'ok' : 'out';
    });
    await g(() => document.getElementById('density-picker-ok').click());
    await wait(page, 300);

    // 塔防胜利（三星）→ 下一关
    await g(() => { const x = window.gameInstance; x.coreHp = x.maxCoreHp; x.gameOver(true); });
    await wait(page, 700);
    await shot('2-塔防胜');
    row.tdWin = await modalState(page);
    await press(page, '下一关');
    await wait(page, 600);
    row.afterNext = await g(() => window.gameInstance.currentLevel);
    await g(() => document.getElementById('density-picker-ok')?.click());

    // 末关胜利（一星）→ 选关
    await g(() => { const x = window.gameInstance; x.coreHp = 1; x.gameOver(true); });
    await wait(page, 500);
    row.tdLastWin = await modalState(page);
    await press(page, '选关');
    await wait(page, 500);
    row.afterSelect = await g(() => !document.getElementById('level-list-container').classList.contains('hidden'));

    // 失败 → 重来，再失败 → 主菜单
    await startTd(page, 0);
    await g(() => window.gameInstance.gameOver(false));
    await wait(page, 500);
    await shot('3-塔防破');
    row.tdLose = await modalState(page);
    await press(page, '重来');
    await wait(page, 600);
    row.afterRetry = await g(() => window.gameInstance.currentLevel + ' ended=' + window.gameInstance.gameEnded);
    await g(() => document.getElementById('density-picker-ok')?.click());
    await g(() => window.gameInstance.gameOver(false));
    await wait(page, 400);
    await press(page, '主菜单');
    await wait(page, 500);
    row.afterMenu = await g(() => getComputedStyle(document.querySelector('.menu-buttons')).display);

    // 暂停面板
    await startTd(page, 0);
    await g(() => document.getElementById('pause-btn').click());
    await wait(page, 400);
    await shot('4-暂停');
    row.pauseSmall = await g(() => [...document.querySelectorAll('#battle-pause button')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).length);
    await g(() => document.getElementById('pause-return').click());
    await wait(page, 500);

    // 征服胜 / 破
    await page.evaluate(async () => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms));
      document.getElementById('btn-conquest').click(); await w(250);
      document.querySelector('#cq-theme-shelf .scroll-theme').click(); await w(250);
      document.getElementById('conquest-enter-level').click(); await w(900);
      document.getElementById('density-picker-ok')?.click(); await w(300);
    });
    row.cqState = await g(() => ({ cg: typeof window.conquestGame, shown: !document.getElementById('conquest-container').classList.contains('hidden'), menuHidden: document.getElementById('main-menu').classList.contains('hidden') }));
    await g(() => window.conquestGame.gameOver(true));
    await wait(page, 600);
    await shot('5-征服胜');
    row.cqWin = await modalState(page);
    await press(page, '重来');
    await wait(page, 600);
    row.cqAfterRetry = await g(() => window.conquestGame.currentLevelId + ' ended=' + window.conquestGame.gameEnded);
    await g(() => document.getElementById('density-picker-ok')?.click());
    await g(() => window.conquestGame.gameOver(false));
    await wait(page, 500);
    row.cqLose = await modalState(page);
    await press(page, '选关');
    await wait(page, 500);
    row.cqAfterSelect = await g(() => !document.getElementById('conquest-level-select-container').classList.contains('hidden'));

    // 减少动效：页面不再有转场动画
    await g(() => { document.documentElement.dataset.inkMotion = 'reduced'; document.getElementById('back-to-conquest-themes').click(); });
    row.reducedBloom = await g(() => getComputedStyle(document.getElementById('conquest-theme-select-container')).animationName);

    row.errors = log.errors.filter((e) => !/ERR_PROXY|fonts\.g/.test(e));
    report.push(row);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 1));
})();
