/**
 * 实验护栏（保留命令名 test:balance 以符合 AGENTS.md）。
 * 按总览决策 D12，字形弹道玩法不做数值平衡：这里只断言结构，不断言平衡数值。
 * 覆盖：火、水配置字段齐全；三档密度单调递增；ENEMY_CAP / HOLD_SECONDS 等集中配置存在；配置无 NaN / 负数。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {};
vm.createContext(sandbox);
const files = ['js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/glyph-battle.js', 'js/config/glyphs.js'];
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + '\nthis.__C = CONFIG;', sandbox);
const C = sandbox.__C;

let failed = 0;
function check(name, bad, detail) {
  const list = [].concat(bad);
  const ok = list.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ' — ' + (detail || list.join(' '))}`);
}
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// 1. 塔池与火、水、土、木字段
check('塔池为火、水、土、木', JSON.stringify(C.ACTIVE_TOWERS) === '["fire","water","earth","wood"]' ? [] : ['ACTIVE_TOWERS']);
{
  const bad = [];
  for (const k of C.ACTIVE_TOWERS) {
    const t = C.TOWERS[k];
    if (!t) { bad.push(`${k}:缺配置`); continue; }
    for (const f of ['char', 'desc']) if (typeof t[f] !== 'string' || !t[f]) bad.push(`${k}.${f}`);
    for (const f of ['cost', 'range', 'cooldown', 'size']) if (!(t[f] > 0)) bad.push(`${k}.${f}`);
    if (!t.glyph || typeof t.glyph !== 'object') bad.push(`${k}.glyph`);
    else for (const f of ['range', 'chargePerSec', 'chargePerHit']) if (!(t.glyph[f] > 0)) bad.push(`${k}.glyph.${f}`);
    if (!C.GLYPHS || !C.GLYPHS[k]) bad.push(`${k}:缺字形笔画数据`);
  }
  check('火、水、土、木配置字段齐全（含 glyph 与笔画数据）', bad);
}

// 2. 三档敌潮
{
  const d = C.DENSITY || {};
  const keys = ['sparse', 'normal', 'flood'];
  const bad = [];
  for (const k of keys) {
    if (!d[k] || !(d[k].rate > 0) || !(d[k].giantEvery > 0) || !d[k].label) bad.push(`${k}:字段`);
  }
  if (!bad.length) {
    if (!(d.sparse.rate < d.normal.rate && d.normal.rate < d.flood.rate)) bad.push('rate 非严格递增');
    if (!(d.sparse.giantEvery > d.normal.giantEvery && d.normal.giantEvery > d.flood.giantEvery)) bad.push('giantEvery 非严格递减');
  }
  if (!keys.includes(C.DENSITY_DEFAULT)) bad.push('DENSITY_DEFAULT');
  check('三档敌潮齐全且单调（稀<常<潮），默认档合法', bad);
}

// 3. 集中常量
check('ENEMY_CAP / HOLD_SECONDS / CONQUEST_DANGER_LIMIT / ULT_GLOBAL_GAP / GLYPH_SCALE 存在',
  ['ENEMY_CAP', 'HOLD_SECONDS', 'CONQUEST_DANGER_LIMIT', 'ULT_GLOBAL_GAP', 'GLYPH_SCALE'].filter((k) => !(C[k] > 0)));
check('征服失败线不超过 ENEMY_CAP', C.CONQUEST_DANGER_LIMIT <= C.ENEMY_CAP ? [] : ['CONQUEST_DANGER_LIMIT > ENEMY_CAP']);
check('网格 72px、6 行、视口 960×432', (C.CELL_SIZE === 72 && C.GRID_ROWS === 6 && C.VIEW_W === 960 && C.VIEW_H === 432) ? [] : ['网格/视口']);

// 4. 出场敌人
{
  const bad = [];
  for (const k of C.ACTIVE_ENEMIES) {
    const e = C.ENEMIES[k];
    if (!e) { bad.push(`${k}:缺配置`); continue; }
    if (!(e.hp > 0 && e.speed > 0 && e.reward > 0 && e.damage > 0)) bad.push(`${k}:基础字段非正`);
  }
  check('出场敌人（尸、鬼、巨）基础字段为正', bad);
}

// 5. 配置不应含 NaN / 负数
{
  const bad = [];
  const scan = (prefix, o) => {
    for (const [k, v] of Object.entries(o || {})) {
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) bad.push(`${prefix}.${k}=${v}`);
      else if (v && typeof v === 'object') scan(`${prefix}.${k}`, v);
    }
  };
  for (const k of C.ACTIVE_TOWERS) scan(`TOWERS.${k}`, C.TOWERS[k]);
  for (const k of C.ACTIVE_ENEMIES) scan(`ENEMIES.${k}`, C.ENEMIES[k]);
  for (const k of ['DENSITY', 'SPAWN', 'GLYPH_STATUS', 'GLYPH_FEEDBACK', 'GAMEPLAY']) scan(k, C[k]);
  check('出场塔、敌人与玩法配置中无负数/NaN', bad);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n实验护栏通过');
