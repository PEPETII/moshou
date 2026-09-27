// 一次性迁移脚本：金币 -> 墨水（仅货币语义；金行元素 "gold" 受保护）
import fs from 'fs';
import path from 'path';

const ROOT = 'E:/news-game/moshou';
const rel = (...p) => path.join(ROOT, ...p);

// 全量标识符替换（引号内 "gold" 先保护后恢复）
const IDENT_FILES = [
  'js/game.js', 'js/tower.js',
  'js/core/towers.js', 'js/core/flow.js', 'js/core/misc.js', 'js/core/waves.js', 'js/core/rendering.js',
  'js/fusionSystem.js', 'js/entities/towers/misc.js', 'js/entities/enemy/lifecycle.js',
  'js/ui/menu.js', 'js/ui/panels.js',
  'js/conquestGame.js', 'js/conquestLevelsData.js',
  'js/modes/conquest/fusion.js', 'js/modes/conquest/misc.js', 'js/modes/conquest/flow.js', 'js/modes/conquest/waves.js',
];

// 仅 startGold
const STARTGOLD_FILES = [
  'js/data/levels/part-01.js', 'js/data/levels/part-02.js',
];

// 仅文案
const TEXT_FILES = [
  'js/ui/input.js', 'js/ui/input-touch.js', 'js/ui/toast.js',
  'js/ui/encyclopedia.js', 'js/ui/fusion.js',
  'js/bootstrap/page-markup.js',
  'js/config/domain-02.js', 'tests/test-balance.js',
  'css/style/part-05.css',
];

function applyCommonRules(src, { ident }) {
  let s = src;
  s = s.replace(/goldPerWaveInc/g, 'inkPerWaveInc');
  s = s.replace(/goldPerWave/g, 'inkPerWave');
  s = s.replace(/startGold/g, 'startInk');
  s = s.replace(/insufficient_gold/g, 'insufficient_ink');
  s = s.replace(/getElementById\("gold"\)/g, 'getElementById("ink")');
  s = s.replace(/getElementById\("conquest-gold"\)/g, 'getElementById("conquest-ink")');
  if (ident) {
    s = s.replace(/"gold"/g, '"__ELEM_GOLD__"').replace(/'gold'/g, "'__ELEM_GOLD__'");
    s = s.replace(/\.gold\b/g, '.ink');
    s = s.replace(/\bgold\b/g, 'ink');
    s = s.replace(/"__ELEM_GOLD__"/g, '"gold"').replace(/'__ELEM_GOLD__'/g, "'gold'");
  }
  return s;
}

function applyTextRules(src, file) {
  let s = src;
  s = s.replace(/金币/g, '墨水');
  s = s.replace(/金\/波/g, '墨/波');
  s = s.replace(/产金/g, '产墨');
  s = s.replace(/ 金）/g, ' 墨）');
  if (file.includes('encyclopedia') || file.includes('ui') && file.endsWith('fusion.js')) {
    s = s.replace(/\+"金"/g, '+\"墨\"');
  }
  if (file.endsWith('flow.js') || file.includes('core/flow.js')) {
    s = s.replace(/\}金/g, '}墨');
  }
  return s;
}

const changed = [];
function process(file, { ident = false, text = true, startGoldOnly = false } = {}) {
  const p = rel(file);
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  if (startGoldOnly) {
    s = s.replace(/startGold/g, 'startInk');
  } else {
    s = applyCommonRules(s, { ident });
    if (text) s = applyTextRules(s, file.replace(/\\/g, '/'));
  }
  if (s !== before) { fs.writeFileSync(p, s); changed.push(file); }
}

IDENT_FILES.forEach(f => process(f, { ident: true }));
STARTGOLD_FILES.forEach(f => process(f, { startGoldOnly: true }));
TEXT_FILES.forEach(f => process(f, { ident: false }));

// page-markup: DOM id
const pm = rel('js/bootstrap/page-markup.js');
let pmSrc = fs.readFileSync(pm, 'utf8');
pmSrc = pmSrc.replace(/id="gold"/g, 'id="ink"').replace(/id="conquest-gold"/g, 'id="conquest-ink"');
fs.writeFileSync(pm, pmSrc);

// css id 选择器
const c1 = rel('css/style/part-01.css');
let s1 = fs.readFileSync(c1, 'utf8');
s1 = s1.replace(/#gold\b/g, '#ink');
fs.writeFileSync(c1, s1);

const c3 = rel('css/style/part-03.css');
let s3 = fs.readFileSync(c3, 'utf8');
s3 = s3.replace(/#conquest-gold\b/g, '#conquest-ink');
fs.writeFileSync(c3, s3);

console.log('Changed files:\n' + changed.join('\n'));
