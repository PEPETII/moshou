// 数值试算表（工单 11 §7）：纯 Node，不依赖浏览器。
// 用法：npm run balance:sheet  → 输出到 docs/test-results/balance-sheet.md，方便以后调参时对比。
const fs = require('fs');
const path = require('path');
const model = require('./lib/balance-model');

const { CONFIG, levelManager } = model;
const out = [];
const line = (s) => out.push(s);

line('# 数值试算表');
line('');
line('由 `scripts/balance-sheet.js` 按当前配置自动生成（2026-10-21 起，工单 11）。模型见 `scripts/lib/balance-model.js`，数值为初值，以实机试玩为准。');
line('');

line('## 各塔参考单体火力 D_ref');
line('');
line('| 塔 | D_ref（点/秒，单体、不含大招） |');
line('|---|---|');
for (const [k, v] of Object.entries(model.dref())) line(`| ${CONFIG.TOWERS[k].char}（${k}） | ${v.toFixed(1)} |`);
line('');

line('## 每关压力指数');
line('');
line('P = Σ_roster[权重占比 × EHP] × rate(常) ÷ 墨收入(常) + Σ_elites EHP ÷ hold；「含首领」把首领按潮档血量当作大精英计入。');
line('');
line('| 关 | 名 | hpMul | 坚守 | P（不含首领） | P（含首领） | 出场敌人种数 | 精英 | 首领 |');
line('|---|---|---|---|---|---|---|---|---|');
for (const l of levelManager.getAll()) {
  const kinds = new Set((l.roster || []).map((r) => r.type)).size;
  const elites = (l.elites || []).map((e) => `${CONFIG.ENEMIES[e.type].name}@${e.at}`).join('、') || '—';
  const boss = l.boss ? `${CONFIG.ENEMIES[l.boss.type].name}@${l.boss.at}` : '—';
  line(`| ${l.id} | ${l.name} | ${l.hpMul.toFixed(2)} | ${l.holdSeconds} | ${model.pressure(l).toFixed(1)} | ${model.pressure(l, { boss: true }).toFixed(1)} | ${kinds} | ${elites} | ${boss} |`);
}
line('');

line('## 首领击杀窗口');
line('');
line('首领承伤火力 = 预期塔数 × 平均 D_ref(30) × 首领集火比 0.25 × 大招加成 1.3；用时 = 血量 ÷ 承伤火力。');
line('');
line('| 首领 | 预期塔数 | 承伤火力 | 潮档血量 | 预期击杀用时（秒） | 稀 / 常 / 潮 |');
line('|---|---|---|---|---|---|');
for (const k of ['baiguiyexing', 'fanjiangdaohai', 'tongqiangtiebi', 'wanjiebufu']) {
  const r = model.bossKill(k, 'flood');
  const t = ['sparse', 'normal', 'flood'].map((d) => model.bossKill(k, d).seconds.toFixed(0)).join(' / ');
  line(`| ${CONFIG.ENEMIES[k].name} | ${r.towers} | ${r.fire.toFixed(0)} | ${r.hp} | ${r.seconds.toFixed(1)} | ${t} |`);
}
line('');

line('## 敌人有效血量（基础 hp × 能力系数 k，不含关卡 hpMul）');
line('');
line('| key | 显示 | tier | 字数 | hp | speedPx | reward | k | 奖励/血量 |');
line('|---|---|---|---|---|---|---|---|---|');
for (const key of CONFIG.ACTIVE_ENEMIES) {
  const e = CONFIG.ENEMIES[key];
  line(`| ${key} | ${e.name || e.char} | ${e.tier} | ${e.segments ? e.segments.length : 1} | ${e.hp} | ${e.speedPx} | ${e.reward} | ${model.K[key] || '—'} | ${(e.reward / e.hp).toFixed(3)} |`);
}
line('');

const dest = path.join(__dirname, '..', 'docs', 'test-results', 'balance-sheet.md');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out.join('\n') + '\n', 'utf8');
console.log(`已输出 ${path.relative(path.join(__dirname, '..'), dest)}`);
