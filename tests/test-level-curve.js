/**
 * 关卡数据合法性（原「关卡曲线」测试在工单 07 改写：只剩 4 关，曲线已无意义）。
 * 覆盖：塔防 1-1、1-2 与征服 1-1、1-2 的 id、网格、路径连续性、核心位置、坚守时长。
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
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/glyph-battle.js',
  'js/utils.js', 'js/levelsData.js', 'js/data/levels/part-01.js', 'js/data/levels/export.js',
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

const ids = levelManager.getAll().map((l) => l.id);
check('塔防只有 1-1、1-2', ids.join() === '1-1,1-2', ids.join());
check('征服只有 1-1、1-2', Object.keys(CONQUEST_LEVELS_DATA).sort().join() === '1-1,1-2', Object.keys(CONQUEST_LEVELS_DATA).join());

for (const id of ['1-1', '1-2']) {
  const lv = levelManager.get(id);
  const p = lv.path;
  const inGrid = p.every((c) => c.x >= 0 && c.x < CONFIG.GRID_COLS && c.y >= 0 && c.y < CONFIG.GRID_ROWS);
  const adj = p.every((c, i) => i === 0 || Math.abs(c.x - p[i - 1].x) + Math.abs(c.y - p[i - 1].y) === 1);
  const uniq = new Set(p.map((c) => c.x + ',' + c.y)).size === p.length;
  const last = p[p.length - 1];
  check(`塔防 ${id}：路径在 ${CONFIG.GRID_COLS}×${CONFIG.GRID_ROWS} 网格内、相邻连续、无重复`, p.length > 1 && inGrid && adj && uniq);
  check(`塔防 ${id}：核心在路径终点`, lv.core && lv.core.x === last.x && lv.core.y === last.y);
  check(`塔防 ${id}：坚守时长与初始参数合法`, (lv.holdSeconds === undefined || lv.holdSeconds > 0) && lv.coreHp > 0 && lv.startInk > 0);
}

for (const [id, lv] of Object.entries(CONQUEST_LEVELS_DATA)) {
  check(`征服 ${id}：基础字段合法`, lv.id === id && lv.startInk > 0 && lv.summonCost > 0 && (lv.holdSeconds === undefined || lv.holdSeconds > 0));
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n关卡数据校验通过');
