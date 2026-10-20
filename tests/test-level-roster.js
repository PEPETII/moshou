/**
 * 关卡刷怪编排（工单 01 §3.1～3.2）：roster 权重抽取与时间窗、重敌间隔、精英与首领准时出场且只一次、
 * 加压时段、首领出场缓冲期、指定路径、血量与奖励倍率、没有 roster 时回退旧逻辑。
 * 随机数用固定种子（mulberry32）；真实 20 关的数据用于统计分布。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, run, makeGame, CELL, seed } = env;
const { CONFIG, BattleDirector, SpawnSchedule } = X;
const { check, near, finish } = makeChecker();

// 真实关卡数据（用另一个 vm 加载，避免和战斗环境互相污染）
function loadLevels() {
  const ROOT = path.join(__dirname, '..');
  const ctx = { console, Math, Set, Map, Array, Object, JSON, LEVELS_DATA: {} };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const files = [
    'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js',
    'js/config/glyph-battle.js', 'js/utils.js', 'js/levelsData.js', 'js/data/levels/part-01.js', 'js/data/levels/part-02.js', 'js/data/levels/part-03.js', 'js/data/levels/part-04.js',
    'js/levelManager.js',
  ];
  vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\nglobalThis.__L = levelManager;', ctx);
  return ctx.__L;
}
const levels = loadLevels();

// 一局：给 g 装上关卡数据与路径，然后开战
function startBattle(level, density) {
  const g = makeGame();
  g.currentLevelData = level;
  if (level.path) g.path = level.path;
  g.coreHp = g.maxCoreHp = level.coreHp;
  g.resetBattleState(level);
  BattleDirector.begin(g, density || 'normal');
  return g;
}
// 用 dt 推进刷怪器 sec 秒（不推进敌人，敌人静止，便于计数）
function tick(g, sec, dt) {
  dt = dt || 1 / 60;
  const n = Math.round(sec / dt);
  for (let i = 0; i < n; i++) BattleDirector.update(g, dt);
}
const count = (g, type) => g.enemies.filter((e) => e.type === type && !e.summoned).length;
const savedCap = CONFIG.ENEMY_CAP;

// ---------- pickRosterType：权重与时间窗 ----------
{
  seed(1);
  const lv = { roster: [{ type: 'corpse', weight: 50 }, { type: 'ghost', weight: 25 }, { type: 'bone', weight: 15, from: 20 }, { type: 'fox', weight: 10, from: 40, to: 60 }] };
  const draw = (t, n) => {
    const c = {};
    for (let i = 0; i < n; i++) { const k = SpawnSchedule.pickRosterType(lv, t); c[k] = (c[k] || 0) + 1; }
    return c;
  };
  const a = draw(0, 1000);
  check('时间窗：第 20 秒前不出骨、第 40 秒前不出狐', !a.bone && !a.fox);
  check('权重：尸 ≈ 2/3、鬼 ≈ 1/3（1000 次抽取，偏差 ≤ ±5%）', Math.abs(a.corpse / 1000 - 50 / 75) <= 0.05 && Math.abs(a.ghost / 1000 - 25 / 75) <= 0.05, JSON.stringify(a));
  const b = draw(45, 2000);
  check('from / to：第 45 秒四种都有，比例偏差 ≤ ±5%', b.corpse && b.ghost && b.bone && b.fox
    && Math.abs(b.corpse / 2000 - 0.5) <= 0.05 && Math.abs(b.ghost / 2000 - 0.25) <= 0.05 && Math.abs(b.bone / 2000 - 0.15) <= 0.05 && Math.abs(b.fox / 2000 - 0.1) <= 0.05, JSON.stringify(b));
  const c = draw(60, 500);
  check('to：第 60 秒起不再出狐', !c.fox);
  check('空池返回 null', SpawnSchedule.pickRosterType({ roster: [{ type: 'bone', weight: 1, from: 99 }] }, 0) === null);
}

// ---------- 没有 roster：回退旧逻辑 ----------
{
  CONFIG.ENEMY_CAP = 1e9;
  const g = startBattle({ id: 'legacy', coreHp: 20, holdSeconds: 100 }, 'flood');
  tick(g, 20);
  const types = new Set(g.enemies.map((e) => e.type));
  check('无 roster：只刷尸、鬼、巨', [...types].every((t) => ['corpse', 'ghost', 'giant'].includes(t)) && types.has('corpse') && types.has('ghost') && types.has('giant'), [...types].join());
  const rate = g.enemies.filter((e) => e.type !== 'giant').length / 20;
  check('无 roster：刷怪速率照旧（潮档 6.5 只/秒）', Math.abs(rate - 6.5) < 0.2, rate.toFixed(2));
  CONFIG.ENEMY_CAP = savedCap;
}

// ---------- 重敌按固定间隔 ----------
{
  CONFIG.ENEMY_CAP = 1e9;
  const lv = { id: 't', coreHp: 20, holdSeconds: 100, roster: [{ type: 'corpse', weight: 1 }], heavy: [{ type: 'giant', every: { sparse: 14, normal: 9, flood: 6 }, first: 4 }] };
  const g = startBattle(lv, 'normal');
  const times = [];
  const dt = 1 / 60;
  let seen = 0;
  for (let i = 0; i < 60 * 40; i++) {
    BattleDirector.update(g, dt);
    const n = count(g, 'giant');
    if (n > seen) { times.push(g.elapsed); seen = n; }
  }
  check('重敌：首只第 4 秒，之后每 9 秒一只（常档）', times.length === 4 && times.every((t, i) => Math.abs(t - (4 + 9 * i)) < 0.1), times.map((t) => t.toFixed(2)).join());
  const g2 = startBattle(lv, 'flood');
  const t2 = [];
  let s2 = 0;
  for (let i = 0; i < 60 * 20; i++) {
    BattleDirector.update(g2, dt);
    const n = count(g2, 'giant');
    if (n > s2) { t2.push(g2.elapsed); s2 = n; }
  }
  check('重敌：潮档间隔为 6 秒', t2.length >= 3 && Math.abs(t2[1] - t2[0] - 6) < 0.1, t2.map((t) => t.toFixed(2)).join());
  const lv3 = { id: 't3', coreHp: 20, holdSeconds: 100, roster: [{ type: 'corpse', weight: 1 }], heavy: [{ type: 'giant', every: 5 }] };
  const g3 = startBattle(lv3, 'sparse');
  tick(g3, 11);
  check('重敌：every 给数字时三档相同', count(g3, 'giant') === 2, String(count(g3, 'giant')));
  CONFIG.ENEMY_CAP = savedCap;
}

// ---------- 精英、首领：准时、只一次、指定路径 ----------
{
  CONFIG.ENEMY_CAP = 1e9;
  const pathA = [];
  const pathB = [];
  for (let x = 0; x <= 9; x++) { pathA.push({ x, y: 1 }); pathB.push({ x, y: 4 }); }
  const lv = {
    id: 't', coreHp: 20, holdSeconds: 200, path: [pathA, pathB],
    roster: [{ type: 'corpse', weight: 1 }],
    elites: [{ type: 'yaksha', at: 70 }, { type: 'puppet', at: 120, path: 1 }],
    boss: { type: 'baiguiyexing', at: 100, path: 0 },
  };
  const g = startBattle(lv, 'normal');
  const dt = 1 / 60;
  const born = {};
  for (let i = 0; i < 60 * 130; i++) {
    BattleDirector.update(g, dt);
    for (const e of g.enemies) if (!e.summoned && ['yaksha', 'puppet', 'baiguiyexing'].includes(e.type) && born[e.type] == null) born[e.type] = g.elapsed;
  }
  check('精英在 at 秒（±0.1）准时出现', Math.abs(born.yaksha - 70) < 0.1 && Math.abs(born.puppet - 120) < 0.1, JSON.stringify(born));
  check('首领在 at 秒（±0.1）准时出现', Math.abs(born.baiguiyexing - 100) < 0.1);
  check('精英、首领各只出现一次', count(g, 'yaksha') === 1 && count(g, 'puppet') === 1 && count(g, 'baiguiyexing') === 1);
  check('指定路径：首领走路径 0，指定 path 1 的傀儡走路径 1', g.enemies.find((e) => e.type === 'baiguiyexing').pathNo === 0 && g.enemies.find((e) => e.type === 'puppet').pathNo === 1);
  check('首领出场后 game.boss 指向它', g.boss && g.boss.type === 'baiguiyexing' && g.bossSpawned === true);
  // 缺省路径：随机，两条都会用到
  seed(5);
  const g2 = startBattle({ id: 'm', coreHp: 20, holdSeconds: 100, path: [pathA, pathB], roster: [{ type: 'corpse', weight: 1 }] }, 'flood');
  tick(g2, 20);
  const a = g2.enemies.filter((e) => e.pathNo === 0).length;
  const b = g2.enemies.filter((e) => e.pathNo === 1).length;
  check('缺省路径随机：两条路径都刷怪，各约一半', a > 0 && b > 0 && Math.abs(a / (a + b) - 0.5) < 0.08, `${a}/${b}`);
  CONFIG.ENEMY_CAP = savedCap;
}

// ---------- 首领出场缓冲期与加压时段 ----------
{
  CONFIG.ENEMY_CAP = 1e9;
  const lv = {
    id: 't', coreHp: 20, holdSeconds: 200, roster: [{ type: 'corpse', weight: 1 }],
    boss: { type: 'baiguiyexing', at: 50 },
    surges: [{ at: 20, dur: 10, rateMul: 2 }],
  };
  const g = startBattle(lv, 'normal');
  const rate = CONFIG.DENSITY.normal.rate;
  const spawned = () => g.enemies.filter((e) => e.type === 'corpse').length;
  tick(g, 10);
  const n10 = spawned();
  tick(g, 10);
  const n20 = spawned();
  tick(g, 10);
  const n30 = spawned();
  check('平时刷怪速率 = 敌潮档位 rate', Math.abs(n10 / 10 - rate) < 0.2 && Math.abs((n20 - n10) / 10 - rate) < 0.2, (n10 / 10).toFixed(2));
  check('加压时段 rateMul × 2 生效（第 20～30 秒）', Math.abs((n30 - n20) / 10 - rate * 2) < 0.35, ((n30 - n20) / 10).toFixed(2));
  tick(g, 20 + 0.05);
  const n50 = spawned();
  tick(g, 10);
  const n60 = spawned();
  check('首领出场后 10 秒内刷怪速率 × 0.5', Math.abs((n60 - n50) / 10 - rate * 0.5) < 0.25, ((n60 - n50) / 10).toFixed(2));
  const n60b = spawned();
  tick(g, 10);
  check('缓冲期结束后速率恢复', Math.abs((spawned() - n60b) / 10 - rate) < 0.25);
  CONFIG.ENEMY_CAP = savedCap;
}

// ---------- 暂停不走、ENEMY_CAP、倍率 ----------
{
  const lv = { id: 't', coreHp: 20, holdSeconds: 100, hpMul: 1.5, roster: [{ type: 'corpse', weight: 1 }, { type: 'giant', weight: 0.0001 }], path: levels.get('1-1').path };
  const g = startBattle(lv, 'flood');
  g.battleActive = false;
  BattleDirector.update(g, 5);
  check('开战前（battleActive = false）不刷怪、elapsed 不走', g.enemies.length === 0 && !(g.elapsed > 0));
  g.battleActive = true;
  CONFIG.ENEMY_CAP = 10;
  tick(g, 5);
  check('ENEMY_CAP：到顶只暂停刷怪', g.aliveEnemyCount() === 10);
  CONFIG.ENEMY_CAP = savedCap;
  const e = g.enemies[0];
  check('关卡 hpMul 乘在血量上：尸 40 × 1.5 = 60', e.maxHp === 60 && e.hp === 60, String(e.maxHp));
  check('奖励 = 基础 × 档位 rewardMul × (0.5 + 0.5 × hpMul)：4 × 0.6 × 1.25 = 3', e.reward === 3, String(e.reward));
  const g2 = startBattle(lv, 'sparse');
  const e2 = g2.spawnGlyphEnemy('corpse');
  check('稀档奖励倍率 1.6：4 × 1.6 × 1.25 = 8', e2.reward === 8, String(e2.reward));
  const boss = g2.spawnGlyphEnemy('baiguiyexing');
  check('首领不吃关卡 hpMul，按敌潮档位取 0.75：4000 × 0.75', boss.maxHp === 3000 && boss.reward === 200, String(boss.maxHp));
  const gN = startBattle(lv, 'normal');
  check('首领常档 0.9、潮档 1.0', gN.spawnGlyphEnemy('baiguiyexing').maxHp === 3600 && startBattle(lv, 'flood').spawnGlyphEnemy('baiguiyexing').maxHp === 4000);
  const sm = g2.spawnGlyphEnemy('bone', { summoned: true, s: 100 });
  check('召唤物：奖励固定 1 墨，不吃 hpMul，可指定初始里程', sm.reward === 1 && sm.maxHp === 45 && sm.s === 100);
}

// ---------- 真实关卡：4-4 三路分布与十二种新单字敌人 ----------
{
  CONFIG.ENEMY_CAP = 1e9;
  const lv = levels.get('4-4');
  seed(44);
  const g = startBattle(lv, 'flood');
  const dt = 0.05;
  for (let i = 0; i < 170 / dt; i++) BattleDirector.update(g, dt);
  const normals = g.enemies.filter((e) => !e.summoned && !['yaksha', 'puppet', 'baigujing', 'zhenmushou', 'giant'].includes(e.type));
  const per = [0, 1, 2].map((i) => normals.filter((e) => e.pathNo === i).length / normals.length);
  check('4-4：三条路径上的普通刷怪各占约 1/3（±8%）', per.every((p) => Math.abs(p - 1 / 3) < 0.08), per.map((p) => p.toFixed(3)).join('/'));
  const singles = ['bone', 'fox', 'spider', 'jiao', 'frog', 'turtle', 'kai', 'rider', 'shaman', 'nightmare', 'miasma', 'glutton'];
  check('4-4：12 种新单字敌人 170 秒内各至少 3 只（潮档，含 150 秒内）', singles.every((t) => count(g, t) >= 3), singles.map((t) => t + count(g, t)).join(' '));
  const trio = g.enemies.filter((e) => ['corpse', 'ghost'].includes(e.type)).length / g.enemies.filter((e) => !e.summoned).length;
  check('4-4：尸、鬼合计约占 30%', Math.abs(trio - 0.3) < 0.06, trio.toFixed(3));
  const elites = g.enemies.filter((e) => ['yaksha', 'puppet', 'baigujing', 'zhenmushou'].includes(e.type));
  check('4-4：四种精英都已出场，路径与关卡数据一致（C、B、A、A）', elites.length === 4
    && elites.find((e) => e.type === 'yaksha').pathNo === 2 && elites.find((e) => e.type === 'puppet').pathNo === 1
    && elites.find((e) => e.type === 'baigujing').pathNo === 0 && elites.find((e) => e.type === 'zhenmushou').pathNo === 0);
  CONFIG.ENEMY_CAP = savedCap;
}
{
  // 1-3：第 15 秒前不会刷出骨；1-4：第 70、130 秒各出一只夜叉
  CONFIG.ENEMY_CAP = 1e9;
  const g = startBattle(levels.get('1-3'), 'flood');
  tick(g, 14.9, 0.05);
  check('1-3：第 15 秒之前不会刷出骨', count(g, 'bone') === 0);
  tick(g, 10, 0.05);
  check('1-3：第 15 秒之后开始出骨', count(g, 'bone') > 0);
  const g4 = startBattle(levels.get('1-4'), 'normal');
  const ys = [];
  for (let i = 0; i < 140 / 0.05; i++) {
    BattleDirector.update(g4, 0.05);
    const n = count(g4, 'yaksha');
    if (n > ys.length) ys.push(g4.elapsed);
  }
  check('1-4：第 70、130 秒各出一只夜叉', ys.length === 2 && Math.abs(ys[0] - 70) < 0.1 && Math.abs(ys[1] - 130) < 0.1, ys.join());
  CONFIG.ENEMY_CAP = savedCap;
}

finish('关卡刷怪编排测试通过');
