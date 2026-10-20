/**
 * 控制与卷入限制规则（工单 12）：分档表、卷入预算、吸入预算、抗性窗口、硬控递减、首领震慑、增伤上限，
 * 以及「js/glyph/ 下除 control-rules.js 外不再直接调用 glyphStun / freeze / knockback」的静态检查。
 */
const fs = require('fs');
const path = require('path');
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, vt, run, spawnAt, makeGame, mk, CELL, sNear } = env;
const { CONFIG, ControlRules, GlyphWater, GlyphSystem } = X;
const { check, near, finish } = makeChecker();
const T = CONFIG.CONTROL.tiers;

// ---------- 分档表 ----------
check('分档表五档齐全', ['minor', 'heavy', 'elite', 'greater', 'boss'].every((k) => T[k]));
check('小怪：卷入占 1、全额吸入与击退与硬控、减速上限 0.8', T.minor.carry && T.minor.carryCost === 1 && T.minor.pullMul === 1 && T.minor.knockMul === 1 && T.minor.ccMul === 1 && T.minor.slowCap === 0.8 && !T.minor.diminish);
check('重敌：卷入占 3、倒卷距离 ×0.5、吸力 ×0.3、击退 ×0.3、硬控 ×0.7、上限 0.7', T.heavy.carry && T.heavy.carryCost === 3 && T.heavy.carryDistMul === 0.5 && T.heavy.pullMul === 0.3 && T.heavy.knockMul === 0.3 && T.heavy.ccMul === 0.7 && T.heavy.slowCap === 0.7);
check('双字：卷入占 4、倒卷距离 ×0.35、吸力 ×0.2、击退 ×0.2、硬控 ×0.5、上限 0.6', T.elite.carry && T.elite.carryCost === 4 && T.elite.carryDistMul === 0.35 && T.elite.pullMul === 0.2 && T.elite.knockMul === 0.2 && T.elite.ccMul === 0.5 && T.elite.slowCap === 0.6);
check('三字：不卷入不吸入、击退 ×0.1、硬控 ×0.3、冻结改 0.5 减速、上限 0.5', !T.greater.carry && !T.greater.pull && T.greater.knockMul === 0.1 && T.greater.ccMul === 0.3 && T.greater.freezeToSlow === 0.5 && T.greater.slowCap === 0.5);
check('四字：不卷入不吸入、免疫击退与硬控、上限 0.3', !T.boss.carry && !T.boss.pull && T.boss.knockMul === 0 && T.boss.ccMul === 0 && T.boss.slowCap === 0.3);
check('预算与抗性窗口集中配置', CONFIG.CONTROL.carryBudget.water === 14 && CONFIG.CONTROL.carryBudget.wind === 10 && CONFIG.CONTROL.carryImmune === 3 && CONFIG.CONTROL.pullImmune === 2
  && CONFIG.CONTROL.ccMaxSingle === 2.5 && CONFIG.CONTROL.staggerMax === 100 && CONFIG.CONTROL.staggerDuration === 1.2 && CONFIG.CONTROL.staggerLock === 8 && CONFIG.CONTROL.ampCap === 1.8);
check('旧 giantKnockMul 已删除', CONFIG.GLYPH_STATUS.giantKnockMul === undefined);

// ---------- 击退、硬控按档位衰减 ----------
{
  const g = makeGame();
  const cases = [['corpse', 1], ['giant', 0.3], ['yaksha', 0.2], ['zhenmushou', 0.1], ['baiguiyexing', 0]];
  for (const [type, mul] of cases) {
    const e = spawnAt(g, type, 6 * CELL);
    ControlRules.knock(e, 100, 'water');
    check(`击退：${type} × ${mul}`, near(e.s, 6 * CELL - 100 * mul, 1e-6), `s=${e.s}`);
  }
  const ccCases = [['corpse', 1], ['giant', 0.7], ['yaksha', 0.5], ['zhenmushou', 0.3], ['baiguiyexing', 0]];
  for (const [type, mul] of ccCases) {
    const e = spawnAt(g, type, 6 * CELL);
    const d = ControlRules.stun(e, 1, 'thunder');
    check(`眩晕：${type} 时长 × ${mul}`, near(d, mul, 1e-6) && (mul === 0 ? e.stun === 0 : near(e.stun, mul, 1e-6)), `d=${d}`);
  }
  const z = spawnAt(g, 'zhenmushou', 6 * CELL);
  ControlRules.freeze(z, 2, 'ice');
  check('三字敌人：冻结改为 0.5 的减速，不冻住', z.stun === 0 && z.slowRatio === 0.5 && z.slowTime > 0 && !(z.iceTime > 0));
  const c = spawnAt(g, 'corpse', 6 * CELL);
  ControlRules.stun(c, 9, 'thunder');
  check('单次硬控不超过 ccMaxSingle（2.5 秒）', near(c.stun, 2.5));
}

// ---------- 减速上限按档位 ----------
{
  const g = makeGame();
  const caps = [['corpse', 0.8], ['giant', 0.7], ['yaksha', 0.6], ['zhenmushou', 0.5], ['baiguiyexing', 0.3]];
  for (const [type, cap] of caps) {
    const e = spawnAt(g, type, 6 * CELL);
    e.makeWet(10);
    e.glyphSlowRaw(0.9, 10);
    e.chillStacks = 3;
    check(`减速上限：${type} ≤ ${cap}`, near(1 - e.glyphSpeedMul(), cap, 1e-9), `slow=${1 - e.glyphSpeedMul()}`);
  }
}

// ---------- 硬控递减：6 秒窗口内 100% / 50% / 25% / 免疫 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'yaksha', 6 * CELL);
  const ds = [1, 2, 3, 4].map(() => { const d = ControlRules.stun(e, 1, 'thunder'); e.stun = 0; return d; });
  check('双字：6 秒内连续硬控 4 次，时长为 100% / 50% / 25%，第 4 次免疫（× 档位 0.5）', near(ds[0], 0.5) && near(ds[1], 0.25) && near(ds[2], 0.125) && ds[3] === 0, ds.join());
  ControlRules.tick(e, 2.1);
  check('免疫 2 秒后重置', ControlRules.stun(e, 1, 'thunder') > 0);
  const c = spawnAt(g, 'corpse', 6 * CELL);
  const dc = [1, 2, 3, 4, 5].map(() => { const d = ControlRules.stun(c, 1, 'thunder'); c.stun = 0; return d; });
  check('小怪不递减，保证清场爽快', dc.every((d) => near(d, 1)));
}

// ---------- 首领震慑 ----------
{
  const g = makeGame();
  const b = spawnAt(g, 'baiguiyexing', 6 * CELL);
  ControlRules.stun(b, 2, 'thunder');
  check('硬控命中首领：不产生控制，改为累积震慑（每秒 30 点）', b.stun === 0 && near(b.stagger, 60));
  ControlRules.freeze(b, 2, 'ice');
  check('震慑满 100：踉跄 1.2 秒，震慑清零', b.staggerT > 1.19 && b.stagger === 0);
  ControlRules.stun(b, 2, 'thunder');
  check('踉跄期间与之后 8 秒内不再累积', b.stagger === 0);
  ControlRules.tick(b, 1.2 + 8.1);
  ControlRules.stun(b, 1, 'thunder');
  check('锁定结束后重新累积', near(b.stagger, 30));
  const s0 = b.s;
  ControlRules.knock(b, 100, 'water');
  check('击退不累积震慑、首领免疫击退', b.s === s0 && near(b.stagger, 30));
  b.baseSpeed = b.speed = 1;
  b.staggerT = 1;
  b.abSpeedMul = 1;
  const before = b.s;
  b.advance(100);
  check('踉跄时移动速度 × 0.4', near(b.s - before, 1 * CELL * 0.1 * 0.4, 1e-6), `ds=${b.s - before}`);
}

// ---------- 增伤叠乘上限 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'giant', 6 * CELL);
  e.exposeTime = 5;
  e.exposeRatio = CONFIG.TOWERS.gold.glyph.exposeRatio;
  e.makeWet(5);
  const mul = e.damageMul({ wetBonus: CONFIG.TOWERS.thunder.glyph.wetMul });
  check('破甲 + 湿身 + 雷同时作用：外部增伤 ≤ 1.8', near(mul, 1.8) && ControlRules.amp(e, [1.35, 1.5]) === 1.8, `mul=${mul}`);
  check('只有破甲时不受上限影响', near(ControlRules.amp(e, [1.35]), 1.35));
  e.exposeTime = 0;
  check('只有湿身加成：1.5', near(e.damageMul({ wetBonus: 1.5 }), 1.5));
}

// ---------- 水·潮：卷入预算、三字四字不卷入、抗性窗口 ----------
function waterSetup(extra) {
  const g = makeGame();
  const w = mk(g, 'water', 3, 2);
  w.gl.charge = 1;
  const base = sNear(g, w);
  return { g, w, base };
}
{
  const { g, w, base } = waterSetup();
  const crowd = [];
  for (let i = 0; i < 30; i++) crowd.push(spawnAt(g, 'corpse', base + 10 + i * 2, 100000));
  const front = base + 70;
  g.runtimeIndexes.rebuildEnemies();
  const pool = X.GlyphWorld.enemiesInRange(g, w.x, w.y, 400);
  check('潮能放出', GlyphWater.cast(w, pool) === true);
  const wave = g.glyphShots.find((s) => s.kind === 'wave');
  run(g, 0.4);
  const cost = wave.caught.reduce((a, e) => a + ControlRules.carryCost(e), 0);
  check('一道潮卷入的体量总和 ≤ 14', wave.caught.length > 0 && cost <= 14 && wave.budget >= 0, `caught=${wave.caught.length} cost=${cost}`);
  check('预算用完后，其余敌人只吃伤害、被打湿，不被拖走', crowd.some((e) => !e.carried && e.wet > 0 && e.hp < 100000) || wave.caught.length === crowd.length);
}
{
  const { g, w, base } = waterSetup();
  const boss = spawnAt(g, 'baiguiyexing', base + 20);
  const gr = spawnAt(g, 'zhenmushou', base + 30);
  const el = spawnAt(g, 'puppet', base + 40);
  const giant = spawnAt(g, 'giant', base + 50);
  g.runtimeIndexes.rebuildEnemies();
  const pool = X.GlyphWorld.enemiesInRange(g, w.x, w.y, 400);
  GlyphWater.cast(w, pool);
  const hp0 = [boss.hp, gr.hp];
  run(g, 0.3);
  check('四字首领不被潮卷入，只吃浪的伤害', boss.carried === null && boss.hp < hp0[0]);
  check('三字敌人不被潮卷入，只吃浪的伤害', gr.carried === null && gr.hp < hp0[1]);
  check('双字、重敌可被卷入', !!el.carried && !!giant.carried);
  const wave = g.glyphShots.find((s) => s.kind === 'wave');
  const lag = (e) => (1 - ControlRules.tier(e).carryDistMul);
  check('倒卷距离按档位打折（重敌 × 0.5、双字 × 0.35）', near(lag(giant), 0.5) && near(lag(el), 0.65));
}
{
  // 4 座水塔轮流放潮：任何敌人 10 秒内被卷入的累计时间不超过 4 秒
  const g = makeGame();
  const towers = [mk(g, 'water', 2, 2), mk(g, 'water', 3, 2), mk(g, 'water', 4, 2), mk(g, 'water', 5, 2)];
  const base = sNear(g, towers[0]);
  const crowd = [];
  for (let i = 0; i < 12; i++) crowd.push(spawnAt(g, i % 3 === 0 ? 'giant' : 'corpse', base + 20 + i * 6, 1000000));
  const acc = new Map(crowd.map((e) => [e, 0]));
  const dtMs = 1000 / 60;
  let castAt = 0;
  for (let step = 0; step < 600; step++) {
    const t = step / 60;
    if (t >= castAt) {
      const tw = towers[Math.floor(castAt / 0.5) % 4];
      tw.gl.charge = 1;
      g.glyphUltCd = 0;
      castAt += 0.5;
    }
    run(g, 1 / 60);
    for (const e of crowd) if (e.carried) acc.set(e, acc.get(e) + 1 / 60);
  }
  const worst = Math.max(...acc.values());
  check('4 座水塔轮流放潮：任何敌人 10 秒内累计被卷入不超过 4 秒', worst <= 4.0, `最长 ${worst.toFixed(2)} 秒`);
  check('被卷入过的敌人确实存在（用例有效）', worst > 0);
}

// ---------- 风·旋：吸入预算、一敌一风、三字四字不吸 ----------
{
  const g = makeGame();
  const wi = mk(g, 'wind', 3, 2);
  const base = sNear(g, wi);
  const crowd = [];
  for (let i = 0; i < 20; i++) crowd.push(spawnAt(g, 'corpse', base + 40 + (i % 5) * 4, 100000));
  const gr = spawnAt(g, 'zhenmushou', base + 44);
  const boss = spawnAt(g, 'baiguiyexing', base + 46);
  const hpG = gr.hp;
  const track = crowd[0].track;
  const mkVortex = () => X.GlyphSystem.push(g, {
    tower: wi, kind: 'vortex', ground: true, x: crowd[0].x, y: crowd[0].y, track, s: base + 42, t: 0, dur: 3, tick: 0, rot: 0, pulling: new Set(),
  });
  const v1 = mkVortex();
  run(g, 0.5);
  const used = Array.from(v1.pulling).reduce((a, e) => a + ControlRules.carryCost(e), 0);
  check('每个旋风同时吸入的体量 ≤ 10', v1.pulling.size > 0 && used <= 10, `吸入 ${v1.pulling.size} 只，体量 ${used}`);
  check('三字、四字不被吸入，但吃旋风伤害', !v1.pulling.has(gr) && !v1.pulling.has(boss) && gr.hp < hpG);
  const v2 = mkVortex();
  run(g, 0.2);
  const dup = crowd.filter((e) => e.pulledBy && !(v1.pulling.has(e) && v2.pulling.has(e))).length;
  check('一只敌人同一时间只被一个旋风吸', crowd.every((e) => !(v1.pulling.has(e) && v2.pulling.has(e))) && dup >= 0);
  const pulled = Array.from(v1.pulling)[0];
  v1.t = v1.dur;
  run(g, 0.1);
  check('旋风结束后释放，并带 pullImmune 抗性', pulled.pulledBy !== v1 && pulled.pullImmuneT > 0);
}

// ---------- 静态检查：招式不直接调用底层控制 ----------
{
  const dir = path.join(__dirname, '..', 'js', 'glyph');
  const bad = [];
  for (const f of fs.readdirSync(dir)) {
    if (f === 'control-rules.js' || !f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/(?<!ControlRules)\.(glyphStun|freeze|knockback)\(/g)) bad.push(`${f}:${m[1]}`);
    if (/\.glyphSlow\(/.test(src)) bad.push(`${f}:glyphSlow`);
  }
  check('js/glyph/ 下（除 control-rules.js 外）不再直接调用 glyphStun / freeze / knockback / glyphSlow', bad.length === 0, bad.join());
}

finish('控制与卷入限制规则测试通过');
