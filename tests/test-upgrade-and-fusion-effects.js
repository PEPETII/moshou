/**
 * 升级参数与融合塔字段回归测试：加载真实配置与真实 Tower/FusionTower/Enemy。
 * 覆盖：A6 升级后的状态参数被施加；A7 融合塔带上组件的状态/链式字段。
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
  + '\nclass Game {}\n' + fs.readFileSync(path.join(ROOT, 'js/core/waves.js'), 'utf8')
  + '\nglobalThis.__X = { Tower, FusionTower, Enemy, Game, RuntimeIndexes, CONFIG };';
vm.runInContext(src, ctx);
const { Tower, FusionTower, Enemy, Game, RuntimeIndexes, CONFIG } = ctx.__X;

const pathPts = [];
for (let x = 0; x < 20; x++) pathPts.push({ x, y: 5 });

function makeGame() {
  const g = new Game();
  Object.assign(g, { ink: 1e6, coreHp: 20, towers: [], enemies: [], updateUI() {}, particleSystem: { createExplosion() {}, createPoisonCloud() {} } });
  g.runtimeIndexes = new RuntimeIndexes(g);
  return g;
}

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

/** 让塔对一个静止靶开火并结算投射物，返回 { tower, enemy, hpLost } */
function fireAt(makeTower, level = 1, enemyType = 'giant') {
  vt.t = 1e6;
  const g = makeGame();
  const tw = makeTower(g);
  g.towers.push(tw);
  while (tw.level < level) tw.upgrade();
  const e = new Enemy(enemyType, pathPts, g);
  e.maxHp = e.hp = 1e6; e.baseSpeed = e.speed = 0;
  e.x = tw.x + 60; e.y = tw.y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  for (let i = 0; i < 4; i++) {
    tw.attack(e, vt.t);
    for (let k = 0; k < 60 && tw.projectiles.length; k++) tw.updateProjectiles(16.67);
    vt.t += 2000;
  }
  return { tw, e, hpLost: 1e6 - e.hp };
}

// A6：升级后的参数被施加
{
  const { tw, e } = fireAt((g) => new Tower('poison', 5, 4, g), 3);
  check('毒 3 级施加升级后的毒伤', Math.abs(e.poisonDamage - tw.poisonDamage) < 1e-9 && tw.poisonDamage > CONFIG.TOWERS.poison.poisonDamage, `塔 ${tw.poisonDamage.toFixed(2)} / 敌 ${e.poisonDamage}`);
}
{
  const { tw, e } = fireAt((g) => new Tower('talisman', 5, 4, g), 3);
  check('符 3 级施加升级后的标记加成/时长', Math.abs(e.markBonus - tw.markBonus) < 1e-9 && e.markBonus > CONFIG.TOWERS.talisman.markBonus, `标记 ${e.markBonus.toFixed(2)}`);
}
{
  vt.t = 1e6;
  const g = makeGame();
  const tw = new Tower('ice', 5, 4, g);
  g.towers.push(tw); while (tw.level < 3) tw.upgrade();
  const e = new Enemy('giant', pathPts, g); e.maxHp = e.hp = 1e6; e.baseSpeed = e.speed = 0; e.x = tw.x + 60; e.y = tw.y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  tw.attack(e, vt.t);
  for (let k = 0; k < 60 && tw.projectiles.length; k++) tw.updateProjectiles(16.67);
  e.frozen = false; e.frozenCooldownEnd = 0;
  tw.attack(e, vt.t);
  for (let k = 0; k < 60 && tw.projectiles.length; k++) tw.updateProjectiles(16.67);
  check('冰 3 级冻结时长取升级后的值', e.frozen && Math.abs((e.frozenEnd - vt.t) - tw.freezeDuration) < 50, `${e.frozenEnd - vt.t} / ${tw.freezeDuration}`);
}

// A7：融合塔字段补全
function fusionTest(key, label, predicate, detail) {
  const r = fireAt((g) => new FusionTower(key, 5, 4, g));
  check(label, predicate(r), detail ? detail(r) : `hpLost=${r.hpLost.toFixed(2)}`);
}
fusionTest('thunder+thunder', '霆(雷+雷)能出手造成伤害', (r) => r.hpLost > 0);
fusionTest('water+water', '淼(水+水)能减速', (r) => r.e.slowed || r.e.slowAmount > 0, (r) => `slow=${r.e.slowAmount}`);
fusionTest('poison+poison', '蛊(毒+毒)能施加中毒', (r) => r.e.poisonStacks > 0, (r) => `stacks=${r.e.poisonStacks}`);
fusionTest('dark+dark', '冥(暗+暗)能施加影印', (r) => r.e.shadowMark);
fusionTest('ice+ice', '凌(冰+冰)能减速', (r) => r.e.slowAmount > 0, (r) => `slow=${r.e.slowAmount}`);
fusionTest('parasite+poison', '蛊毒能施加寄生与中毒', (r) => r.e.parasite && r.e.poisonStacks > 0);
fusionTest('thunder+water', '雷电(雷+水)造成伤害并减速', (r) => r.hpLost > 0 && r.e.slowAmount > 0);

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n升级参数与融合塔字段回归测试通过');
