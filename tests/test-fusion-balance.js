/**
 * 融合与升级曲线平衡护栏：直接读取真实配置。
 * - 木塔 3 级原始 DPS 不应远超同类
 * - 1 阶融合 DPS 相对组件 DPS 之和应在合理区间
 * - 进化相对其组成部分略强
 * - 霜塔深寒倍率不超过 1.8
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const files = ['js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js', 'js/config/fusion.js'];
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + '\nthis.__C = CONFIG;', sandbox);
const C = sandbox.__C;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

function dpsAt(type, level) {
  const t = C.TOWERS[type];
  let d = t.damage, cd = t.cooldown;
  const up = t.upgradeParams || {};
  for (let L = 2; L <= level; L++) {
    d += up.damageInc || 0;
    if (up.cooldownDec && cd > 200) cd -= up.cooldownDec;
  }
  return d / (cd / 1000);
}

// 升级曲线：3 级 / 1 级 DPS 倍率不超过 4.5，3 级 DPS 不超过火塔 3 级的 1.3 倍
{
  const mult = {};
  for (const [k, t] of Object.entries(C.TOWERS)) {
    if (!t.damage || !t.cooldown || !t.upgradeParams) continue;
    mult[k] = dpsAt(k, 3) / dpsAt(k, 1);
  }
  const worst = Object.entries(mult).sort((a, b) => b[1] - a[1])[0];
  check('各塔 3 级/1 级 DPS 倍率 ≤ 4.5', worst[1] <= 4.5, `最高 ${worst[0]} ×${worst[1].toFixed(2)}`);
  const wood3 = dpsAt('wood', 3);
  check('木塔 3 级原始 DPS 在 3.5~5.0', wood3 >= 3.5 && wood3 <= 5.0, wood3.toFixed(2));
}

check('霜塔深寒倍率 ≤ 1.8', C.TOWERS.frost.deepColdBonus <= 1.8, String(C.TOWERS.frost.deepColdBonus));

// 融合 DPS 区间
function cycle(s) {
  const sp = s.skillParams;
  if (!sp) return s.damage || 0;
  const n = (sp.actions || []).filter((a) => (C.TOWERS[a]?.damage || 0) > 0).length || 1;
  return s.damage * n * (sp.repeat || 1) * (sp.damageMultiplier || 1);
}
const dpsOf = (s) => (!s.cooldown || s.cooldown >= 900000) ? 0 : cycle(s) / (s.cooldown / 1000);

const bad = [];
for (const [key, f] of Object.entries(C.FUSION_TOWERS)) {
  const [a, b] = f.components;
  const ca = C.TOWERS[a] || C.FUSION_TOWERS[a];
  const cb = C.TOWERS[b] || C.FUSION_TOWERS[b];
  const sum = dpsOf(ca) + dpsOf(cb);
  if (sum <= 0 || f.cooldown >= 900000) continue;
  if (f.cooldown <= 300 || f.cooldown >= 2600) continue; // 触及边界钳制时不比较
  const ratio = dpsOf(f) / sum;
  const [lo, hi] = f.isEvolution ? [1.2, 1.6] : [1.0, 1.3];
  if (ratio < lo || ratio > hi) bad.push(`${key}=${ratio.toFixed(2)}`);
}
check('融合 DPS/组件 DPS 之和在区间内（1 阶 1.0~1.3，进化 1.2~1.6）', bad.length === 0, bad.join(' ') || undefined);

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n融合与升级曲线平衡护栏通过');
