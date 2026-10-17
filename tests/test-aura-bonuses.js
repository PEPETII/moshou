/**
 * 光环加成回归测试：加载真实配置与真实 Tower/Enemy/Game.updateAuras。
 * 覆盖：鼓(攻速)、旗(射程)、镜(反射)生效，且光环塔移除后加成消失。
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
  'js/entities/towers/misc.js', 'js/entities/towers/projectiles.js',
  'js/enemy.js', 'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js',
];
const src = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\nclass Game {}\n' + fs.readFileSync(path.join(ROOT, 'js/core/waves.js'), 'utf8')
  + '\nglobalThis.__X = { Tower, Enemy, Game, RuntimeIndexes, CONFIG };';
vm.runInContext(src, ctx);
const { Tower, Enemy, Game, RuntimeIndexes, CONFIG } = ctx.__X;

const pathPts = [];
for (let x = 0; x < 20; x++) pathPts.push({ x, y: 5 });

function makeGame() {
  const g = new Game();
  Object.assign(g, { ink: 0, coreHp: 20, towers: [], enemies: [], updateUI() {}, particleSystem: { createExplosion() {} } });
  g.runtimeIndexes = new RuntimeIndexes(g);
  g.removeTower = (t) => { g.towers.splice(g.towers.indexOf(t), 1); g.runtimeIndexes.rebuildTowers(); };
  return g;
}

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

function countShots(withDrum) {
  vt.t = 1e6;
  const g = makeGame();
  const fire = new Tower('fire', 6, 4, g);
  g.towers.push(fire);
  if (withDrum) g.towers.push(new Tower('drum', 5, 4, g));
  const e = new Enemy('overlord', pathPts, g);
  e.maxHp = e.hp = 1e6; e.baseSpeed = e.speed = 0; e.x = fire.x + 100; e.y = fire.y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  let shots = 0;
  const orig = fire.attack.bind(fire);
  fire.attack = (t, n) => { shots++; return orig(t, n); };
  for (let i = 0; i < 3600; i++) { // 60 秒
    vt.t += 16.67; g.updateAuras();
    for (const t of g.towers) t.update(vt.t, 16.67, g.runtimeIndexes.aliveEnemies);
  }
  return shots;
}

// 鼓：攻速
{
  const base = countShots(false), drum = countShots(true);
  const expected = base * (1 + CONFIG.TOWERS.drum.auraValue);
  check('鼓提升火塔出手次数', drum > base, `无鼓 ${base} / 有鼓 ${drum}`);
  check('提升幅度≈ +auraValue', Math.abs(drum - expected) / expected < 0.05, `期望≈${expected.toFixed(1)}`);
}

// 旗：射程；光环塔移除后失效
{
  vt.t = 1e6;
  const g = makeGame();
  const fire = new Tower('fire', 6, 4, g);
  const banner = new Tower('banner', 5, 4, g);
  g.towers.push(fire, banner);
  const e = new Enemy('corpse', pathPts, g);
  e.x = fire.x + (fire.range + 0.5) * CONFIG.CELL_SIZE; e.y = fire.y;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  g.updateAuras();
  check('旗使射程外目标进入射程', !!fire.findTarget(g.runtimeIndexes.aliveEnemies), `range ${fire.range} -> ${fire.getEffectiveRange()}`);
  g.removeTower(banner);
  g.updateAuras();
  check('旗被移除后射程恢复', !fire.findTarget(g.runtimeIndexes.aliveEnemies) && fire.getEffectiveRange() === fire.range);
}

// 镜：反射（山塔额外 mountainBonus）
{
  vt.t = 1e6;
  const g = makeGame();
  const mirror = new Tower('mirror', 5, 4, g);
  const wall = new Tower('wall', 5, 5, g);
  g.towers.push(mirror, wall);
  g.runtimeIndexes.rebuildTowers();
  g.updateAuras();
  const e = new Enemy('overlord', pathPts, g);
  const hp0 = e.hp;
  wall.takeDamage(4, e);
  const ratio = (hp0 - e.hp) / (4 * (1 - CONFIG.ENEMIES.overlord.armorReduction));
  const expected = CONFIG.TOWERS.mirror.auraValue + CONFIG.TOWERS.mirror.mountainBonus;
  check('镜按 auraValue+mountainBonus 反射路径塔受到的伤害', Math.abs(ratio - expected) < 1e-6, `反射比 ${ratio.toFixed(3)} 期望 ${expected}`);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n光环加成回归测试通过');
