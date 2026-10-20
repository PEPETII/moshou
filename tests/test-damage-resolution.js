/**
 * 伤害结算回归测试：加载真实配置与真实 Enemy 类（出场敌人：尸、鬼、巨）。
 * 覆盖：小数伤害不被取整；Enemy.hit 统一入口记录来源；击杀只结算一次奖励与分裂/漏怪不重复；
 *       重敌 weight > 1；死亡后继续受击无副作用。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, Date, Set, Map, WeakMap, Array, Object, JSON, setTimeout, clearTimeout };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js', 'js/config/glyph-battle.js', 'js/config/control-rules.js', 'js/config/boss-battle.js',
  'js/utils.js', 'js/core/path-track.js', 'js/enemy.js',
  'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js', 'js/entities/enemy/motion.js', 'js/glyph/control-rules.js', 'js/entities/enemy/segments.js', 'js/entities/enemy/abilities/registry.js', 'js/entities/enemy/abilities/minor-a.js', 'js/entities/enemy/abilities/minor-b.js', 'js/entities/enemy/abilities/elite.js', 'js/entities/enemy/abilities/boss.js',
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

// 小数伤害不被取整
{
  const e = make('corpse');
  e.takeDamage(0.45);
  check('0.45 点伤害不被截断为 0', Math.abs((e.maxHp - e.hp) - 0.45) < 1e-9, `loss ${e.maxHp - e.hp}`);
}

// 三种出场敌人都能受伤并死亡，奖励只结算一次
for (const type of CONFIG.ACTIVE_ENEMIES) {
  game.ink = 0;
  const e = make(type);
  e.takeDamage(1e6);
  e.takeDamage(1e6);
  check(`${type}：致死伤害后 dead，奖励只结算一次`, e.dead && game.ink === CONFIG.ENEMIES[type].reward, `ink=${game.ink}`);
}

// Enemy.hit 统一入口：记录来源并扣血
{
  const e = make('ghost');
  const before = e.hp;
  e.hit(5, { kind: 'fire' });
  check('Enemy.hit 扣血并记录 lastHitKind', before - e.hp > 0 && e.lastHitKind === 'fire', `hp ${before}->${e.hp} kind=${e.lastHitKind}`);
}

// 死亡后继续受击不改变奖励与状态
{
  game.ink = 0;
  const e = make('corpse');
  e.hit(1e6, { kind: 'water' });
  const ink = game.ink;
  e.hit(10, { kind: 'water' });
  check('死亡后再受击不重复结算', e.dead && game.ink === ink);
}

// 重敌：巨 weight > 1，尸 / 鬼 ≤ 1
check('巨为重敌（weight > 1），尸、鬼不是', CONFIG.ENEMIES.giant.weight > 1 && !(CONFIG.ENEMIES.corpse.weight > 1) && !(CONFIG.ENEMIES.ghost.weight > 1),
  `giant=${CONFIG.ENEMIES.giant.weight}`);

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n伤害结算回归测试通过');
