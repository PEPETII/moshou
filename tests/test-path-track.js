/**
 * 路程化与连续刷怪回归测试（工单 04）：加载真实配置、PathTrack、BattleDirector、Enemy 与两种模式的调度方法。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const vt = { t: 1e6 };
const ctx = { console, Math, Set, Map, WeakMap, Array, Object, JSON, setTimeout, clearTimeout };
ctx.Date = { now: () => vt.t };
ctx.performance = { now: () => vt.t };
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };
vm.createContext(ctx);

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const conquestSrc = read('js/conquestGame.js');
const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/glyph-battle.js',
  'js/utils.js', 'js/runtime.js', 'js/core/path-track.js', 'js/core/spawner.js',
  'js/tower.js', 'js/entities/towers/effects.js',
  'js/entities/towers/misc.js', 'js/entities/towers/rendering-basic.js',
  'js/enemy.js', 'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js', 'js/entities/enemy/motion.js',
];
const src = files.map(read).join('\n;\n')
  + '\nclass Game {}\n' + read('js/core/waves.js')
  + '\n;' + conquestSrc.slice(0, conquestSrc.indexOf('class ConquestGame {'))
  + '\nclass ConquestGame {}\n' + read('js/modes/conquest/waves.js')
  + '\nglobalThis.__X = { Enemy, Game, ConquestGame, ConquestEnemy, PathTrack, BattleDirector, RuntimeIndexes, CONFIG };';
vm.runInContext(src, ctx);
const { Enemy, Game, ConquestGame, ConquestEnemy, PathTrack, BattleDirector, RuntimeIndexes, CONFIG } = ctx.__X;
const CELL = CONFIG.CELL_SIZE;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// 一条带两个拐角的格子路径：(0,1)→(3,1)→(3,3)→(6,3)
const cells = [];
for (const [x, y] of [[0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3], [6, 3]]) cells.push({ x, y });

function makeGame(Cls = Game, extra = {}) {
  const g = new Cls();
  Object.assign(g, {
    ink: 0, coreHp: 20, maxCoreHp: 20, towers: [], enemies: [], path: cells,
    gameEnded: false, updateUI() {}, gameOverCalls: [],
    particleSystem: { createExplosion() {} },
    gameOver(v) { this.gameEnded = true; this.gameOverCalls.push(v); },
  }, extra);
  g.runtimeIndexes = new RuntimeIndexes(g);
  g.resetBattleState(null);
  return g;
}

// ---------- 配置 ----------
check('速度按 speedPx×GLYPH_SCALE/CELL_SIZE 换算', near(CONFIG.ENEMIES.corpse.speed, 46 * 0.74 / CELL) && near(CONFIG.ENEMIES.ghost.speed, 82 * 0.74 / CELL));
check('尸/鬼/巨使用原型数值', CONFIG.ENEMIES.corpse.hp === 40 && CONFIG.ENEMIES.ghost.hp === 22 && CONFIG.ENEMIES.giant.hp === 300
  && CONFIG.ENEMIES.corpse.reward === 4 && CONFIG.ENEMIES.ghost.reward === 4 && CONFIG.ENEMIES.giant.reward === 25);
check('三档密度与上限', CONFIG.DENSITY.sparse.rate === 1.6 && CONFIG.DENSITY.normal.rate === 3.4 && CONFIG.DENSITY.flood.rate === 6.5
  && CONFIG.DENSITY_DEFAULT === 'flood' && CONFIG.ENEMY_CAP === 260 && CONFIG.HOLD_SECONDS === 150 && CONFIG.CONQUEST_DANGER_LIMIT === 200);

// ---------- PathTrack ----------
{
  const tr = PathTrack.fromCells(cells);
  check('共线点合并：总长 = 路径格数差×格长', near(tr.total, 8 * CELL) && tr.segs.length === 3, `segs=${tr.segs.length} total=${tr.total}`);
  const p0 = tr.pointAt(0);
  check('起点在首格中心', near(p0.x, CELL / 2) && near(p0.y, CELL * 1.5));
  const pc = tr.pointAt(3 * CELL);
  check('拐角处恰好在拐点格中心', near(pc.x, 3 * CELL + CELL / 2) && near(pc.y, CELL * 1.5));
  const pm = tr.pointAt(3.5 * CELL);
  check('拐角后沿新方向（向下）', near(pm.x, 3 * CELL + CELL / 2) && near(pm.y, CELL * 2));
  check('cellIndexAt 与格子一一对应', tr.cellIndexAt(0) === 0 && tr.cellIndexAt(2.9 * CELL) === 2 && tr.cellIndexAt(3.2 * CELL) === 3 && tr.cellIndexAt(99999) === 8);
  check('pointAt 夹取到 [0,total]', near(tr.pointAt(-50).x, CELL / 2) && near(tr.pointAt(1e9).x, 6 * CELL + CELL / 2));
  check('nearestS 回算里程', near(tr.nearestS(3 * CELL + CELL / 2, 2 * CELL), 3.5 * CELL, 1e-3));
  {
    let ok = true;
    for (let s = 0; s <= tr.total; s += CELL / 3) { const q = tr.pointAt(s); if (!near(tr.nearestS(q.x, q.y), s, 1e-3)) ok = false; }
    check('pointAt 与 nearestS 互逆（沿全程采样，含拐角）', ok);
    const before = tr.pointAt(5.2 * CELL), after = tr.pointAt(5.2 * CELL - 100);
    check('减小 s 后坐标沿路后退且连续', after.x < before.x || after.y < before.y);
  }
  const ext = PathTrack.fromCells(cells, { extendEntry: true });
  check('入口向画外延伸一格', near(ext.total, 9 * CELL) && near(ext.pointAt(0).x, -CELL / 2) && near(ext.cellS[0], CELL) && ext.cellIndexAt(CELL) === 0);
  check('forPath 按数组缓存', PathTrack.forPath(cells) === PathTrack.forPath(cells) && PathTrack.forPath(cells) !== PathTrack.forPath(cells, { loop: true }));
}

// ---------- 敌人沿里程移动 ----------
{
  vt.t = 1e6;
  const g = makeGame();
  const e = new Enemy('corpse', cells, g);
  e.s = 0; e.lane = 0; e.baseSpeed = e.speed = 1; e.syncPosition();
  e.update(vt.t, 1000);  // 1 秒、1 格/秒
  check('速度单位为格/秒：1 格/秒走 1 格', near(e.s, CELL, 1e-6), `s=${e.s}`);
  // 拐角平滑：走过拐角后 x 不再增加
  e.s = e.track.cellS[3] - 5; e.syncPosition();   // 塔防路径带入口延伸，拐点格(3,1)的里程取自 cellS
  e.baseSpeed = e.speed = 1; e.update(vt.t, 100);
  check('拐角处沿折线转向、不穿墙', near(e.x, 3 * CELL + CELL / 2, 1e-6) && e.y > CELL * 1.5, `x=${e.x} y=${e.y}`);
  // 击退
  e.s = 4 * CELL; e.knockback(100);
  check('knockback 减小 s', near(e.s, 4 * CELL - 100));
  const giant = new Enemy('giant', cells, g); giant.s = 4 * CELL; giant.knockback(100);
  check('重敌击退打折', near(giant.s, 4 * CELL - 100 * CONFIG.GLYPH_STATUS.giantKnockMul));
  const edge = new Enemy('corpse', cells, g); edge.s = 10; edge.knockback(500);
  check('s 不会小于 0', edge.s === 0);
  // 眩晕、湿身、被卷入
  const a = new Enemy('corpse', cells, g); a.lane = 0; a.s = 0; a.baseSpeed = a.speed = 1; a.glyphStun(0.5);
  a.update(vt.t, 400); const s1 = a.s;
  a.update(vt.t, 400); a.update(vt.t, 400);
  check('眩晕期间不前进，结束后继续', s1 === 0 && a.s > 0 && a.stun <= 0, `s1=${s1} s=${a.s}`);
  const w = new Enemy('corpse', cells, g); w.lane = 0; w.s = 0; w.baseSpeed = w.speed = 1; w.makeWet(5);
  w.update(vt.t, 1000);
  check('湿身按 wetSlow 减速', near(w.s, CELL * (1 - CONFIG.GLYPH_STATUS.wetSlow), 1e-6), `s=${w.s}`);
  const c = new Enemy('corpse', cells, g); c.lane = 0; c.s = 100; c.baseSpeed = c.speed = 1; c.carried = {};
  c.update(vt.t, 1000);
  check('被卷入(carried)时 s 由招式接管', c.s === 100);
  // 灼烧
  const b = new Enemy('corpse', cells, g); g.ink = 0;
  b.ignite(2, 1); b.ignite(9, 1);
  check('灼烧层数封顶', b.burnStacks === CONFIG.GLYPH_STATUS.burnMaxStacks);
  b.baseSpeed = b.speed = 0;
  const hp0 = b.hp;
  for (let t = 0; t < 1000; t += 16.67) { vt.t += 16.67; b.update(vt.t, 16.67); }
  const expected = CONFIG.GLYPH_STATUS.burnDps * CONFIG.GLYPH_STATUS.burnMaxStacks * 1;
  check('灼烧伤害≈ dps×层数×秒（合并显示后总量不丢）', Math.abs((hp0 - b.hp) - expected) < expected * 0.35, `掉血 ${(hp0 - b.hp).toFixed(1)} 期望≈${expected}`);
  check('灼烧到时清层', b.burnStacks === 0 && b.burnTime <= 0);
  // 终点
  const f = new Enemy('corpse', cells, g); f.lane = 0; f.s = f.track.total - 1; f.baseSpeed = f.speed = 1;
  const hpCore = g.coreHp;
  f.update(vt.t, 100);
  check('到达终点：死亡、按 damage 扣核心血、漏怪 +1', f.dead && g.coreHp === hpCore - CONFIG.ENEMIES.corpse.damage && g.leaks === 1);
  const gi = new Enemy('giant', cells, g); gi.s = gi.track.total - 1; gi.update(vt.t, 100);
  check('巨漏怪扣 3 点', g.coreHp === hpCore - 1 - 3);
  // 新字段随构造重置
  const r = new Enemy('corpse', cells, g);
  check('新敌人字段为干净初值', r.stun === 0 && r.wet === 0 && r.burnStacks === 0 && r.burnTime === 0 && r.carried === null && r.flash === 0);
  r.stun = 9; r.wet = 9; r.burnStacks = 3; r.carried = {}; r.reset('ghost', cells, g);
  check('对象池 reset 会清空 stun/wet/burn/carried', r.stun === 0 && r.wet === 0 && r.burnStacks === 0 && r.carried === null && r.type === 'ghost');
}

// ---------- 连续刷怪 ----------
{
  const rates = {};
  for (const key of ['sparse', 'normal', 'flood']) {
    vt.t = 1e6;
    const g = makeGame();
    BattleDirector.begin(g, key);
    const before = g.enemies.length;
    g.holdLeft = 1e9; g.holdTotal = 1e9;
    g.giantTimer = 1e9;                      // 先不算巨，只测普通怪速率
    for (const e of g.enemies) e.baseSpeed = e.speed = 0;
    let spawned = 0;
    for (let i = 0; i < 60 * 20; i++) {
      const n0 = g.enemies.length;
      g.updateSpawner(1 / 60);
      spawned += g.enemies.length - n0;
    }
    rates[key] = spawned / 20;
    check(`「${CONFIG.DENSITY[key].label}」档每秒刷怪数 ≈ ${CONFIG.DENSITY[key].rate}`, Math.abs(rates[key] - CONFIG.DENSITY[key].rate) < 0.2, `实测 ${rates[key].toFixed(2)}，预铺 ${before}`);
  }
  check('三档速率严格递增', rates.sparse < rates.normal && rates.normal < rates.flood);

  vt.t = 1e6;
  const g = makeGame();
  BattleDirector.begin(g, 'flood');
  check('开局预铺 prefillCount 只且都在路上', g.enemies.length === CONFIG.SPAWN.prefillCount && g.enemies.every((e) => e.s > 0 && e.s < e.track.total));
  check('非法档位回落「潮」', (() => { const h = makeGame(); BattleDirector.begin(h, 'xx'); return h.density === 'flood'; })());
  check('开局第一只巨在 firstGiantDelay 秒后', near(g.giantTimer, CONFIG.SPAWN.firstGiantDelay));
  g.holdLeft = g.holdTotal = 1e9;
  const giants = () => g.enemies.filter((e) => e.type === 'giant').length;
  for (let i = 0; i < 60 * 3.9; i++) g.updateSpawner(1 / 60);
  const g1 = giants();
  for (let i = 0; i < 60 * 0.3; i++) g.updateSpawner(1 / 60);
  check('巨：4 秒前没有、4 秒后出现', g1 === 0 && giants() === 1);
  // 上限：敌人不移动，持续刷怪 120 秒
  for (let i = 0; i < 60 * 120; i++) g.updateSpawner(1 / 60);
  check('满 ENEMY_CAP 后停止刷怪，且不判负', g.aliveEnemyCount() === CONFIG.ENEMY_CAP && !g.gameEnded, `alive=${g.aliveEnemyCount()}`);
  // 坚守
  const h = makeGame();
  BattleDirector.begin(h, 'sparse');
  check('坚守时长默认 HOLD_SECONDS', h.holdTotal === CONFIG.HOLD_SECONDS);
  h.holdLeft = 0.5; h.coreHp = 5;
  h.updateSpawner(1);
  check('坚守倒计时到 0 且核心血量 > 0：判胜', h.gameOverCalls.length === 1 && h.gameOverCalls[0] === true && h.battleActive === false);
  const h2 = makeGame(Game, { currentLevelData: { holdSeconds: 30 } });
  BattleDirector.begin(h2, 'normal');
  check('关卡 holdSeconds 可覆盖默认值', h2.holdTotal === 30);
  check('未开战(battleActive=false)不刷怪不计时', (() => { const x = makeGame(); x.updateSpawner(5); return x.enemies.length === 0 && x.holdLeft === CONFIG.HOLD_SECONDS; })());
  check('formatHold', BattleDirector.formatHold(150) === '02:30' && BattleDirector.formatHold(0) === '00:00' && BattleDirector.formatHold(59.2) === '01:00');
}

// ---------- 征服：环形回路 ----------
{
  vt.t = 1e6;
  const ring = [];
  for (let x = 0; x < 6; x++) ring.push({ x, y: 0 });
  for (let y = 1; y < 4; y++) ring.push({ x: 5, y });
  for (let x = 4; x >= 0; x--) ring.push({ x, y: 3 });
  for (let y = 2; y >= 1; y--) ring.push({ x: 0, y });
  ring.push({ x: 0, y: 0 });
  const c = makeGame(ConquestGame, { path: ring, dangerLimit: CONFIG.CONQUEST_DANGER_LIMIT, CELL_SIZE: CELL });
  const e = c.spawnGlyphEnemy('corpse');
  check('征服敌人使用环形路程', e.track.loop === true && e instanceof ConquestEnemy);
  check('征服保留速度 ×1.5', e.baseSpeed > CONFIG.ENEMIES.corpse.speed * 1.5 * 0.9 && e.baseSpeed < CONFIG.ENEMIES.corpse.speed * 1.5 * 1.1);
  e.lane = 0; e.baseSpeed = e.speed = 1; e.s = e.track.total - 10;
  const core0 = c.coreHp;
  e.update(vt.t, 1000);
  check('走到终点后 s 归零继续绕圈，不扣核心血量', !e.dead && e.s < CELL * 2 && c.coreHp === core0, `s=${e.s}`);
  c.enemies = []; BattleDirector.begin(c, 'flood');
  check('征服同样预铺与计时', c.enemies.length === CONFIG.SPAWN.prefillCount && c.holdLeft === CONFIG.HOLD_SECONDS);
}

// ---------- RuntimeIndexes 空间分桶 ----------
{
  const g = makeGame();
  for (let i = 0; i < 200; i++) {
    const e = new Enemy('corpse', cells, g);
    e.x = (i % 20) * 40 - 100; e.y = Math.floor(i / 20) * 40; g.enemies.push(e);
  }
  g.enemies[5].dead = true;
  g.runtimeIndexes.rebuildEnemies();
  const brute = (x, y, r) => g.enemies.filter((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r).length;
  const ok = [[0, 0, 60], [300, 150, 120], [-100, 0, 30], [400, 360, 500]].every(([x, y, r]) => g.runtimeIndexes.enemiesInRange(x, y, r).length === brute(x, y, r));
  check('enemiesInRange 与全量扫描结果一致（含负坐标与死亡敌人）', ok);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n路程化与连续刷怪测试通过');
