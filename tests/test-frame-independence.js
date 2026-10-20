/**
 * 帧率无关回归测试（路程制敌人）：30 / 60 / 144 fps 下模拟 10 秒，结果误差 < 1%。
 * 覆盖：匀速前进的路程 s；湿身减速下的 s；眩晕后恢复前进；灼烧叠层的总伤害。
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

// 足够长的直线路径（26 格），10 秒内不会走到终点
const cells = [];
for (let x = 0; x < 26; x++) cells.push({ x, y: 2 });
const game = {
  ink: 0, coreHp: 20, updateUI() {}, enemies: [], towers: [],
  particleSystem: { createExplosion() {} },
  runtimeIndexes: { aliveEnemies: [], getBlockingTowerAt: () => null },
  triggerExplosion() {}, spawnSplitEnemy() {},
};

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const FPS = [30, 60, 144];
const spread = (arr) => (Math.max(...arr) - Math.min(...arr)) / Math.max(1e-9, Math.abs(Math.min(...arr)));

function run(fps, seconds, setup, type) {
  vt.t = 1e6;
  const e = new Enemy(type || 'giant', cells, game);
  e.lane = 0; e.s = 0; e.baseSpeed = e.speed = 1; e.syncPosition();
  if (setup) setup(e);
  const dt = 1000 / fps;
  const steps = Math.round(seconds * fps);
  for (let i = 0; i < steps; i++) { vt.t += dt; e.update(vt.t, dt); }
  return e;
}

// 匀速前进
{
  const s = FPS.map((f) => run(f, 10).s);
  check('匀速前进：10 秒后 s 误差 < 1%', spread(s) < 0.01, s.map((x) => x.toFixed(1)).join('/'));
  check('匀速前进：s ≈ 速度×格长×秒', Math.abs(s[1] - 10 * CONFIG.CELL_SIZE) / (10 * CONFIG.CELL_SIZE) < 0.01, `s=${s[1]}`);
}

// 湿身减速（持续 > 10 秒）
{
  const s = FPS.map((f) => run(f, 10, (e) => e.makeWet(20)).s);
  const expected = 10 * CONFIG.CELL_SIZE * (1 - CONFIG.GLYPH_STATUS.wetSlow);
  check('湿身减速：10 秒后 s 误差 < 1%', spread(s) < 0.01, s.map((x) => x.toFixed(1)).join('/'));
  check('湿身减速：s ≈ (1 − wetSlow) × 匀速', Math.abs(s[1] - expected) / expected < 0.01, `s=${s[1].toFixed(1)} 期望 ${expected.toFixed(1)}`);
}

// 眩晕 2 秒后继续前进
{
  const s = FPS.map((f) => run(f, 10, (e) => e.glyphStun(2), 'corpse').s);   // 小怪的眩晕不打折（重敌 × 0.7 见 test:control）
  const expected = 8 * CONFIG.CELL_SIZE;
  check('眩晕 2 秒：10 秒后 s 误差 < 1%', spread(s) < 0.01, s.map((x) => x.toFixed(1)).join('/'));
  check('眩晕 2 秒：s ≈ 8 秒的路程', Math.abs(s[1] - expected) / expected < 0.01, `s=${s[1].toFixed(1)} 期望 ${expected.toFixed(1)}`);
}

// 灼烧叠层：封顶层数、持续 10 秒，总伤害 ≈ dps × 层数 × 秒
{
  const dmg = FPS.map((f) => {
    const e = run(f, 10, (x) => { x.baseSpeed = x.speed = 0; x.hp = x.maxHp = 1e6; x.ignite(CONFIG.GLYPH_STATUS.burnMaxStacks + 3, 10); });
    return e.maxHp - e.hp;
  });
  const expected = CONFIG.GLYPH_STATUS.burnDps * CONFIG.GLYPH_STATUS.burnMaxStacks * 10;
  check('灼烧叠层：10 秒总伤害误差 < 3%（按 0.45 秒合并显示的粒度）', spread(dmg) < 0.03, dmg.map((x) => x.toFixed(1)).join('/'));
  check('灼烧叠层：总伤害 ≈ dps×封顶层数×秒', Math.abs(dmg[1] - expected) / expected < 0.02, `dmg=${dmg[1].toFixed(1)} 期望 ${expected}`);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n帧率无关回归测试通过');
