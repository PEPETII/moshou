/**
 * 关卡曲线护栏：直接读取真实关卡数据与征服模式生成器。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, Set, Map, Array, Object, JSON, LEVELS_DATA: {} };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/fusion.js',
  'js/utils.js', 'js/levelsData.js', 'js/data/levels/part-01.js', 'js/data/levels/part-02.js', 'js/data/levels/export.js',
  'js/levelManager.js',
];
const conquestSrc = fs.readFileSync(path.join(ROOT, 'js/conquestLevelsData.js'), 'utf8').replace(/^const /gm, 'var ');
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\n' + conquestSrc + '\nglobalThis.__X = { CONFIG, levelManager, CONQUEST_LEVELS_DATA };', ctx);
const { CONFIG, levelManager, CONQUEST_LEVELS_DATA } = ctx.__X;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const E = CONFIG.ENEMIES;
const totalHp = (lv) => lv.waves.reduce((a, w) => a + w.enemies.reduce((b, g) => b + E[g.type].hp * g.count, 0), 0);

// 每个主题 10 关，且全部敌人类型存在
for (let t = 1; t <= 5; t++) {
  check(`主题 ${t} 共 10 关`, levelManager.getLevelsByTheme(t).length === 10);
}
let unknown = [];
for (const lv of levelManager.getAll()) for (const w of lv.waves) for (const g of w.enemies) if (!E[g.type]) unknown.push(`${lv.id}:${g.type}`);
check('关卡引用的敌人类型都存在', unknown.length === 0, unknown.join(','));

// 主题内总 HP 基本单调（容许 5% 回落）
const bad = [];
for (let t = 1; t <= 5; t++) {
  const lvs = levelManager.getLevelsByTheme(t);
  for (let i = 1; i < lvs.length; i++) {
    if (totalHp(lvs[i]) < totalHp(lvs[i - 1]) * 0.95) bad.push(`${lvs[i - 1].id}->${lvs[i].id}`);
  }
}
check('主题内总 HP 基本单调不降(容差 5%)', bad.length === 0, bad.join(' '));

// 各主题平均总 HP 不低于主题 1
const avg = (t) => levelManager.getLevelsByTheme(t).reduce((a, l) => a + totalHp(l), 0) / 10;
check('各主题平均总 HP ≥ 主题 1', [2, 3, 4, 5].every((t) => avg(t) >= avg(1)), [1, 2, 3, 4, 5].map((t) => Math.round(avg(t))).join('/'));

// 第一关不含 overlord
check('1-1 不含始终霸王', !JSON.stringify(levelManager.get('1-1').waves).includes('overlord'));

// 征服模式
const cl = Object.values(CONQUEST_LEVELS_DATA);
check('征服模式 25 关', cl.length === 25);
let distinct = true;
for (let t = 1; t <= 5; t++) {
  const sigs = cl.filter((l) => l.theme === t).map((l) => JSON.stringify(l.waves));
  if (new Set(sigs).size < 3) distinct = false;
}
check('征服同主题各关波次不再完全相同', distinct);
check('征服每波数量在 3~50 且 delay 被设置', cl.every((l) => l.waves.every((w) => w.count >= 3 && w.count <= 50 && w.delay >= 300)));
check('征服末主题末波为始终霸王', CONQUEST_LEVELS_DATA['5-5'].waves.slice(-1)[0].type === 'overlord');
check('征服召唤费用随数量递增配置存在', cl.every((l) => l.summonCostGrowth > 0));

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n关卡曲线护栏通过');
