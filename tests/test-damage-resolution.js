/**
 * 伤害结算回归测试：加载真实配置与真实 Enemy 类。
 * 覆盖：A1 小数伤害不被取整；A3 相邻寄生敌人死亡不递归崩溃。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, Date, Set, Map, Array, Object, JSON, setTimeout, clearTimeout };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js',
  'js/config/fusion.js', 'js/utils.js', 'js/enemy.js',
  'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js',
];
const src = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\nglobalThis.__X = { Enemy, CONFIG };';
vm.runInContext(src, ctx);
const { Enemy, CONFIG } = ctx.__X;

const game = {
  ink: 0, coreHp: 20, updateUI() {}, enemies: [], towers: [],
  particleSystem: { createExplosion() {} },
  runtimeIndexes: { aliveEnemies: [] },
  triggerExplosion() {}, spawnSplitEnemy() {},
};
const pathPts = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
const make = (type) => new Enemy(type, pathPts, game);

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

// A1：木塔 1 级伤害 0.45 不再被截断为 0
{
  const e = make('corpse');
  e.takeDamage(CONFIG.TOWERS.wood.damage);
  check('木塔 1 级对 corpse 伤害 > 0', e.hp < e.maxHp, `hp ${e.maxHp} -> ${e.hp}`);
}

// A1：护甲按浮点结算（armor 20%，火塔 1.1 -> 0.88）
{
  const e = make('armor');
  e.takeDamage(1.1);
  check('火塔 1.1 对 armor 伤害 ≈ 0.88', Math.abs((e.maxHp - e.hp) - 0.88) < 1e-9, `loss ${e.maxHp - e.hp}`);
}

// A1：标记加成不被取整
{
  const e = make('overlord');
  e.markBonus = 0.35;
  e.takeDamage(1);
  const expected = 1 * 1.35 * (1 - CONFIG.ENEMIES.overlord.armorReduction);
  check('标记+护甲连乘为浮点', Math.abs((e.maxHp - e.hp) - expected) < 1e-9, `loss ${e.maxHp - e.hp}`);
}

// A3：两只相邻、均被寄生的敌人先后死亡不应递归
{
  const a = make('corpse');
  const b = make('corpse');
  a.x = 100; a.y = 100; b.x = 120; b.y = 100;
  b.hp = 2;
  game.enemies = [a, b];
  game.runtimeIndexes.aliveEnemies = [a, b];
  a.applyParasite(5000);
  b.applyParasite(5000);
  let err = null;
  try { a.takeDamage(99); } catch (e) { err = e; }
  check('相邻寄生敌人死亡不抛 RangeError', !err, err && err.message);
  check('两只敌人均已死亡且奖励只结算一次', a.dead && b.dead && game.ink === 2 * CONFIG.ENEMIES.corpse.reward, `ink=${game.ink}`);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n伤害结算回归测试通过');
