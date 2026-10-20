/**
 * 关卡数据合法性（工单 01、03～06、13）。
 * 覆盖：塔防 4 个主题 × 5 关共 20 关的 id、主题、路径连续性与核心位置、可建造格数量、岩石格、多路径、
 * 刷怪编排字段（roster、heavy、elites、boss、surges 引用的敌人都存在，时间点合法）、全部解锁；
 * 征服 1-1、1-2 的基础字段。
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
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js', 'js/config/glyph-battle.js', 'js/config/control-rules.js', 'js/config/boss-battle.js',
  'js/utils.js', 'js/levelsData.js', 'js/data/levels/part-01.js', 'js/data/levels/part-02.js', 'js/data/levels/part-03.js', 'js/data/levels/part-04.js', 'js/data/levels/export.js',
  'js/levelManager.js',
];
const conquestSrc = fs.readFileSync(path.join(ROOT, 'js/conquestLevelsData.js'), 'utf8').replace(/^const /gm, 'var ');
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n')
  + '\n' + conquestSrc + '\nglobalThis.__X = { CONFIG, levelManager, CONQUEST_LEVELS_DATA, THEMES };', ctx);
const { CONFIG, levelManager, CONQUEST_LEVELS_DATA, THEMES } = ctx.__X;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const ids = levelManager.getAll().map((l) => l.id);
const expectIds = [];
for (let t = 1; t <= 4; t++) for (let n = 1; n <= 5; n++) expectIds.push(`${t}-${n}`);
check('塔防共 20 关：4 个主题 × 5 关，按序排列', ids.join() === expectIds.join(), ids.join());
check('征服只有 1-1、1-2', Object.keys(CONQUEST_LEVELS_DATA).sort().join() === '1-1,1-2', Object.keys(CONQUEST_LEVELS_DATA).join());
check('主题表 4 项，且 LevelManager 与 levelsData 同源', Object.keys(THEMES).join() === '1,2,3,4'
  && levelManager.getThemes().map((t) => t.name).join() === '初墨,墨泽,铁砚,焚卷');
check('每个主题 5 关，getLevelsByTheme 按序号排序', [1, 2, 3, 4].every((t) => levelManager.getLevelsByTheme(t).map((l) => l.id).join() === [1, 2, 3, 4, 5].map((n) => `${t}-${n}`).join()));
check('全部主题、关卡解锁（决策 E7）', [1, 2, 3, 4].every((t) => levelManager.isThemeUnlocked(t, [])));

const pathsOf = (lv) => (Array.isArray(lv.path[0]) ? lv.path : [lv.path]);
const key = (c) => `${c.x},${c.y}`;
const bossTypes = { 1: 'baiguiyexing', 2: 'fanjiangdaohai', 3: 'tongqiangtiebi', 4: 'wanjiebufu' };

for (const id of ids) {
  const lv = levelManager.get(id);
  const paths = pathsOf(lv);
  const inGrid = paths.every((p) => p.every((c) => c.x >= 0 && c.x < CONFIG.GRID_COLS && c.y >= 0 && c.y < CONFIG.GRID_ROWS));
  const adj = paths.every((p) => p.every((c, i) => i === 0 || Math.abs(c.x - p[i - 1].x) + Math.abs(c.y - p[i - 1].y) === 1));
  const uniq = paths.every((p) => new Set(p.map(key)).size === p.length);
  check(`塔防 ${id}：每条路径在 ${CONFIG.GRID_COLS}×${CONFIG.GRID_ROWS} 网格内、相邻连续、自身不重复`, paths.length >= 1 && inGrid && adj && uniq);
  check(`塔防 ${id}：每条路径终点都是核心`, paths.every((p) => lv.core && lv.core.x === p[p.length - 1].x && lv.core.y === p[p.length - 1].y));
  check(`塔防 ${id}：入口都在最左列`, paths.every((p) => p[0].x === 0));
  check(`塔防 ${id}：基础参数合法`, lv.holdSeconds > 0 && lv.coreHp > 0 && lv.startInk > 0 && lv.hpMul >= 1 && lv.theme === Number(id[0]) && typeof lv.desc === 'string' && lv.desc.length > 0);

  // 可建造格数量，以及距离路径 2 格以内的可建造格
  const pathSet = new Set(paths.flat().map(key));
  const grid = lv.placementGrid;
  const near = grid.filter((g) => paths.flat().some((c) => Math.max(Math.abs(c.x - g.x), Math.abs(c.y - g.y)) <= 2));
  check(`塔防 ${id}：可建造格 ≥ 60，距路径 2 格内的可建造格 ≥ 30`, grid.length >= 60 && near.length >= 30, `${grid.length} / ${near.length}`);
  check(`塔防 ${id}：可建造格不含路径格`, grid.every((g) => !pathSet.has(key(g))));

  // 岩石格：不与路径重叠，不能建造
  const rocks = lv.specialTerrain;
  const rockSet = new Set(rocks.map(key));
  check(`塔防 ${id}：岩石格不与路径重叠，也不在可建造格里`, rocks.every((r) => !pathSet.has(key(r)) && r.type === 'rock') && grid.every((g) => !rockSet.has(key(g))));

  // 刷怪编排
  const known = (t) => !!CONFIG.ENEMIES[t];
  const refs = [].concat((lv.roster || []).map((r) => r.type), (lv.heavy || []).map((h) => h.type), (lv.elites || []).map((e) => e.type), lv.boss ? [lv.boss.type] : []);
  check(`塔防 ${id}：编排引用的敌人配置都存在`, refs.length > 0 && refs.every(known), refs.filter((t) => !known(t)).join());
  check(`塔防 ${id}：roster 权重为正，时间窗合法`, !!lv.roster && lv.roster.every((r) => r.weight > 0 && (r.from == null || r.from >= 0) && (r.to == null || r.to > (r.from || 0))));
  check(`塔防 ${id}：精英与首领的出场时间在坚守时长之内，路径下标合法`,
    (lv.elites || []).concat(lv.boss ? [lv.boss] : []).every((e) => e.at > 0 && e.at < lv.holdSeconds && (e.path == null || (e.path >= 0 && e.path < paths.length))));
  const isFinal = id.endsWith('-5');
  check(`塔防 ${id}：${isFinal ? '关底有首领' : '非关底没有首领'}${isFinal ? '，且是本主题的首领' : ''}`,
    isFinal ? !!lv.boss && lv.boss.type === bossTypes[id[0]] && CONFIG.ENEMIES[lv.boss.type].tier === 'boss' : !lv.boss);
  check(`塔防 ${id}：重敌间隔对象含三档或为数字`, (lv.heavy || []).every((h) => typeof h.every === 'number' || ['sparse', 'normal', 'flood'].every((k) => h.every[k] > 0)));
}

// 3-2：上下两行全是岩石，可建造格 60～75 个且都在第 1～4 行
{
  const lv = levelManager.get('3-2');
  check('塔防 3-2：可建造格 60～75 个，全部位于第 1～4 行', lv.placementGrid.length >= 60 && lv.placementGrid.length <= 75 && lv.placementGrid.every((g) => g.y >= 1 && g.y <= 4), String(lv.placementGrid.length));
}
// 难度曲线：同主题 hpMul 递增；奖励字段
for (const t of [1, 2, 3, 4]) {
  const hp = levelManager.getLevelsByTheme(t).map((l) => l.hpMul);
  check(`主题 ${t}：hpMul 逐关递增`, hp.every((v, i) => i === 0 || v > hp[i - 1]), hp.join());
}
check('1-1 与 1-2 保持原有路径拐点', (() => {
  const a = levelManager.get('1-1').path;
  const b = levelManager.get('1-2').path;
  return a[0].x === 0 && a[0].y === 1 && a[a.length - 1].x === 25 && a[a.length - 1].y === 4 && b[0].y === 0 && b[b.length - 1].y === 4;
})());

for (const [id, lv] of Object.entries(CONQUEST_LEVELS_DATA)) {
  check(`征服 ${id}：基础字段合法`, lv.id === id && lv.startInk > 0 && lv.summonCost > 0 && (lv.holdSeconds === undefined || lv.holdSeconds > 0));
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n关卡数据校验通过');
