// 数值平衡试算模型（工单 11）：纯 Node，不依赖浏览器。
// 用 vm 加载真实配置与关卡数据，算出压力指数、参考单体火力 D_ref、首领击杀用时。
// tests/test-balance.js 用它做护栏断言，scripts/balance-sheet.js 用它输出表格（docs/test-results/balance-sheet.md）。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// 能力系数 k：能力带来的额外耐打程度的估算，只用于试算和护栏，不参与游戏运行（工单 11 §4.2）
const K = {
  corpse: 1, ghost: 1, giant: 1, bone: 1.4, fox: 1.15, spider: 1.2, jiao: 1.2, frog: 1.15, turtle: 1.5, kai: 1.6,
  rider: 1.1, shaman: 1.3, nightmare: 1.2, miasma: 1.3, glutton: 1.8,
  yaksha: 1.3, puppet: 1.2, baigujing: 1.5, zhenmushou: 1.4,
};

// 小怪平均奖励（工单 11 §3.1），用于换算墨水收入
const AVG_MINOR_REWARD = 4.5;
// 参考集火参数（工单 11 §5）
const BOSS_MODEL = { avgDref: 30, focus: 0.25, ultBonus: 1.3, towersAt: { baiguiyexing: 13, fanjiangdaohai: 15, tongqiangtiebi: 16, wanjiebufu: 18 } };

function load() {
  const ctx = { console, Math, Set, Map, Array, Object, JSON, LEVELS_DATA: {} };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const files = [
    'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js',
    'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js',
    'js/config/glyph-battle.js', 'js/config/control-rules.js', 'js/config/boss-battle.js',
    'js/config/glyphs.js', 'js/config/glyphs-ext.js', 'js/config/glyphs-fusion.js', 'js/config/fusion.js',
    'js/utils.js', 'js/levelsData.js',
    'js/data/levels/part-01.js', 'js/data/levels/part-02.js', 'js/data/levels/part-03.js', 'js/data/levels/part-04.js',
    'js/levelManager.js',
  ];
  vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\nglobalThis.__M = { CONFIG, levelManager };', ctx);
  return ctx.__M;
}

const { CONFIG, levelManager } = load();

// 参考单体火力 D_ref = 普攻平均伤害 × (1 + 暴击率 × (暴击倍率 − 1)) ÷ 出手间隔（不算大招）
const avg = (a) => (a[0] + a[1]) / 2;
function dref() {
  const g = (t) => CONFIG.TOWERS[t].glyph;
  const crit = (c, m) => 1 + c * (m - 1);
  const out = {
    fire: avg(g('fire').sparkDamage) * crit(g('fire').critChance, g('fire').critMul) / g('fire').sparkInterval,
    water: avg(g('water').jetDamage) / g('water').jetInterval,
    earth: avg(g('earth').poundDamage) / g('earth').poundInterval,
    wood: g('wood').sproutDps,
    gold: avg(g('gold').bladeDamage) * 2 / g('gold').bladeInterval,
    wind: avg(g('wind').gustDamage) / g('wind').gustInterval,
    cannon: avg(g('cannon').shellDamage) / g('cannon').shellInterval,
    thunder: avg(g('thunder').arcDamage) / g('thunder').arcInterval,
    ice: avg(g('ice').icicleDamage) / g('ice').icicleInterval,
    bow: avg(g('bow').arrowDamage) * crit(g('bow').critChance, g('bow').critMul) / g('bow').arrowInterval,
    mountain: avg(g('mountain').spikeDamage) / g('mountain').spikeInterval,
    sword: avg(g('sword').slashDamage) * crit(g('sword').critChance, g('sword').critMul) / g('sword').slashInterval,
  };
  return out;
}

const enemy = (t) => CONFIG.ENEMIES[t];
const ehp = (type, hpMul) => enemy(type).hp * hpMul * (K[type] || 1);
const rewardScaled = (type, hpMul) => enemy(type).reward * (0.5 + 0.5 * hpMul);

// 压力指数 P（工单 11 §7）：Σ_roster[权重占比 × EHP] × rate(常) ÷ 墨收入(常) + Σ_elites EHP ÷ hold。
// 墨收入(常) = rate(常) × 本关 roster 的加权平均奖励（按 §3.2 随 hpMul 增长）。
// opts.boss = true 时，把首领当作一个大精英计入（血量取潮档，k = 1）：关底的 P 因此高于前一关；
// 第 20 关「不含首领」的上限约束用 opts.boss = false。
function pressure(level, opts) {
  const rate = CONFIG.DENSITY.normal.rate;
  const list = level.roster;
  const total = list.reduce((a, r) => a + r.weight, 0);
  let e = 0;
  let income = 0;
  for (const r of list) {
    const share = r.weight / total;
    e += share * ehp(r.type, level.hpMul);
    income += share * rewardScaled(r.type, level.hpMul) * CONFIG.DENSITY.normal.rewardMul;
  }
  income *= rate;
  let elites = (level.elites || []).reduce((a, el) => a + ehp(el.type, level.hpMul), 0);
  if (opts && opts.boss && level.boss) elites += enemy(level.boss.type).hp * CONFIG.BOSS.hpMulByDensity.flood;
  return e * rate / income + elites / level.holdSeconds;
}

// 首领击杀窗口（工单 11 §5）：承伤火力 = 预期塔数 × 平均 D_ref × 集火比 × 大招加成；用时 = 血量 ÷ 承伤火力
function bossKill(type, density) {
  const hp = enemy(type).hp * (CONFIG.BOSS.hpMulByDensity[density || 'flood']);
  const towers = BOSS_MODEL.towersAt[type];
  const fire = towers * BOSS_MODEL.avgDref * BOSS_MODEL.focus * BOSS_MODEL.ultBonus;
  return { hp, fire, seconds: hp / fire, towers };
}

module.exports = { CONFIG, levelManager, K, AVG_MINOR_REWARD, BOSS_MODEL, dref, ehp, rewardScaled, pressure, bossKill };
