/**
 * 工单 02 护栏：塔池收缩、关卡精简、升级移除、旧存档兼容。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
const ctx = {
  console, Math, Set, Map, Array, Object, JSON, Date, setTimeout, clearTimeout,
  LEVELS_DATA: {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js', 'js/config/glyph-battle.js', 'js/config/control-rules.js', 'js/config/boss-battle.js',
  'js/utils.js', 'js/levelsData.js', 'js/data/levels/part-01.js', 'js/data/levels/part-02.js', 'js/data/levels/part-03.js', 'js/data/levels/part-04.js', 'js/data/levels/export.js',
  'js/levelManager.js', 'js/tower.js', 'js/entities/towers/misc.js',
];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const conquestSrc = (read('js/conquestLevelsData.js') + '\n' + read('js/conquestProgress.js')).replace(/^const /gm, 'var ');
vm.runInContext(files.map(read).join('\n;\n')
  + '\nclass Game {}\n' + read('js/core/towers.js') + '\n' + conquestSrc
  + '\nglobalThis.__X = { CONFIG, levelManager, LEVELS_DATA, THEMES, CONQUEST_THEMES, CONQUEST_LEVELS_DATA, conquestProgress, Game, Tower };', ctx);
const X = ctx.__X;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

// 塔池
check('ACTIVE_TOWERS 为十二座单字塔', JSON.stringify(X.CONFIG.ACTIVE_TOWERS) === '["fire","water","earth","wood","gold","wind","cannon","thunder","ice","bow","mountain","sword"]');
check('getUnlockedTowers 读取塔池', JSON.stringify(X.Game.prototype.getUnlockedTowers.call({})) === '["fire","water","earth","wood","gold","wind","cannon","thunder","ice","bow","mountain","sword"]');
check('塔配置只有十二座单字塔与三座合字塔', Object.keys(X.CONFIG.TOWERS).join() === 'fire,water,earth,wood,gold,wind,cannon,thunder,ice,bow,mountain,sword,yan,lin,fen');
check('塔池成员都有配置', X.CONFIG.ACTIVE_TOWERS.every((t) => X.CONFIG.TOWERS[t]));
check('图鉴敌人 23 种：尸、鬼、巨在前，其后 20 种新敌人', X.CONFIG.ACTIVE_ENEMIES.length === 23 && X.CONFIG.ACTIVE_ENEMIES.slice(0, 3).join() === 'corpse,ghost,giant');

// 关卡
check('塔防 4 个主题、20 关', Object.keys(X.THEMES).join() === '1,2,3,4' && X.levelManager.getThemes().length === 4 && Object.keys(X.LEVELS_DATA).length === 20);
check('塔防关卡 unlocks 全部清空', Object.values(X.LEVELS_DATA).every((l) => Array.isArray(l.unlocks) && l.unlocks.length === 0));
check('征服只有 1-1、1-2', Object.keys(X.CONQUEST_LEVELS_DATA).join() === '1-1,1-2');
check('征服只剩主题 1', X.CONQUEST_THEMES.length === 1);

// 升级移除
const proto = X.Tower.prototype;
check('Tower 无 upgrade 方法', typeof proto.upgrade === 'undefined');
const markup = read('js/bootstrap/page-markup.js');
check('页面模板无升级按钮', !/upgrade-btn/.test(markup));
check('「自定」入口被隐藏', /id="btn-custom"[^>]*style="display:none"/.test(markup));
check('出售退还按 cost 的 70%', X.Tower.prototype.getSellValue.call({ cost: 120 }) === 84);

// 旧存档兼容
store.moshou_conquest_progress = JSON.stringify({
  completedLevels: ['1-1', '3-4', '5-5', 'bad', 7], unlockedThemes: [1, 2, 5], lastPlayedLevel: '4-2',
});
let p;
try { p = X.conquestProgress.getProgress(); } catch (e) { p = null; }
check('旧征服存档读取不报错', !!p);
check('旧征服存档丢弃不存在的关卡/主题', p && p.completedLevels.join() === '1-1' && p.unlockedThemes.join() === '1' && p.lastPlayedLevel === '1-1', JSON.stringify(p));
check('读取不清空原存档', JSON.parse(store.moshou_conquest_progress).completedLevels.length === 5);
store.moshou_conquest_progress = '{"completedLevels":"oops"}';
check('损坏的征服存档不报错', (() => { try { return X.conquestProgress.getProgress().completedLevels.length === 0; } catch (e) { return false; } })());
check('levelManager 不认不存在的关卡 ID，认得 1-2 与 4-5', !X.levelManager.get('5-1') && !X.levelManager.get('1-9') && !!X.levelManager.get('1-2') && !!X.levelManager.get('4-5'));

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n塔池/关卡/升级移除/存档兼容测试通过');
