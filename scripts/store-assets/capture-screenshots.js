// 生成上架截图：真实游戏画面，16:9，2560x1440 PNG
const fs = require('fs');
const path = require('path');
const { serve, launch, OUT } = require('./lib');
const S = require('./scene');

const DIR = path.join(OUT, '截图');
const DSF = 2560 / S.VIEW.width;

async function waitFor(page, fn, arg, timeout = 40000) {
  await page.waitForFunction(fn, arg, { timeout, polling: 100 });
}
const shot = async (page, name) => {
  const file = path.join(DIR, name);
  await page.screenshot({ path: file });
  console.log('saved', name, (fs.statSync(file).size / 1024).toFixed(0) + 'KB');
};

// 等到场上敌人达到 n 个（且不超过 max），保证画面热闹
const untilEnemies = (page, n) => waitFor(page, (n) => window.gameInstance.enemies.filter(e => !e.dead).length >= n, n);

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const { server, url } = await serve();
  const b = await launch();
  const { ctx, page } = await S.openGame(b, url, { dsf: DSF });

  // 战斗场景：布塔 → 融合 → 指定波次 → 等敌群拉开再截图
  const ONLY = process.env.ONLY; // 例如 ONLY=02 只重拍 02 号
  async function battle(levelId, towers, fusions, wave, file, extra = {}) {
    if (ONLY && !file.startsWith(ONLY)) return;
    await S.begin(page, levelId);
    await page.evaluate(() => { window.gameInstance.ink = 6000; });
    const ok = await S.place(page, towers);
    if (ok.includes(false)) console.log(levelId, 'place failed at', ok.map((v, i) => v ? null : towers[i].join('@')).filter(Boolean).join(' '));
    for (const [a, c] of fusions) console.log(levelId, 'fuse', await S.fuse(page, a, c));
    await page.waitForTimeout(3000);
    await S.keepInk(page);
    await page.evaluate((w) => { window.gameInstance.wave = w - 1; }, wave);
    await S.startWave(page);
    try { await S.untilSpread(page, extra.n || 7, extra.spread || 9, 25000); } catch (e) { console.log(levelId, '敌群未达到阈值，按当前画面截取'); }
    await shot(page, file);
  }

  await battle('1-5', [
    ['fire', 8, 2], ['fire', 9, 2], ['thunder', 11, 3], ['thunder', 12, 3], ['ice', 8, 5], ['water', 9, 5],
    ['wind', 11, 6], ['light', 10, 7], ['gold', 15, 6], ['earth', 16, 6], ['dark', 4, 3],
    ['mountain', 13, 4], ['mountain', 6, 3],
  ], [[[8, 2], [9, 2]], [[11, 3], [12, 3]]], 2, '01-战斗-融合塔协同守关.png', { n: 5, spread: 6 });

  await battle('1-9', [
    ['fire', 5, 1], ['fire', 6, 1], ['thunder', 8, 2], ['thunder', 9, 2], ['ice', 5, 4], ['ice', 6, 4],
    ['wind', 8, 5], ['light', 7, 3], ['gold', 9, 8], ['water', 5, 7],
    ['mountain', 10, 3], ['mountain', 10, 6], ['fire', 12, 6], ['water', 14, 6], ['thunder', 15, 4], ['earth', 12, 7],
  ], [[[5, 1], [6, 1]], [[8, 2], [9, 2]], [[5, 4], [6, 4]]], 5, '02-战斗-多路线布阵.png', { n: 6, spread: 8 });

  await battle('1-10', [
    ['fire', 7, 3], ['fire', 8, 3], ['ice', 7, 6], ['ice', 8, 6], ['thunder', 12, 3], ['thunder', 12, 4],
    ['wind', 12, 6], ['water', 11, 7], ['light', 16, 3], ['gold', 16, 5],
    ['dark', 6, 7], ['mountain', 10, 4], ['mountain', 14, 5], ['earth', 8, 7],
  ], [[[7, 3], [8, 3]], [[7, 6], [8, 6]], [[12, 3], [12, 4]]], 4, '03-战斗-敌群来袭.png', { n: 6, spread: 10 });

  if (ONLY) { await ctx.close(); await b.close(); server.close(); return; }

  // 融合确认（合字）弹窗 + 合字谱面板，均为游戏内真实界面
  await S.begin(page, '1-9');
  await page.evaluate(() => { window.gameInstance.ink = 6000; });
  await S.place(page, [['fire', 5, 1], ['water', 6, 1], ['thunder', 8, 2], ['wind', 9, 2], ['ice', 5, 4], ['gold', 7, 6]]);
  await S.keepInk(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.gameInstance; g.ui.attemptFusion(g.getTowerAt(8, 2), g.getTowerAt(9, 2)); });
  await page.waitForTimeout(1500);
  await shot(page, '05-合字融合-风雷激荡.png');
  await page.evaluate(() => document.getElementById('modal').classList.add('hidden'));
  await page.click('#fusion-encyclopedia-btn');
  await page.waitForTimeout(1500);
  await shot(page, '06-融合图鉴-合字谱.png');
  await ctx.close();

  // 征服模式：1280x720 视口（征服界面更宽），同样输出 2560x1440
  const c3 = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p3 = await c3.newPage();
  await p3.goto(url); await p3.waitForTimeout(2500);
  await p3.evaluate(() => {
    document.getElementById('main-menu').classList.add('hidden');
    window.gameInstance.menuInkBg && window.gameInstance.menuInkBg.stop();
    window.conquestGame.startLevel('3-3');
  });
  await p3.waitForTimeout(800);
  // 先少量布阵放敌人进场，敌群拉开后再补塔，避免开局即被清场
  await p3.evaluate(() => { const g = window.conquestGame; g.ink = 6000; g.summonTower(); g.startWave(); });
  await p3.waitForFunction(() => window.conquestGame.enemies.filter(e => !e.dead).length >= 5, null, { timeout: 40000, polling: 100 }).catch(() => console.log('征服：敌人未达阈值'));
  await p3.evaluate(() => { const g = window.conquestGame; g.ink = 6000; for (let i = 0; i < 6; i++) g.summonTower(); });
  await p3.waitForTimeout(1200);
  await p3.evaluate(() => { window.conquestGame.ink = 520; window.conquestGame.updateUI(); });
  await shot(p3, '04-征服模式-召唤布阵.png');
  await c3.close();

await b.close(); server.close();
})();
