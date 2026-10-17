/**
 * 状态与数量上限回归测试：加载真实配置与真实 Tower/Enemy/Game。
 * 覆盖：A8 毒层上限；A9 maxCount、暗塔回血封顶、碉反射；A10 取最强减速；
 * A11 火标记清除；壕按 dt 结算；陷每个敌人只触发一次。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const vt = { t: 1e6 };
const ctx = { console, Math, Set, Map, Array, Object, JSON, setTimeout, clearTimeout };
ctx.Date = { now: () => vt.t };
ctx.performance = { now: () => vt.t };
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };
vm.createContext(ctx);

const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js',
  'js/config/fusion.js', 'js/utils.js', 'js/runtime.js',
  'js/tower.js', 'js/entities/towers/combat.js', 'js/entities/towers/effects.js',
  'js/entities/towers/misc.js', 'js/entities/towers/projectiles.js', 'js/entities/towers/fusion.js',
  'js/enemy.js', 'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js',
];
const src = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\nclass Game {}\n'
  + ['js/core/waves.js', 'js/core/towers.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\nglobalThis.__X = { Tower, Enemy, Game, RuntimeIndexes, CONFIG, gridKey };';
vm.runInContext(src, ctx);
const { Tower, Enemy, Game, RuntimeIndexes, CONFIG, gridKey } = ctx.__X;

const pathPts = [];
for (let x = 0; x < 20; x++) pathPts.push({ x, y: 5 });

function makeGame() {
  const g = new Game();
  Object.assign(g, { ink: 1e6, coreHp: 10, maxCoreHp: 50, towers: [], enemies: [], updateUI() {}, gameEnded: false, inputLocked: false,
    particleSystem: { createExplosion() {}, createPoisonCloud() {} } });
  g.runtimeIndexes = new RuntimeIndexes(g);
  g._pathCellSet = new Set(pathPts.map((p) => gridKey(p.x, p.y)));
  g._placementGridSet = new Set();
  for (let x = 0; x < 20; x++) for (let y = 0; y < 9; y++) if (y !== 5) g._placementGridSet.add(`${x},${y}`);
  g.removeTower = (t) => { g.towers.splice(g.towers.indexOf(t), 1); g.runtimeIndexes.rebuildTowers(); };
  return g;
}

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const target = (g, type = 'giant', x = 300, y = 300) => {
  const e = new Enemy(type, pathPts, g);
  e.maxHp = e.hp = 1e6; e.baseSpeed = e.speed = 0; e.x = x; e.y = y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  return e;
};

// A8
{
  vt.t = 1e6; const g = makeGame();
  const e = target(g);
  for (let i = 0; i < 40; i++) e.applyPoison(0.35, 4200, 5000, CONFIG.TOWERS.poison.poisonStackMax);
  check('毒层数不超过 poisonStackMax', e.poisonStacks === CONFIG.TOWERS.poison.poisonStackMax, `stacks=${e.poisonStacks}`);
}

// A9：maxCount
{
  const g = makeGame();
  g.towers.push(new Tower('healer', 1, 1, g)); g.runtimeIndexes.rebuildTowers();
  check('医 maxCount=1：第二座不可放置', !g.canPlaceTower('healer', 2, 1) && /最多/.test(g.getPlacementBlockReason('healer', 2, 1) || ''), g.getPlacementBlockReason('healer', 2, 1));
  g.towers.push(new Tower('treasure', 3, 1, g), new Tower('treasure', 4, 1, g)); g.runtimeIndexes.rebuildTowers();
  check('财 maxCount=2：第三座不可放置', !g.canPlaceTower('treasure', 5, 1));
  check('其他塔不受影响', g.canPlaceTower('fire', 6, 1));
}

// A9：暗塔回血封顶
{
  vt.t = 1e6; const g = makeGame();
  const dark = new Tower('dark', 5, 4, g); g.towers.push(dark);
  for (let i = 0; i < 30; i++) {
    const e = new Enemy('corpse', pathPts, g); e.x = 100; e.y = 100;
    e.applyShadowMark(5000, dark); g.enemies.push(e); e.takeDamage(99);
  }
  check('暗塔单波回血以 healPerWaveMax 封顶', Math.abs(g.coreHp - (10 + CONFIG.TOWERS.dark.healPerWaveMax)) < 1e-6, `coreHp=${g.coreHp}`);
  Object.assign(g, { wave: 0, maxWave: 2, waveInProgress: false, spawnQueue: [], MAX_SPAWN_COUNT: 500,
    currentLevelData: { waves: [{ enemies: [] }, { enemies: [] }] }, gameOver() {} });
  g.startWave();
  check('新一波开始时回血计数重置', dark.healedThisWave === 0, `healedThisWave=${dark.healedThisWave}`);
}

// A9：碉反射
{
  vt.t = 1e6; const g = makeGame();
  const bunker = new Tower('bunker', 5, 5, g); g.towers.push(bunker);
  const e = target(g, 'giant');
  const hp0 = e.hp;
  bunker.takeDamage(2, e);
  check('碉受击时反射 reflectDamage', Math.abs((hp0 - e.hp) - CONFIG.TOWERS.bunker.reflectDamage) < 1e-9, `${hp0 - e.hp}`);
}

// A10
{
  vt.t = 1e6; const g = makeGame();
  const e = target(g);
  e.applySlow(0.45, 2800);
  e.applySlow(0.24, 1500);
  check('弱减速不覆盖强减速', e.slowAmount === 0.45, `slowAmount=${e.slowAmount}`);
  e.applySlow(0.6, 1000);
  check('更强减速可以覆盖', e.slowAmount === 0.6);
}

// A11
{
  vt.t = 1e6; const g = makeGame();
  const e = target(g);
  e.applyBurn(1500, 0);
  check('受击灼烧后带火标记', e.fireMarked === true);
  vt.t += 2000; e.update(vt.t, 16.67);
  check('灼烧结束后火标记被清除', e.fireMarked === false && e.burning === false);
}

// 壕：按 dt 结算
{
  const dmg = (fps) => {
    vt.t = 1e6; const g = makeGame();
    const moat = new Tower('moat', 5, 5, g); g.towers.push(moat);
    const e = target(g, 'giant', moat.x, moat.y);
    for (let t = 0; t < 5000; t += 1000 / fps) { vt.t += 1000 / fps; moat.checkMoatEffect(1000 / fps); }
    return 1e6 - e.hp;
  };
  const d = [30, 60, 144].map(dmg);
  const spread = (Math.max(...d) - Math.min(...d)) / Math.min(...d);
  check('壕 5 秒伤害与帧率无关且≈ damage×秒', spread < 0.05 && Math.abs(d[1] - CONFIG.TOWERS.moat.damage * 5) < 0.2, d.map((x) => x.toFixed(2)).join('/'));
}

// 陷：每个敌人只触发一次
{
  vt.t = 1e6; const g = makeGame();
  const trap = new Tower('trap', 5, 5, g); g.towers.push(trap);
  const e1 = target(g, 'giant', trap.x, trap.y);
  for (let i = 0; i < 20; i++) trap.checkTrapTrigger();
  check('同一敌人只消耗一次陷阱次数', trap.triggerCount === CONFIG.TOWERS.trap.triggerCount - 1, `triggerCount=${trap.triggerCount}`);
  const e2 = target(g, 'giant', trap.x, trap.y);
  trap.checkTrapTrigger();
  check('下一个敌人可再次触发', trap.triggerCount === CONFIG.TOWERS.trap.triggerCount - 2 && e2._trapHits.has(trap));
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n状态与数量上限回归测试通过');
