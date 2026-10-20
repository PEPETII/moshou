/**
 * 字形塔测试的共用环境（2026-10-20 十一塔批次）：在 vm 里按 index.html 的顺序加载真实配置、
 * 笔刷、字形组件与全部招式，再给出最小的 Game 驱动与断言工具。
 * test-glyph-towers.js、test-fusion.js 共用；test-glyph-battle.js 保留自己的内联版本。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const GLYPH_TYPES = ['gold', 'wind', 'cannon', 'thunder', 'ice', 'bow', 'mountain', 'sword', 'yan', 'lin', 'fen'];

function fakeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function createEnv() {
  const vt = { t: 1e6 };
  const store = new Map();
  const ctx = { console, Math, Set, Map, WeakMap, Array, Object, JSON, setTimeout, clearTimeout };
  ctx.Date = { now: () => vt.t };
  ctx.performance = { now: () => vt.t };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  ctx.document = { getElementById: () => null, createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
  vm.createContext(ctx);

  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const conquestSrc = read('js/conquestGame.js');
  const files = [
    'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js',
    'js/config/glyph-battle.js', 'js/config/glyphs.js', 'js/config/glyphs-ext.js', 'js/config/glyphs-fusion.js',
    'js/config/fusion.js', 'js/config/codex.js',
    'js/utils.js', 'js/runtime.js', 'js/core/path-track.js', 'js/core/spawner.js',
    'js/glyph/brush.js', 'js/glyph/fx.js', 'js/glyph/adapter.js', 'js/glyph/glyph-tower.js', 'js/glyph/kit.js',
    'js/glyph/fire.js', 'js/glyph/water.js', 'js/glyph/earth.js', 'js/glyph/wood.js',
    ...GLYPH_TYPES.map((n) => `js/glyph/${n}.js`),
    'js/glyph/system.js',
    'js/tower.js', 'js/entities/towers/effects.js', 'js/entities/towers/misc.js', 'js/entities/towers/rendering-basic.js',
    'js/enemy.js', 'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js',
    'js/entities/enemy/motion.js', 'js/entities/enemy/rendering.js', 'js/core/fusion.js',
  ];
  const src = files.map(read).join('\n;\n')
    + '\nclass Game {}\n' + read('js/core/waves.js') + '\n' + read('js/core/towers.js')
    + '\n;' + conquestSrc.slice(0, conquestSrc.indexOf('class ConquestGame {'))
    + '\nclass ConquestGame {}\n' + read('js/modes/conquest/waves.js')
    + '\nglobalThis.__X = { Enemy, Tower, Game, ConquestGame, PathTrack, RuntimeIndexes, CONFIG, GlyphTower, GlyphSystem, GlyphFX, GlyphKit, GlyphWorld, GlyphWater, Fusion, Brush };';
  vm.runInContext(src, ctx);
  const X = ctx.__X;
  const CELL = X.CONFIG.CELL_SIZE;

  // 路径 (0,1)→(9,1)→(9,4)：直道加拐角
  const cells = [];
  for (let x = 0; x <= 9; x++) cells.push({ x, y: 1 });
  for (let y = 2; y <= 4; y++) cells.push({ x: 9, y });

  function makeGame() {
    const g = new X.Game();
    Object.assign(g, {
      ink: 0, coreHp: 20, maxCoreHp: 20, towers: [], enemies: [], path: cells,
      gameEnded: false, updateUI() {}, worldW: 26 * CELL,
      particleSystem: { createExplosion() {} },
      gameOver() { this.gameEnded = true; },
    });
    g.runtimeIndexes = new X.RuntimeIndexes(g);
    g.resetBattleState(null);
    return g;
  }

  function mk(g, type, gx, gy) {
    const t = new X.Tower(type, gx, gy, g);
    g.towers.push(t);
    g.runtimeIndexes.rebuildTowers();
    return t;
  }

  function run(g, sec) {
    const dtMs = 1000 / 60;
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) {
      vt.t += dtMs;
      X.GlyphSystem.tick(g, dtMs / 1000);
      g.runtimeIndexes.rebuildEnemies();
      for (const t of g.towers.slice()) t.update(vt.t, dtMs, g.enemies);
      for (const e of g.enemies) e.update(vt.t, dtMs);
      g.enemies = g.enemies.filter((e) => !e.dead);
      g.runtimeIndexes.rebuildEnemies();
      X.GlyphSystem.update(g, dtMs / 1000);
    }
  }

  // 静止的敌人（速度 0），放在里程 s
  function spawnAt(g, type, s, hp) {
    const e = new X.Enemy(type, cells, g);
    e.s = s; e.lane = 0; e.baseSpeed = e.speed = 0; e.syncPosition();
    if (hp) { e.hp = e.maxHp = hp; }
    g.enemies.push(e);
    g.runtimeIndexes.rebuildEnemies();
    return e;
  }

  const sNear = (g, t) => X.GlyphKit.nearestTrack(g, t.x, t.y).s;

  return { X, vt, ctx, store, cells, CELL, makeGame, mk, run, spawnAt, sNear, fakeCtx, GLYPH_TYPES };
}

function makeChecker() {
  let failed = 0;
  const check = (name, ok, detail) => {
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  };
  const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
  const finish = (label) => {
    if (failed) {
      console.log(`\n${failed} 项失败`);
      process.exit(1);
    }
    console.log(`\n${label}`);
  };
  return { check, near, finish };
}

module.exports = { createEnv, makeChecker };
