// 在真实游戏里搭建演示战场（只调用游戏自身 API，不改源码）
const VIEW = { width: 1070, height: 602 };   // 16:9，且让游戏以 1:1 缩放铺满

async function openGame(browser, url, opts = {}) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: opts.dsf || 2.393, ...opts.ctx });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

// 进入关卡并等开场墨迹动画结束
async function begin(page, levelId, ink = 3000) {
  await page.evaluate((id) => window.gameInstance.startGame(id), levelId);
  await page.waitForFunction(() => {
    const g = window.gameInstance; return g.inkTrailAnimation && !g.inkTrailAnimation.active;
  }, null, { timeout: 30000 });
  await page.evaluate((ink) => { window.gameInstance.ink = ink; window.gameInstance.updateUI(); }, ink);
  await page.waitForTimeout(400);
}

async function place(page, list) {
  return page.evaluate((list) => list.map(([t, x, y]) => window.gameInstance.placeTower(t, x, y)), list);
}

// 把两座相邻塔融合（用游戏自身的校验）
async function fuse(page, a, b) {
  return page.evaluate(([a, b]) => {
    const g = window.gameInstance;
    const t1 = g.getTowerAt(a[0], a[1]), t2 = g.getTowerAt(b[0], b[1]);
    if (!t1 || !t2) return 'missing';
    return g.canFuse(t1, t2) ? g.fuseTowers(t1, t2) : 'cannot';
  }, [a, b]);
}

// 让墨水保持在一个合理的显示值，避免卡牌/炮塔出现「墨乏」灰态
async function keepInk(page, ink = 520) {
  await page.evaluate((ink) => {
    clearInterval(window.__inkTimer);
    window.__inkTimer = setInterval(() => {
      const g = window.gameInstance || window.conquestGame;
      const t = window.conquestGame && !window.conquestGame.gameEnded && !document.getElementById('conquest-container').classList.contains('hidden') ? window.conquestGame : window.gameInstance;
      if (t.ink !== ink) { t.ink = ink; t.updateUI(); }
    }, 150);
  }, ink);
}

// 等到敌群已沿路径拉开（数量与间距都够）
const untilSpread = (page, n, spread, timeout = 60000) => page.waitForFunction(([n, spread]) => {
  const es = window.gameInstance.enemies.filter(e => !e.dead);
  if (es.length < n) return false;
  const idx = es.map(e => e.pathIndex);
  return Math.max(...idx) - Math.min(...idx) >= spread;
}, [n, spread], { timeout, polling: 100 });

const startWave = (page) => page.evaluate(() => window.gameInstance.startWave());
const enemyCount = (page) => page.evaluate(() => window.gameInstance.enemies.length);

module.exports = { keepInk, untilSpread, VIEW, openGame, begin, place, fuse, startWave, enemyCount };
