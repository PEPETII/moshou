// 实机截图：真实对局画面，1920×864（20:9），四个主题的关底首领战 + 合字融合 + 合字图鉴
// 用法: node scripts/store-kit/capture.js [编号前缀...]   例如 node scripts/store-kit/capture.js 01 03
const path = require('path');
const { OUT, serve, launch, mkdir, kb } = require('./lib');
const G = require('./game');
const { BOSS } = require('./scenes');

const DIR = mkdir(path.join(OUT, '截图'));

const SHOTS = [
  ['01-初墨-百鬼夜行.png', BOSS.yexing, { best: true }],
  ['02-墨泽-翻江倒海.png', BOSS.fanjiang, { best: true }],
  ['03-铁砚-铜墙铁壁.png', BOSS.tongqiang, { best: true }],
  ['04-焚卷-万劫不复.png', BOSS.wanjie, { best: true }],
  ['05-合字融合-火火成炎.png', async (page) => {
    await G.enterLevel(page, '1-3');
    await G.keepAlive(page);
    await G.place(page, [['fire', 7, 1], ['fire', 8, 1]]);
    await G.autoPlace(page, ['water', 'thunder', 'wood', 'ice', 'bow', 'sword'], 2, 14);
    await page.waitForTimeout(16000);
    await G.cameraTo(page, 2);
    // 真实点击：先点中火塔，弹出信息面板与合成区
    const p = await page.evaluate(() => {
      const g = window.gameInstance, c = document.getElementById('game-canvas').getBoundingClientRect();
      const k = c.width / 960, t = g.getTowerAt(8, 1);
      return { x: c.left + (t.x - g.camera.x) * k, y: c.top + t.y * k };
    });
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(900);
  }],
  ['06-合字图鉴.png', async (page) => {
    // 图鉴是整页界面，不在 960×432 战斗容器里：换 1440×648（同为 20:9）整页截取
    await page.setViewportSize({ width: 1440, height: 648 });
    await page.waitForTimeout(500);
    await page.click('#btn-encyclopedia');
    await page.waitForTimeout(1200);
    const tab = page.locator('text=合字').first();
    if (await tab.count()) { await tab.click(); await page.waitForTimeout(1200); }
  }],
];

(async () => {
  const only = process.argv.slice(2);
  const { server, url } = await serve();
  const b = await launch();
  try {
    for (const [file, run, opt] of SHOTS) {
      if (only.length && !only.some((p) => file.startsWith(p))) continue;
      console.log('  ' + file);
      const full = file.startsWith('06');
      const { ctx, page } = await G.openGame(b, url, full ? 4 / 3 : 2);
      const out = path.join(DIR, file);
      await run(page);
      // 首领战：连续取样存最好的一帧；其余直接截取
      if (opt && opt.best) console.log('    best', JSON.stringify(await G.bestShot(page, out, { samples: 14, at: 0.42 })));
      else if (full) await page.screenshot({ path: out }); else await G.shot(page, out);
      console.log('    saved', kb(out));
      await ctx.close();
    }
  } finally { await b.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
