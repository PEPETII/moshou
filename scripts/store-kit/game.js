// 实机对局操控：只调用游戏自身的公开方法与状态，不改源码、不改渲染。
// 游戏内容区固定 960×432；视口适配会在四周各留 44/20px，所以视口取 1048×472 让缩放恰为 1，
// 再按内容区裁剪。像素比 2 → 1920×864 原生实机画面（20:9，落在截图 8:3~8:5 与录屏 21:9~9:2 范围内）。
const { newContext } = require('./lib');

const VIEW = { width: 1048, height: 472 };
const CLIP = { x: 44, y: 20, width: 960, height: 432 };

async function shot(page, file) {
  await page.screenshot({ path: file, clip: CLIP });
}

// 录像专用：CDP screencast 只输出 CSS 像素帧，所以改为视口 2096×944、像素比 1，把游戏容器固定放大 2 倍
// （等同于在更大的屏幕上玩）。画布按显示尺寸自动以 2 倍分辨率重建（RenderScale），帧里就是清晰的 1920×864 内容。
const VIEW_HD = { width: 2096, height: 944 };
const CLIP_HD = { x: 88, y: 40, width: 1920, height: 864 };
async function openGameHD(browser, url) {
  const ctx = await newContext(browser, url, VIEW_HD, 1);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.gameInstance && document.fonts.status === 'loaded', null, { timeout: 30000 });
  await page.evaluate(() => {
    window.applyScale = window.applyGameScale = () => 2;   // 只拦截外部调用；内部定时器的重算由下面的钉子覆盖
    setInterval(() => {
      const c = document.getElementById('scale-container');
      if (c && c.style.transform !== 'scale(2)') { c.style.transform = 'scale(2)'; document.documentElement.style.setProperty('--ui-scale', '2'); }
    }, 50);
  });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

async function openGame(browser, url, dsf = 2) {
  const ctx = await newContext(browser, url, VIEW, dsf);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.gameInstance && document.fonts.status === 'loaded', null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

// 进关并按敌潮档位开战（跳过开场墨迹与档位弹窗——两者都是开战前的过场）
async function enterLevel(page, id, density = 'flood') {
  await page.evaluate(([id, density]) => {
    const g = window.gameInstance;
    g.startGame(id);
    DensityPicker.close();
    g.beginBattle(density);
  }, [id, density]);
  await page.waitForTimeout(600);
}

// 演示保底：墨水不断档、核心不破（只为让画面持续在交战状态）
async function keepAlive(page, ink = 420) {
  await page.evaluate((ink) => {
    clearInterval(window.__keepAlive);
    window.__keepAlive = setInterval(() => {
      const g = window.gameInstance;
      if (g.ink < ink || g.ink > ink * 3) { g.ink = ink + Math.floor(Math.random() * 160); g.updateUI(); }
      if (g.coreHp < g.maxCoreHp) g.coreHp = g.maxCoreHp;
    }, 200);
  }, ink);
}

// 沿路布塔：plan = [[type, gx, gy], ...]；返回失败项
async function place(page, plan) {
  return page.evaluate((plan) => {
    const g = window.gameInstance, fail = [];
    for (const [t, x, y] of plan) if (!g.placeTower(t, x, y)) fail.push(`${t}@${x},${y}`);
    return fail;
  }, plan);
}

// 自动布塔：在列区间里找贴着路径（8 邻域）的可建格，按顺序放 types
async function autoPlace(page, types, c0, c1, opts = {}) {
  return page.evaluate(([types, c0, c1, opts]) => {
    const g = window.gameInstance;
    g.ink = 99999;
    const paths = Array.isArray(g.path[0]) ? g.path : [g.path];
    const onPath = new Set(); paths.forEach((p) => p.forEach((q) => onPath.add(q.x + ',' + q.y)));
    const cells = [];
    for (let x = c0; x <= c1; x++) for (let y = 0; y < CONFIG.GRID_ROWS; y++) {
      if (onPath.has(x + ',' + y)) continue;
      let n = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (onPath.has((x + dx) + ',' + (y + dy))) n++;
      if (opts.rows) { if (opts.rows.includes(y)) cells.push({ x, y, n: 0 }); }   // 双路地图：放在两路之间
      else if (n) cells.push({ x, y, n });
    }
    // 先占路口（贴路格多的），再按列交错分布，避免全挤在一起
    cells.sort((a, b) => b.n - a.n || ((a.x * 7 + a.y * 3) % 5) - ((b.x * 7 + b.y * 3) % 5));
    const used = new Set(), out = [];
    const spacing = opts.spacing || 1;
    for (const t of types) {
      const c = cells.find((c) => !used.has(c.x + ',' + c.y) && g.canPlaceTower(t, c.x, c.y) &&
        ![...used].some((k) => { const [ux, uy] = k.split(',').map(Number); return Math.abs(ux - c.x) < spacing && Math.abs(uy - c.y) < spacing && spacing > 1; }));
      if (c && g.placeTower(t, c.x, c.y)) { used.add(c.x + ',' + c.y); out.push(`${t}@${c.x},${c.y}`); }
    }
    return out;
  }, [types, c0, c1, opts]);
}

// 镜头对准第 col 列居左
const cameraTo = (page, col) => page.evaluate((col) => {
  const g = window.gameInstance; g.camera.jumpTo(col * CONFIG.CELL_SIZE);
}, col);

// 快进刷怪时间轴（精英、首领按 at 秒出场）
const skipTo = (page, sec) => page.evaluate((sec) => { window.gameInstance.elapsed = sec; }, sec);

// 镜头跟住首领（落在画面 45% 处）；没有首领时对准敌群最密的位置
const focusAction = (page, at = 0.45) => page.evaluate((at) => {
  const g = window.gameInstance, live = g.enemies.filter((e) => !e.dead);
  if (!live.length) return null;
  const boss = live.find((e) => e.isBoss);
  let x;
  if (boss) x = boss.x;
  else { const xs = live.map((e) => e.x).sort((a, b) => a - b); x = xs[Math.floor(xs.length * 0.6)]; }
  g.camera.jumpTo(x - (g.camera.viewW || 960) * at);
  return Math.round(x);
}, at);

// 合字：把 tower 所在格的素材与相邻素材按配方合成（走游戏自己的 Fusion.perform）
const fuse = (page, gx, gy, result) => page.evaluate(([gx, gy, result]) => {
  const g = window.gameInstance, t = g.getTowerAt(gx, gy), recipe = Fusion.recipeOf(result);
  g.fusionCd = 0; g.ink = Math.max(g.ink, 99999);
  const r = Fusion.perform(g, t, recipe);
  return r.ok ? `${result}@${gx},${gy}` : r.reason;
}, [gx, gy, result]);

// 画面打分：镜头内的敌人数、塔数，首领入画加权（挑最热闹又完整的一帧）
const viewScore = (page) => page.evaluate(() => {
  const g = window.gameInstance, x0 = g.camera.x + 110, x1 = g.camera.x + (g.camera.viewW || 960) - 60;
  const inView = (o) => o.x > x0 && o.x < x1;
  const es = g.enemies.filter((e) => !e.dead && inView(e));
  const boss = es.some((e) => e.isBoss) ? 1 : 0;
  const towers = g.towers.filter(inView).length;
  return { score: Math.min(es.length, 30) + boss * 25 + Math.min(towers, 8) * 5, es: es.length, boss, towers };
});

// 连续取样，保留得分最高的一帧；follow 为真时每次取样前镜头跟住战况
async function bestShot(page, file, { samples = 12, every = 1500, follow = true, at = 0.42 } = {}) {
  const fs = require('fs');
  let best = null;
  for (let i = 0; i < samples; i++) {
    if (follow) await focusAction(page, at);
    await page.waitForTimeout(follow ? 350 : 0);
    const sc = await viewScore(page);
    if (!best || sc.score > best.sc.score) best = { sc, buf: await page.screenshot({ clip: CLIP }) };
    await page.waitForTimeout(every);
  }
  fs.writeFileSync(file, best.buf);
  return best.sc;
}

const alive = (page) => page.evaluate(() => window.gameInstance.aliveEnemyCount());

// 等场上敌人够多（或超时）
async function untilEnemies(page, n, timeout = 40000) {
  await page.waitForFunction((n) => window.gameInstance.aliveEnemyCount() >= n, n, { timeout, polling: 200 }).catch(() => {});
}

module.exports = { VIEW, CLIP, VIEW_HD, CLIP_HD, openGameHD, shot, bestShot, viewScore, focusAction, fuse, openGame, enterLevel, keepAlive, place, autoPlace, cameraTo, skipTo, alive, untilEnemies };
