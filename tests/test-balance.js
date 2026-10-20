/**
 * 平衡护栏（命令名 test:balance）。
 * 2026-10-21 起恢复数值平衡（决策 E8，推翻旧 D12）：除结构断言外，还断言工单 11 的数值护栏——
 * 敌人总表（hp、速度、奖励、tier、字数）、hpMul 曲线、压力指数的三条约束、奖励/血量比、首领击杀用时、
 * 每个招式都写明 delivery、配套的塔数值调整。试算模型在 scripts/lib/balance-model.js（balance-sheet.js 同用）。
 * 结构断言：十五座塔配置字段齐全；三档密度单调递增；ENEMY_CAP / HOLD_SECONDS 等集中配置存在；配置无 NaN / 负数。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {};
vm.createContext(sandbox);
const files = ['js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/enemies-single.js', 'js/config/enemies-multi.js', 'js/config/enemies-boss.js', 'js/config/glyph-battle.js', 'js/config/control-rules.js', 'js/config/boss-battle.js', 'js/config/glyphs.js', 'js/config/glyphs-ext.js', 'js/config/glyphs-fusion.js', 'js/config/fusion.js'];
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

// 1. 塔池（十二座单字塔，2026-10-20 扩充）与字段
check('塔池为十二座单字塔', JSON.stringify(C.ACTIVE_TOWERS) === '["fire","water","earth","wood","gold","wind","cannon","thunder","ice","bow","mountain","sword"]' ? [] : ['ACTIVE_TOWERS']);
{
  const bad = [];
  // 合字塔不在塔池里，同样要求字段齐全
  for (const k of [...C.ACTIVE_TOWERS, ...C.FUSION.recipes.map((r) => r.result)]) {
    const t = C.TOWERS[k];
    if (!t) { bad.push(`${k}:缺配置`); continue; }
    for (const f of ['char', 'desc']) if (typeof t[f] !== 'string' || !t[f]) bad.push(`${k}.${f}`);
    // cooldown 已不属于塔配置：攻击节奏改由字形组件接管（见 js/glyph/glyph-tower.js）
    for (const f of ['cost', 'range', 'size']) if (!(t[f] > 0)) bad.push(`${k}.${f}`);
    if (!t.glyph || typeof t.glyph !== 'object') bad.push(`${k}.glyph`);
    else for (const f of ['range', 'chargePerSec', 'chargePerHit']) if (!(t.glyph[f] > 0)) bad.push(`${k}.glyph.${f}`);
    if (!C.GLYPHS || !C.GLYPHS[k]) bad.push(`${k}:缺字形笔画数据`);
  }
  check('十五座字形塔配置字段齐全（含 glyph 与笔画数据）', bad);
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

// ================= 数值护栏（工单 11 §8） =================
const model = require('../scripts/lib/balance-model');
const M = model.CONFIG;
const levelManager = model.levelManager;

// 6. 敌人总表（§4.2）：hp、speedPx、damage、reward、tier、字数
{
  const TABLE = {
    corpse: ['minor', 1, 40, 46, 1, 4], ghost: ['minor', 1, 22, 82, 1, 4], giant: ['heavy', 1, 300, 25, 3, 25],
    bone: ['minor', 1, 45, 44, 1, 5], fox: ['minor', 1, 30, 72, 1, 5], spider: ['minor', 1, 55, 38, 1, 7],
    jiao: ['minor', 1, 50, 50, 1, 6], frog: ['minor', 1, 42, 36, 1, 5], turtle: ['heavy', 1, 160, 26, 2, 12],
    kai: ['heavy', 1, 120, 34, 2, 11], rider: ['minor', 1, 70, 44, 2, 8], shaman: ['minor', 1, 60, 40, 1, 9],
    nightmare: ['minor', 1, 65, 42, 1, 9], miasma: ['minor', 1, 55, 40, 1, 8], glutton: ['heavy', 1, 110, 30, 2, 12],
    yaksha: ['elite', 2, 280, 52, 3, 30], puppet: ['elite', 2, 530, 30, 4, 45],
    baigujing: ['greater', 3, 640, 40, 5, 70], zhenmushou: ['greater', 3, 1100, 26, 6, 90],
    baiguiyexing: ['boss', 4, 4000, 24, 5, 200], fanjiangdaohai: ['boss', 4, 6500, 22, 5, 300],
    tongqiangtiebi: ['boss', 4, 9500, 18, 6, 400], wanjiebufu: ['boss', 4, 14000, 20, 6, 600],
  };
  const bad = [];
  for (const [k, [tier, glyphs, hp, speedPx, damage, reward]] of Object.entries(TABLE)) {
    const e = M.ENEMIES[k];
    if (!e) { bad.push(`${k}:缺配置`); continue; }
    const count = e.segments ? e.segments.length : 1;
    if (e.tier !== tier) bad.push(`${k}.tier=${e.tier}`);
    if (count !== glyphs) bad.push(`${k}.字数=${count}`);
    if (e.hp !== hp) bad.push(`${k}.hp=${e.hp}`);
    if (e.speedPx !== speedPx) bad.push(`${k}.speedPx=${e.speedPx}`);
    // 首领的 damage 字段不再扣核心血量（由 BossFlow 处理），这里只核对非首领
    if (tier !== 'boss' && e.damage !== damage) bad.push(`${k}.damage=${e.damage}`);
    if (e.reward !== reward) bad.push(`${k}.reward=${e.reward}`);
  }
  check('敌人总表 23 种：hp、speedPx、damage、reward、tier、字数逐项与工单 11 一致', bad);
  check('出场敌人 23 种，与总表一一对应', M.ACTIVE_ENEMIES.length === 23 && M.ACTIVE_ENEMIES.every((k) => TABLE[k]) ? [] : ['ACTIVE_ENEMIES']);
  const keys = Object.keys(M.ENEMIES);
  check('新旧敌人 key 不重名', keys.filter((k, i) => keys.indexOf(k) !== i));
  const legacy = ['armor', 'split', 'superGiant', 'overlord', 'shadow', 'ironArmor', 'swiftGhost', 'crawler', 'bat'];
  check('新增 20 种敌人没有覆盖旧敌人配置', legacy.filter((k) => k in TABLE && !['corpse', 'ghost', 'giant'].includes(k)));
}

// 7. 敌潮三档的奖励倍率与墨水收入（§3.1）
{
  const d = M.DENSITY;
  const income = (k) => d[k].rate * d[k].rewardMul * model.AVG_MINOR_REWARD;
  const bad = [];
  if (!(d.sparse.rewardMul === 1.6 && d.normal.rewardMul === 1 && d.flood.rewardMul === 0.6)) bad.push('rewardMul');
  const lo = Math.min(income('sparse'), income('normal'), income('flood'));
  const hi = Math.max(income('sparse'), income('normal'), income('flood'));
  if (hi / lo > 1.6) bad.push(`三档收入相差 ${(hi / lo).toFixed(2)} 倍`);
  check('三档敌潮的墨水收入接近（稀 ≈ 11.5、常 ≈ 15.3、潮 ≈ 17.6 墨/秒）', bad);
}

// 8. hpMul 曲线（§4.1）与关卡倍率单调
{
  const bad = [];
  const first = { 1: 1.0, 2: 1.25, 3: 1.55, 4: 1.9 };
  for (let t = 1; t <= 4; t++) {
    const lv = levelManager.getLevelsByTheme(t);
    if (lv.length !== 5) bad.push(`主题${t}关数`);
    lv.forEach((l, i) => {
      if (i > 0 && !(l.hpMul > lv[i - 1].hpMul)) bad.push(`${l.id}.hpMul 非递增`);
      const want = Math.round((first[t] + 0.06 * i) * 100) / 100;
      if (Math.abs(l.hpMul - want) > 1e-9) bad.push(`${l.id}.hpMul=${l.hpMul} 应为 ${want}`);
    });
  }
  check('同主题内 hpMul 单调递增，且与 §4.1 表（1.00/1.25/1.55/1.90 起、每关 +0.06）一致', bad);
}

// 9. 压力指数三条约束（§7）
{
  const bad = [];
  const P = {};
  const Pboss = {};
  for (const l of levelManager.getAll()) { P[l.id] = model.pressure(l); Pboss[l.id] = model.pressure(l, { boss: true }); }
  for (let t = 1; t <= 4; t++) {
    for (let n = 2; n <= 5; n++) {
      if (!(Pboss[`${t}-${n}`] >= Pboss[`${t}-${n - 1}`] - 1e-9)) bad.push(`${t}-${n} 压力指数低于上一关`);
    }
  }
  for (let t = 2; t <= 4; t++) {
    if (!(P[`${t}-1`] >= 0.85 * P[`${t - 1}-5`])) bad.push(`${t}-1 的 P 低于 ${t - 1}-5（不含首领）的 0.85 倍：${P[`${t}-1`].toFixed(1)} < ${(0.85 * P[`${t - 1}-5`]).toFixed(1)}`);
  }
  if (!(P['4-5'] <= 4.5 * P['1-1'])) bad.push(`4-5（不含首领）的 P=${P['4-5'].toFixed(1)} 超过 1-1 的 4.5 倍`);
  check('压力指数：同主题单调不减；每主题第 1 关 ≥ 上一主题第 5 关（不含首领）的 0.85 倍；4-5（不含首领）≤ 1-1 的 4.5 倍', bad);
}

// 10. 奖励 / 血量比：小怪 ≥ 精英 ≥ 首领（§4.2）
{
  const ratio = (k) => M.ENEMIES[k].reward / M.ENEMIES[k].hp;
  const avgOf = (list) => list.reduce((a, k) => a + ratio(k), 0) / list.length;
  const minor = Object.keys(M.ENEMIES).filter((k) => M.ACTIVE_ENEMIES.includes(k) && M.ENEMIES[k].tier === 'minor');
  const elite = ['yaksha', 'puppet', 'baigujing', 'zhenmushou'];
  const boss = ['baiguiyexing', 'fanjiangdaohai', 'tongqiangtiebi', 'wanjiebufu'];
  const bad = [];
  if (!(avgOf(minor) >= avgOf(elite))) bad.push(`小怪 ${avgOf(minor).toFixed(3)} < 精英 ${avgOf(elite).toFixed(3)}`);
  if (!(avgOf(elite) >= avgOf(boss))) bad.push(`精英 ${avgOf(elite).toFixed(3)} < 首领 ${avgOf(boss).toFixed(3)}`);
  if (!(avgOf(boss) >= 0.04 - 0.005 && avgOf(boss) <= 0.05 + 0.005)) bad.push(`首领奖励/血量 ${avgOf(boss).toFixed(3)} 不在 0.04～0.05`);
  check('奖励 / 血量比：小怪 ≥ 精英 ≥ 首领', bad);
}

// 11. 首领击杀窗口 30～100 秒（§5）
{
  const bad = [];
  const names = ['baiguiyexing', 'fanjiangdaohai', 'tongqiangtiebi', 'wanjiebufu'];
  for (const k of names) {
    const r = model.bossKill(k, 'flood');
    if (!(r.seconds >= 30 && r.seconds <= 100)) bad.push(`${k}=${r.seconds.toFixed(1)} 秒`);
  }
  const t = names.map((k) => model.bossKill(k).seconds);
  if (!(t[0] < t[1] && t[1] < t[2] && t[2] < t[3])) bad.push('击杀用时非递增');
  check('首领按 §5 公式算出的击杀用时在 30～100 秒，且逐主题递增', bad);
  const dref = model.dref();
  check('D_ref 与工单 11 §5 的参考表一致（火 ≈ 45、金 ≈ 34、剑 ≈ 43、弓 ≈ 31、山 ≈ 15）',
    [['fire', 45], ['gold', 34], ['sword', 43], ['bow', 31], ['mountain', 15], ['thunder', 19], ['cannon', 15]].filter(([k, v]) => Math.abs(dref[k] - v) > 1.5).map(([k]) => k));
}

// 12. 每个招式伤害都写明 delivery（§6，铜墙铁壁的「墙」依赖它）
{
  const bad = [];
  const dir = path.join(ROOT, 'js', 'glyph');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f === 'adapter.js') continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/GlyphWorld\.damage\(([^;]*?)\);/gs)) {
      const d = m[1].match(/delivery:\s*'(\w+)'/);
      if (!d) bad.push(`${f}:缺 delivery`);
      else if (!['projectile', 'ground', 'instant'].includes(d[1])) bad.push(`${f}:${d[1]}`);
    }
  }
  check('js/glyph/ 下每次 GlyphWorld.damage 都写明 delivery（projectile / ground / instant）', bad);
  const src = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  const mapped = [
    ['fire.js', "kind: 'fire', delivery: 'projectile'"], ['gold.js', "kind: 'gold', delivery: 'projectile'"], ['ice.js', "kind: 'ice', delivery: 'projectile'"],
    ['bow.js', "kind: 'bow', delivery: 'projectile'"], ['bow.js', "delivery: 'ground'"], ['cannon.js', "delivery: 'projectile'"], ['sword.js', "delivery: 'instant'"],
    ['thunder.js', "delivery: 'instant'"], ['water.js', "delivery: 'instant'"], ['wind.js', "delivery: 'instant'"], ['yan.js', "delivery: 'instant'"],
    ['earth.js', "delivery: 'ground'"], ['wood.js', "delivery: 'ground'"], ['mountain.js', "delivery: 'ground'"], ['lin.js', "delivery: 'ground'"], ['fen.js', "delivery: 'projectile'"],
  ].filter(([f, needle]) => !src(f).includes(needle)).map(([f, n]) => `${f}: ${n}`);
  check('delivery 分类与 §6 对照表一致（弹道 / 地面 / 瞬发）', mapped);
}

// 13. 配套的塔数值调整（§6）
{
  const bad = [];
  if (M.TOWERS.ice.glyph.frostFreeze !== 1.6) bad.push('frostFreeze');
  if (!(M.TOWERS.lin.glyph.forestRoot <= 1.8)) bad.push('forestRoot');
  if (!(M.TOWERS.water.glyph.waveCatchDamage === 10 && M.TOWERS.water.glyph.waveEndDamage === 22)) bad.push('water.wave 伤害');
  if (M.TOWERS.wind.glyph.vortexDps !== 22) bad.push('vortexDps');
  if (M.TOWERS.thunder.cost !== 175) bad.push('thunder.cost');
  if (M.TOWERS.mountain.cost !== 145 || M.TOWERS.mountain.onPath || M.TOWERS.mountain.hp) bad.push('mountain');
  if (M.SUMMON_REWARD !== 1) bad.push('SUMMON_REWARD');
  check('配套调整：冰·冻 1.6、林定身 ≤ 1.8、水·潮 10/22、风·旋 22、雷 175 墨、山改普通塔、召唤物奖励 1 墨', bad);
}

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n平衡护栏通过');
