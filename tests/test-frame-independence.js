/**
 * 帧率无关回归测试：加载真实配置与真实 Tower/Enemy。
 * 覆盖：A2 路径阻挡塔拆除时间；A4 阵光环 dot 伤害与击杀。
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
  + '\nglobalThis.__X = { Tower, Enemy, RuntimeIndexes, CONFIG };';
vm.runInContext(src, ctx);
const { Tower, Enemy, RuntimeIndexes, CONFIG } = ctx.__X;

const pathPts = [];
for (let x = 0; x < 20; x++) pathPts.push({ x, y: 5 });

function makeGame() {
  const game = { ink: 0, coreHp: 20, towers: [], enemies: [], updateUI() {}, particleSystem: { createExplosion() {} } };
  game.runtimeIndexes = new RuntimeIndexes(game);
  game.removeTower = (t) => {
    game.towers.splice(game.towers.indexOf(t), 1);
    game.runtimeIndexes.rebuildTowers();
  };
  return game;
}

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

function breakTime(towerType, enemyType, fps) {
  vt.t = 1e6;
  const g = makeGame();
  const tw = new Tower(towerType, 5, 5, g);
  g.towers.push(tw);
  g.runtimeIndexes.rebuildTowers();
  const e = new Enemy(enemyType, pathPts, g);
  g.enemies.push(e);
  e.pathIndex = 4; e.x = 4 * 48 + 34; e.y = 5 * 48 + 24;
  const dt = 1000 / fps;
  let t = 0;
  while (g.towers.length && t < 120000) { vt.t += dt; t += dt; e.update(vt.t, dt); }
  return t;
}

function dotDamage(fps, seconds) {
  vt.t = 1e6;
  const g = makeGame();
  const f = new Tower('formation', 5, 4, g);
  g.towers.push(f);
  const e = new Enemy('overlord', pathPts, g);
  e.x = 5 * 48 + 24; e.y = 5 * 48 + 24; e.pathIndex = 5; e.baseSpeed = e.speed = 0;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  const dt = 1000 / fps;
  for (let t = 0; t < seconds * 1000; t += dt) { vt.t += dt; f.update(vt.t, dt, g.runtimeIndexes.aliveEnemies); }
  return e.maxHp - e.hp;
}

// A2
{
  const times = [30, 60, 144].map((fps) => breakTime('wall', 'corpse', fps));
  const spread = (Math.max(...times) - Math.min(...times)) / Math.min(...times);
  const expected = CONFIG.TOWERS.wall.hp * CONFIG.GAMEPLAY.blockAttackInterval / CONFIG.ENEMIES.corpse.damage;
  check('壁被 corpse 拆除时间与帧率无关(<5%)', spread < 0.05, `30/60/144fps = ${times.map(Math.round).join('/')}ms`);
  check('拆除时间≈ hp×间隔/伤害', Math.abs(times[1] - expected) / expected < 0.05, `预期 ${expected}ms`);
}

// A4
{
  const d = [30, 60, 144].map((fps) => dotDamage(fps, 10));
  const spread = (Math.max(...d) - Math.min(...d)) / Math.min(...d);
  check('阵光环 10 秒 dot 伤害与帧率无关(<5%)', spread < 0.05, `30/60/144fps = ${d.map((x) => x.toFixed(2)).join('/')}`);
  check('阵光环伤害≈ auraValue×秒数', Math.abs(d[1] - CONFIG.TOWERS.formation.auraValue * 10) < 0.5, `期望 ${CONFIG.TOWERS.formation.auraValue * 10}`);

  vt.t = 1e6;
  const g = makeGame();
  const f = new Tower('formation', 5, 4, g);
  g.towers.push(f);
  const e = new Enemy('corpse', pathPts, g);
  e.x = 5 * 48 + 24; e.y = 5 * 48 + 24; e.pathIndex = 5; e.baseSpeed = e.speed = 0;
  g.enemies.push(e); g.runtimeIndexes.rebuildEnemies();
  for (let t = 0; t < 20000 && !e.dead; t += 16.67) {
    vt.t += 16.67; f.update(vt.t, 16.67, g.runtimeIndexes.aliveEnemies); g.runtimeIndexes.rebuildEnemies();
  }
  check('阵光环 dot 致死走 die()：dead 且获得奖励', e.dead && g.ink === CONFIG.ENEMIES.corpse.reward, `dead=${e.dead} ink=${g.ink}`);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n帧率无关回归测试通过');
