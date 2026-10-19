// 战斗横屏巡检（工单 P4）：缩放率、HUD / 卡槽 / 竖条是否越界、按钮真实尺寸、
// 真实触摸从卡槽拖卡出塔、镜头余量、暂停设置弹层尺寸、征服召唤费用实时更新。
// 用法: node scripts/mobile-check/probe-battle-p4.js <截图目录> [设备名...]   不给设备名则跑全部
const fs = require('fs');
const path = require('path');
const devices = require('./devices');
const { serve, launch, openDevice, touchDrag } = require('./harness');

const OUT = process.argv[2];
const only = process.argv.slice(3);

const click = (page, id, wait = 400) =>
  page.evaluate((id) => document.getElementById(id).click(), id).then(() => page.waitForTimeout(wait));

// 指定元素是否完整落在视口内；按钮渲染尺寸（真实 px）
function layout(page, sels, buttons) {
  return page.evaluate(({ sels, buttons }) => {
    const iw = innerWidth, ih = innerHeight;
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const out = sels.filter((s) => { const b = r(s); return b.left < -1 || b.top < -1 || b.right > iw + 1 || b.bottom > ih + 1; });
    const small = [...document.querySelectorAll(buttons)].map((b) => [b, b.getBoundingClientRect()])
      .filter(([, b]) => b.width && (b.width < 43.5 || b.height < 43.5))
      .map(([e, b]) => `${e.id || e.className} ${b.width.toFixed(0)}x${b.height.toFixed(0)}`);
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
    return { scale: +scale.toFixed(3), out, small,
      pageOverflow: document.documentElement.scrollWidth > iw || document.documentElement.scrollHeight > ih };
  }, { sels, buttons });
}

// 找一个当前视口内可放火塔的格子，返回其屏幕中心（真实 px）
function findCell(page) {
  return page.evaluate(() => {
    const g = window.gameInstance;
    const cam = g.camera;
    const rect = g.canvas.getBoundingClientRect();
    const k = rect.width / CONFIG.VIEW_W;
    const C = CONFIG.CELL_SIZE;
    for (let gy = 0; gy < CONFIG.GRID_ROWS; gy++) {
      for (let gx = 0; gx < CONFIG.GRID_COLS; gx++) {
        const sx = gx * C + C / 2 - cam.x;
        if (sx < C || sx > CONFIG.VIEW_W - CONFIG.BATTLE_DOCK_W - C) continue;
        if (g.canPlaceTower('fire', gx, gy)) {
          return { gx, gy, x: rect.left + sx * k, y: rect.top + (gy * C + C / 2) * k };
        }
      }
    }
    return null;
  });
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

    // ── 塔防 ──
    await click(page, 'btn-levels');
    await page.evaluate(() => document.querySelector('#td-theme-shelf .scroll-theme').click());
    await page.waitForTimeout(300);
    await click(page, 'enter-level', 1200);
    await click(page, 'density-picker-ok', 1500);
    await page.evaluate(() => { window.gameInstance.ink = 999; window.gameInstance.updateUI(); });
    await page.waitForTimeout(200);
    await shot('1-塔防');
    row.td = await layout(page, ['#game-container', '.dock-stats', '#core-hp', '#enemies', '.battle-dock'],
      '.battle-dock button, #bottom-bar .tower-select');

    // P7：卡槽之外，画布可见区内任意点的最上层元素都必须是画布本身（地图零遮挡）
    row.tdCanvasClear = await page.evaluate(() => {
      const c = document.getElementById('game-canvas').getBoundingClientRect();
      const k = c.width / CONFIG.VIEW_W;
      const visibleW = (CONFIG.VIEW_W - CONFIG.BATTLE_DOCK_W) * k;
      const blocked = [];
      for (let i = 0; i <= 12; i++) {
        for (let j = 0; j <= 6; j++) {
          const x = c.left + 2 + (visibleW - 4) * i / 12;
          const y = c.top + 2 + (c.height - 4) * j / 6;
          const top = document.elementFromPoint(x, y);
          if (top && top.id !== 'game-canvas') blocked.push(`${Math.round(x)},${Math.round(y)}:${top.id || top.className}`);
        }
      }
      return blocked.length ? blocked.slice(0, 4) : 'clear';
    });
    row.dockFont = await page.evaluate(() => getComputedStyle(document.getElementById('ink')).fontFamily.split(',')[0]);

    // 真实触摸：从火卡拖到可放格
    const card = await page.locator('#bottom-bar .tower-select[data-type="fire"]').boundingBox();
    const cell = await findCell(page);
    const before = await page.evaluate(() => window.gameInstance.towers.length);
    if (card && cell) {
      await touchDrag(page, { x: card.x + card.width / 2, y: card.y + card.height / 2 }, { x: cell.x, y: cell.y });
      await page.waitForTimeout(400);
    }
    row.tdDragPlaced = (await page.evaluate(() => window.gameInstance.towers.length)) - before;

    // 镜头最右：核心列须完整露在卡槽左侧
    row.tdCoreVisible = await page.evaluate(() => {
      const g = window.gameInstance;
      g.camera.jumpTo(g.camera.maxX);
      const core = g.currentLevelData.core;
      const right = (core.x + 1) * CONFIG.CELL_SIZE - g.camera.x;
      return right <= CONFIG.VIEW_W - CONFIG.BATTLE_DOCK_W + 0.5;
    });
    await page.waitForTimeout(150);
    await shot('2-塔防-镜头最右');

    // 暂停 → 设置：弹层按真实尺寸显示
    await click(page, 'pause-btn', 300);
    await click(page, 'pause-settings', 300);
    await shot('3-战斗设置');
    row.battleSettings = await layout(page, ['#battle-settings .battle-layer-panel'], '#battle-settings button');
    await click(page, 'settings-back', 200);
    await click(page, 'pause-return', 600);

    // ── 征服 ──
    await click(page, 'btn-conquest');
    await page.evaluate(() => document.querySelector('#cq-theme-shelf .scroll-theme').click());
    await page.waitForTimeout(300);
    await click(page, 'conquest-enter-level', 1200);
    await page.evaluate(() => document.getElementById('density-picker-ok')?.click());
    await page.waitForTimeout(1500);
    await shot('4-征服');
    row.cq = await layout(page, ['#conquest-container', '#conquest-side-panel'], '#conquest-side-panel button');
    row.cqCameraX = await page.evaluate(() => window.conquestGame.camera.x);
    const cost0 = await page.evaluate(() => document.getElementById('conquest-summon-cost').textContent);
    await page.evaluate(() => { window.conquestGame.ink = 999; document.getElementById('conquest-summon-btn').click(); });
    await page.waitForTimeout(300);
    const cost1 = await page.evaluate(() => document.getElementById('conquest-summon-cost').textContent);
    row.cqSummonCost = `${cost0} → ${cost1}`;

    row.errors = log.errors.filter((e) => !/ERR_PROXY|fonts\.g/.test(e));
    report.push(row);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 1));
})();
