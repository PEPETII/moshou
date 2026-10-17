/**
 * 回归测试：土塔 AoE 半径、路径融合塔攻击、灯显形、敌人死亡爆炸对象。
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
  + '\nglobalThis.__X = { Tower, FusionTower, Enemy, Game, RuntimeIndexes, CONFIG };';
vm.runInContext(src, ctx);
const { Tower, FusionTower, Enemy, Game, RuntimeIndexes, CONFIG } = ctx.__X;

const pathPts = [];
for (let x = 0; x < 20; x++) pathPts.push({ x, y: 5 });

function makeGame() {
  const g = new Game();
  Object.assign(g, { ink: 0, coreHp: 20, maxCoreHp: 20, towers: [], enemies: [], updateUI() {}, particleSystem: { createExplosion() {} } });
  g.runtimeIndexes = new RuntimeIndexes(g);
  g.removeTower = (t) => { g.towers.splice(g.towers.indexOf(t), 1); g.runtimeIndexes.rebuildTowers(); };
  return g;
}
let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const enemyAt = (g, type, x, y) => {
  const e = new Enemy(type, pathPts, g);
  e.maxHp = e.hp = 1e6; e.baseSpeed = e.speed = 0; e.x = x; e.y = y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  return e;
};

// A12：土塔以 aoeRange 为半径
{
  vt.t = 1e6; const g = makeGame();
  const earth = new Tower('earth', 5, 4, g); g.towers.push(earth);
  const center = enemyAt(g, 'giant', 400, 200);
  const inside = enemyAt(g, 'giant', 400 + (CONFIG.TOWERS.earth.aoeRange - 0.2) * 48, 200);
  const outside = enemyAt(g, 'giant', 400 + (CONFIG.TOWERS.earth.aoeRange + 0.4) * 48, 200);
  earth.aoeAttack(center);
  check('半径内敌人受伤、半径外不受伤（半径=aoeRange）', inside.hp < 1e6 && outside.hp === 1e6, `aoeRange=${earth.aoeRange}`);
  const f = new FusionTower('earth+wood', 5, 4, g);
  check('融合土系继承 aoeRange', f.aoeRange === CONFIG.TOWERS.earth.aoeRange, `${f.aoeRange}`);
}

// A13：路径融合塔会攻击
{
  vt.t = 1e6; const g = makeGame();
  const tw = new FusionTower('mountain+water', 5, 5, g); g.towers.push(tw);
  enemyAt(g, 'giant', tw.x + 60, tw.y);
  let attacked = 0; const orig = tw.attack.bind(tw); tw.attack = (t, n) => { attacked++; return orig(t, n); };
  for (let i = 0; i < 300; i++) { vt.t += 16.67; tw.update(vt.t, 16.67, g.runtimeIndexes.aliveEnemies); }
  check('山清水秀(路径融合)在射程内主动出手', attacked > 0 && tw.onPath, `attacks=${attacked}`);
}

// 灯显形
{
  vt.t = 1e6; const g = makeGame();
  const lantern = new Tower('lantern', 5, 4, g); g.towers.push(lantern);
  const e = enemyAt(g, 'phantom', lantern.x + 20, lantern.y);
  e.takeDamage(5);
  const before = e.hp;
  lantern.update(vt.t, 16.67, g.runtimeIndexes.aliveEnemies);
  e.takeDamage(5);
  check('永久隐身敌人未显形时不受伤，灯照亮后受伤', before === 1e6 && e.hp < 1e6, `hp=${e.hp}`);
}

// 死亡爆炸只伤路径塔
{
  vt.t = 1e6; const g = makeGame();
  const wall = new Tower('wall', 5, 5, g); const fire = new Tower('fire', 5, 4, g);
  g.towers.push(wall, fire); g.runtimeIndexes.rebuildTowers();
  const bomber = new Enemy('bomber', pathPts, g); bomber.x = wall.x; bomber.y = wall.y; g.enemies.push(bomber);
  const ally = enemyAt(g, 'giant', wall.x + 20, wall.y);
  bomber.takeDamage(999);
  check('爆炸型敌人不再伤害同伴', ally.hp === 1e6, `ally hp=${ally.hp}`);
  check('爆炸伤害范围内的路径塔', wall.hp < CONFIG.TOWERS.wall.hp, `wall ${wall.hp}/${CONFIG.TOWERS.wall.hp}`);
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\nAoE/路径融合/灯/爆炸回归测试通过');
