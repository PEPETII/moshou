/**
 * 数值平衡护栏（读取真实配置，失败时以非 0 退出）。
 *
 * 旧版本手抄了一份 CONFIG 且永不失败；这里改为直接加载 js/config/*，
 * 检查“合理区间”而不是历史快照 docs/full-balance-spec.md 中的逐项目标。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {};
vm.createContext(sandbox);
const files = ['js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/fusion.js'];
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + '\nthis.__C = CONFIG;', sandbox);
const C = sandbox.__C;

let failed = 0;
function check(name, bad, detail) {
  const ok = bad.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ' — ' + (detail || bad.join(' '))}`);
}

const towers = Object.entries(C.TOWERS).filter(([k]) => k !== 'fusion');
const enemies = Object.entries(C.ENEMIES);

// 1. 敌人：生命/奖励比、基础字段合法
{
  const bad = [];
  for (const [k, e] of enemies) {
    const r = e.hp / e.reward;
    if (!(e.hp > 0 && e.speed > 0 && e.reward > 0 && e.damage > 0)) bad.push(`${k}:基础字段非正`);
    if (r < 0.13 || r > 0.38) bad.push(`${k}:hp/reward=${r.toFixed(3)}`);
    if (e.armor && !(e.armorReduction > 0 && e.armorReduction < 1)) bad.push(`${k}:armorReduction`);
  }
  check('敌人基础字段合法且 hp/reward ∈ [0.13, 0.38]', bad);
}

// 2. 输出塔：1 级 DPS/千墨在合理区间（控制/标记类除外）
{
  const exempt = new Set(['bell', 'talisman']);
  const bad = [];
  for (const [k, t] of towers) {
    if (exempt.has(k) || !(t.damage > 0) || !(t.cooldown > 0) || t.aura || t.isDetonator) continue;
    const eff = (t.damage / (t.cooldown / 1000)) / t.cost * 1000;
    if (eff < 6 || eff > 12) bad.push(`${k}=${eff.toFixed(1)}`);
  }
  check('输出塔 1 级 DPS/千墨 ∈ [6, 12]', bad);
}

// 3. 升级：总升级费用占塔价 1.2~1.6；冷却不会降到 0 以下；3 级 DPS 倍率 ≤ 4.5
{
  const bad = [];
  for (const [k, t] of towers) {
    if (!t.upgradeParams) continue;
    const prem = t.upgradeCost * 3 / t.cost;
    if (prem < 1.2 || prem > 1.6) bad.push(`${k}:升级费/塔价=${prem.toFixed(2)}`);
    if (t.damage > 0 && t.cooldown > 0) {
      let d = t.damage, cd = t.cooldown;
      for (let L = 2; L <= 3; L++) { d += t.upgradeParams.damageInc || 0; if (t.upgradeParams.cooldownDec && cd > 200) cd -= t.upgradeParams.cooldownDec; }
      if (cd < 150) bad.push(`${k}:3级冷却${cd}`);
      const mult = (d / (cd / 1000)) / (t.damage / (t.cooldown / 1000));
      if (mult > 4.5) bad.push(`${k}:3级倍率${mult.toFixed(2)}`);
    }
  }
  check('升级曲线合理(费用占比、冷却下限、DPS 倍率)', bad);
}

// 4. 经济：塔价、出售、融合
{
  const bad = [];
  for (const [k, t] of towers) {
    if (!(t.cost > 0)) bad.push(`${k}:cost`);
    if (t.maxCount !== undefined && !(t.maxCount > 0)) bad.push(`${k}:maxCount`);
    if (t.hp !== undefined && !(t.hp > 0)) bad.push(`${k}:hp`);
    if (t.onPath && !(t.hp > 0)) bad.push(`${k}:路径塔缺少 hp`);
  }
  for (const [k, f] of Object.entries(C.FUSION_TOWERS)) {
    const [a, b] = f.components;
    const ca = C.TOWERS[a] || C.FUSION_TOWERS[a], cb = C.TOWERS[b] || C.FUSION_TOWERS[b];
    const ratio = f.cost / (ca.cost + cb.cost);
    if (ratio < 0.85 || ratio > 1.15) bad.push(`${k}:花费比${ratio.toFixed(2)}`);
  }
  check('塔价/血量字段合法，融合花费比 ∈ [0.85, 1.15]', bad);
}

// 5. 配置不应含 NaN/负数
{
  const bad = [];
  const scan = (prefix, o) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) bad.push(`${prefix}.${k}=${v}`);
      else if (v && typeof v === 'object' && !Array.isArray(v)) scan(`${prefix}.${k}`, v);
    }
  };
  for (const [k, t] of towers) scan(`TOWERS.${k}`, t);
  for (const [k, e] of enemies) scan(`ENEMIES.${k}`, e);
  scan('GAMEPLAY', C.GAMEPLAY);
  check('配置中无负数/NaN', bad);
}

// 6. 关键常量存在
check('GAMEPLAY 含阻挡间隔与融合平衡系数', [].concat(
  C.GAMEPLAY.blockAttackInterval > 0 ? [] : ['blockAttackInterval'],
  C.FUSION_BALANCE && C.FUSION_BALANCE.dpsFactor > 0 ? [] : ['FUSION_BALANCE'],
));

if (failed) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n数值平衡护栏通过');
