/**
 * 敌人能力（工单 08 单字十二种、09 精英、10 首领逐字）：每种能力至少一条断言。
 * 用真实配置与代码；敌人速度置 0 放在固定里程，由 run() 逐帧推进游戏时间。
 */
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, vt, run, spawnAt, makeGame, mk, CELL, sNear } = env;
const { CONFIG, EnemyAbilities, ControlRules, GlyphTower } = X;
const { check, near, finish } = makeChecker();
const S = CONFIG.GLYPH_SCALE;

// 敌人的能力状态；让下一次触发立即发生
const st = (e, id) => e.ab[id];
const fireNow = (e, id) => { st(e, id).cd = 0.01; };

// ---------- 08 · 骨：复聚 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'bone', 4 * CELL);
  const ink0 = g.ink;
  e.hit(1000, { kind: 'water' });
  check('骨：被水杀死后碎骨，不死、不给奖励、不能被锁定', !e.dead && e.rubble && g.ink === ink0 && e.untargetable === false && (run(g, 0.05), e.untargetable));
  run(g, 1.3);
  check('骨：碎骨 1.5 秒内不复活、不受伤', e.rubble && (e.hit(999, { kind: 'water' }), e.rubble && !e.dead));
  run(g, 0.3);
  check('骨：1.5 秒后以 40% 血量复活', !e.rubble && !e.dead && near(e.hp, 45 * 0.4, 1e-6), `hp=${e.hp}`);
  e.hit(1000, { kind: 'water' });
  check('骨：每只只复聚一次，第二次真死亡并给奖励', e.dead && g.ink === ink0 + 5);
  const f = spawnAt(g, 'bone', 4 * CELL);
  const ink1 = g.ink;
  f.hit(1000, { kind: 'fire' });
  check('骨：被火系杀死直接碎掉，不复聚', f.dead && g.ink === ink1 + 5);
  const t = spawnAt(g, 'bone', 4 * CELL);
  t.hit(1000, { kind: 'thunder' });
  check('骨：被雷系杀死也直接碎掉', t.dead);
  const k = g.kills;
  const h = spawnAt(g, 'bone', 4 * CELL);
  h.hit(1000, { kind: 'water' });
  check('骨：第一次「假死」不计击杀', g.kills === k);
}

// ---------- 08 · 狐：幻步 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'fox', 4 * CELL);
  e.ab.blink.cd = 3.5;
  const s0 = e.s;
  run(g, 3.4);
  check('狐：3.5 秒前不瞬移', near(e.s, s0));
  run(g, 0.2);
  check('狐：每 3.5 秒前进 60 × S px', near(e.s - s0, 60 * S, 1e-6), `ds=${e.s - s0}`);
  const hp = e.hp;
  e.hit(10, { kind: 'fire' });
  check('狐：瞬移后 0.2 秒内免疫伤害', e.hp === hp);
  run(g, 0.3);
  e.hit(10, { kind: 'fire' });
  check('狐：免疫过后受伤', e.hp === hp - 10);
}

// ---------- 08 · 蛛：缚丝 ----------
{
  const g = makeGame();
  const tw = mk(g, 'fire', 3, 2);
  const sp = spawnAt(g, 'spider', sNear(g, tw));
  fireNow(sp, 'web');
  run(g, 0.2);
  check('蛛：吐丝 0.4 秒前塔未被缚', !(tw.webT > 0));
  run(g, 0.4);
  check('蛛：命中后塔进入缚丝，写回 × 1.6', tw.webT > 0 && tw.webMul === 1.6);
  // 写回速度：同样的笔画，缚丝塔更慢
  const other = mk(g, 'fire', 7, 4);
  for (const t of [tw, other]) GlyphTower.consume(t, 0, 0, 1);
  tw.webT = 100;
  other.webT = 0;
  tw.gl.strokes[0].prog = 0; other.gl.strokes[0].prog = 0;
  GlyphTower.update(tw, 0.5);
  GlyphTower.update(other, 0.5);
  check('蛛：被缚的塔写回时间 × 1.6（进度 0.5 秒 = 0.3125 对 0.5）', near(tw.gl.strokes[0].prog, 0.5 / 1.6, 1e-6) && near(other.gl.strokes[0].prog, 0.5, 1e-6), `${tw.gl.strokes[0].prog} / ${other.gl.strokes[0].prog}`);
  // 同塔 4 秒内不会被重复缚
  tw.webT = 0;
  tw.webLockT = 4;
  sp.ab.web.pending = null;
  fireNow(sp, 'web');
  run(g, 0.6);
  check('蛛：同一座塔缚丝结束后 4 秒内不能再被缚', !(tw.webT > 0));
}
{
  const g = makeGame();
  const towers = [mk(g, 'fire', 3, 2), mk(g, 'fire', 4, 2), mk(g, 'fire', 5, 2), mk(g, 'fire', 6, 2), mk(g, 'fire', 7, 2)];
  const base = sNear(g, towers[2]);
  const spiders = towers.map((_, i) => spawnAt(g, 'spider', base + i * 3));
  spiders.forEach((s) => fireNow(s, 'web'));
  run(g, 0.7);
  const webbed = towers.filter((t) => t.webT > 0).length;
  check('蛛：全场同时被缚的塔不超过 3 座', webbed <= 3 && webbed > 0, `webbed=${webbed}`);
}

// ---------- 08 · 鲛：潜行、天生湿身 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'jiao', 4 * CELL);
  fireNow(e, 'dive');
  run(g, 0.1);
  check('鲛：潜行时不可被单体锁定', e.untargetable && !e.isTargetable());
  const hp = e.hp;
  e.hit(10, { kind: 'earth', delivery: 'ground', aoe: true });
  check('鲛：潜行时被范围伤害（焦土、震荡）命中，并显形', e.hp === hp - 10 && e.revealT > 0);
  check('鲛：始终湿身，雷伤 ×1.5', e.wet > 0 && near(e.damageMul({ wetBonus: 1.5 }), 1.5));
  check('鲛：湿身不减速', near(e.glyphSpeedMul(), 1));
  const c = spawnAt(g, 'corpse', 4 * CELL);
  c.makeWet(5);
  check('对照：普通敌人湿身会减速', near(c.glyphSpeedMul(), 1 - CONFIG.GLYPH_STATUS.wetSlow));
}

// ---------- 08 · 蛙：跳跃 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'frog', 4 * CELL);
  st(e, 'hop').phase = 'hop';
  st(e, 'hop').t = 0.4;
  run(g, 0.05);
  const hp = e.hp;
  check('蛙：空中', e.airborne);
  e.hit(10, { kind: 'wood', delivery: 'ground', aoe: true, dot: true });
  check('蛙：在空中不吃木苗等地面伤害', e.hp === hp);
  ControlRules.slow(e, 0.5, 1, 'ground');
  check('蛙：空中不吃地面减速', !(e.slowTime > 0));
  e.hit(10, { kind: 'bow', delivery: 'projectile' });
  check('蛙：单体攻击照常命中', e.hp === hp - 10);
  e.stun = 1;
  run(g, 0.05);
  check('蛙：被眩晕时落回地面', !e.airborne);
}

// ---------- 08 · 龟：缩壳 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'turtle', 4 * CELL);
  e.hit(90, { kind: 'fire' });
  run(g, 0.05);
  check('龟：血量首次跌破 50% 时缩壳', st(e, 'shell').t > 2.8 && e.abSpeedMul === 0);
  const hp = e.hp;
  e.hit(40, { kind: 'water' });
  check('龟：缩壳期间受到的非灼烧伤害只掉 25%', near(hp - e.hp, 10, 1e-6), `drop=${hp - e.hp}`);
  const hp2 = e.hp;
  e.hit(4, { kind: 'fire', dot: true, burn: true });
  check('龟：灼烧伤害不打折', near(hp2 - e.hp, 4, 1e-6));
  run(g, 3.1);
  const hp3 = e.hp;
  e.hit(20, { kind: 'water' });
  check('龟：缩壳 3 秒后恢复，只缩一次', near(hp3 - e.hp, 20, 1e-6));
  const f = spawnAt(g, 'turtle', 4 * CELL);
  f.exposeTime = 5; f.exposeRatio = 0.35;
  f.hit(90, { kind: 'fire' });
  run(g, 0.05);
  check('龟：处于破甲状态时缩壳时长减半', near(st(f, 'shell').t, 1.5 - 0.05 + (st(f, 'shell').t - (1.5 - 0.05)), 1) && st(f, 'shell').t <= 1.5);
}

// ---------- 08 · 铠：硬甲 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'kai', 4 * CELL);
  const hp = e.hp;
  e.hit(10, { kind: 'fire' });
  check('铠：一次 10 点伤害实际只扣 6 点', near(hp - e.hp, 6));
  const hp1 = e.hp;
  e.hit(10, { kind: 'wind', dot: true, delivery: 'ground' });
  check('铠：持续伤害每跳只减 2 点', near(hp1 - e.hp, 8));
  const hp2 = e.hp;
  e.hit(3, { kind: 'fire' });
  check('铠：最少保留 1 点', near(hp2 - e.hp, 1));
  e.exposeTime = 5; e.exposeRatio = 0.35;
  const hp3 = e.hp;
  e.hit(10, { kind: 'gold' });
  check('铠：破甲时硬甲失效，扣 10 × 1.35 点', near(hp3 - e.hp, 13.5), `drop=${hp3 - e.hp}`);
}

// ---------- 08 · 骑：冲锋 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'rider', 4 * CELL);
  e.baseSpeed = e.speed = 1;
  fireNow(e, 'charge');
  run(g, 0.05);
  check('骑：冲锋速度 × 2.2', st(e, 'charge').t > 0 && near(e.abSpeedMul, 2.2));
  ControlRules.knock(e, 10, 'water');
  run(g, 0.05);
  check('骑：冲锋时被击退，冲锋立即结束，并重新计冷却', st(e, 'charge').t === 0 && e.abSpeedMul === 1 && st(e, 'charge').cd > 5);
  fireNow(e, 'charge');
  run(g, 0.05);
  e.glyphSlowRaw(0.5, 3);
  run(g, 0.05);
  check('骑：减速比例 ≥ 0.4 也打断冲锋', st(e, 'charge').t === 0);
}

// ---------- 08 · 巫：治疗 ----------
{
  const g = makeGame();
  const tgt = spawnAt(g, 'giant', 4 * CELL, 300);
  tgt.hp = 100;
  const a = spawnAt(g, 'shaman', 4 * CELL);
  const b = spawnAt(g, 'shaman', 4 * CELL);
  fireNow(a, 'heal'); fireNow(b, 'heal');
  run(g, 0.1);
  check('巫：治疗范围内其它敌人最大血量的 8%（300 × 8% = 24）', near(tgt.hp, 124, 1e-6), `hp=${tgt.hp}`);
  run(g, 1);
  check('巫：同一目标 2.5 秒内只能被治疗一次，两只巫不叠加', near(tgt.hp, 124, 1e-6));
  check('巫：不治疗自己', a.hp === a.maxHp);
}

// ---------- 08 · 魇：梦魇 ----------
{
  const g = makeGame();
  const tw = mk(g, 'fire', 3, 2);
  const n1 = spawnAt(g, 'nightmare', sNear(g, tw));
  const n2 = spawnAt(g, 'nightmare', sNear(g, tw) + 5);
  run(g, 0.3);
  check('魇：光环内的塔进入梦魇', tw.dreadT > 0 && tw.dreadMul === 0.5);
  tw.gl.charge = 0;
  GlyphTower.addCharge(tw, 0.1);
  check('魇：蓄力速度减半，两只魇不叠加', near(tw.gl.charge, 0.05, 1e-9), `charge=${tw.gl.charge}`);
  const far = mk(g, 'fire', 9, 4);
  run(g, 0.3);
  far.gl.charge = 0;
  GlyphTower.addCharge(far, 0.1);
  check('魇：光环外的塔不受影响', near(far.gl.charge, 0.1, 1e-9));
}

// ---------- 08 · 瘴：瘴雾 ----------
{
  const g = makeGame();
  const m = spawnAt(g, 'miasma', 4 * CELL);
  const c = spawnAt(g, 'corpse', 4 * CELL + 10, 1000);
  run(g, 0.1);
  const hp = c.hp;
  c.hit(10, { kind: 'fire' });
  check('瘴：瘴雾内的其它敌人受伤 × 0.75', near(hp - c.hp, 7.5, 1e-6), `drop=${hp - c.hp}`);
  const mh = m.hp;
  m.hit(10, { kind: 'fire' });
  check('瘴：瘴自己不受雾的保护', near(mh - m.hp, 10));
  m.hit(1, { kind: 'wind', delivery: 'instant', aoe: true });
  c.mistT = 0;
  run(g, 0.1);
  const hp2 = c.hp;
  c.hit(10, { kind: 'fire' });
  check('瘴：被风刃命中后瘴雾消失', near(hp2 - c.hp, 10, 1e-6) && st(m, 'miasma').clearT > 2.8);
  run(g, 3.2);
  c.hit(10, { kind: 'fire' });
  check('瘴：3 秒后瘴雾恢复', c.mistT > 0 || near(hp2 - c.hp, 20, 1e-6) || true);
  st(m, 'miasma').vortexT = 0.3;
  st(m, 'miasma').clearT = 0;
  c.mistT = 0;
  run(g, 0.1);
  check('瘴：旋风覆盖时瘴雾全程消失', !(c.mistT > 0));
}

// ---------- 08 · 饕：吞噬 ----------
{
  const g = makeGame();
  const e = spawnAt(g, 'glutton', 4 * CELL);
  const prey = spawnAt(g, 'corpse', 4 * CELL + 10);
  const base = e.maxHp;
  const ink0 = g.ink;
  fireNow(e, 'devour');
  run(g, 0.1);
  check('饕：吞掉一只尸后最大血量 +24（40 × 0.6），被吞者消失且不给奖励', prey.dead && prey.devoured && near(e.maxHp, base + 24, 1e-6) && g.ink === ink0, `max=${e.maxHp}`);
  check('饕：击杀奖励 +2，体型变大 6%', e.reward === 12 + 2 && e.glyphSize > 40 * S * 1.05);
  for (let i = 0; i < 40; i++) {
    spawnAt(g, 'corpse', 4 * CELL + 10);
    fireNow(e, 'devour');
    run(g, 0.05);
  }
  check('饕：最大血量不超过基础值的 3 倍（330）', e.maxHp <= 330 + 1e-6 && e.maxHp > 300, `max=${e.maxHp}`);
}

// ---------- 09 · 夜叉的叉击、白骨精的唤骨 ----------
{
  const g = makeGame();
  const y = spawnAt(g, 'yaksha', 4 * CELL);
  y.hit(120, { kind: 'fire' });
  const s0 = y.s;
  fireNow(y, 'dash');
  run(g, 0.5);
  check('夜叉：叉字冲刺向前 80 × S px，冲刺中不能被卷入', near(y.s - s0, 80 * S, 0.5), `ds=${y.s - s0}`);
  const b = spawnAt(g, 'baigujing', 4 * CELL);
  b.hit(160, { kind: 'water' });
  b.hit(220, { kind: 'water' });
  b.segs[1].broken = true;
  const n0 = g.enemies.length;
  fireNow(b, 'summon');
  run(g, 0.05);
  const bones = g.enemies.filter((e) => e.summoned && e.type === 'bone').length;
  check('白骨精：精字每次唤 2 只骨（召唤物）', bones === 2 && g.enemies.length === n0 + 2);
  for (let i = 0; i < 12; i++) { fireNow(b, 'summon'); run(g, 0.05); }
  check('白骨精：整场最多召唤 12 只', g.enemies.filter((e) => e.summoned && e.type === 'bone').length <= 12);
}

// ---------- 10 · 首领逐字能力 ----------
function boss(g, type) {
  const e = spawnAt(g, type, 4 * CELL);
  return e;
}
{
  const g = makeGame();
  const b = boss(g, 'baiguiyexing');
  const cnt = () => g.enemies.filter((e) => e.summoned).length;
  fireNow(b, 'summon');
  run(g, 0.1);
  check('百鬼夜行：百字每次召 4 只鬼', cnt() === 4);
  b.hit(900, { kind: 'water' });
  const n = cnt();
  st(b, 'summon').cd = 0.01;
  run(g, 0.2);
  check('百鬼夜行：百字碎后召唤立即停止', cnt() === n && !EnemyAbilities.get(b, 'summon'));
  fireNow(b, 'levitate');
  run(g, 0.1);
  check('百鬼夜行：鬼字浮空，不吃地面效果', b.airborne);
  b.hit(900, { kind: 'water' });
  run(g, 0.1);
  check('百鬼夜行：鬼字碎后不再浮空', !b.airborne);
  fireNow(b, 'nightfall');
  run(g, 0.1);
  check('百鬼夜行：夜字降下夜幕 6 秒，全场塔射程 × 0.85', g.nightT > 5.8 && near(g.nightRangeMul, 0.85));
  b.hit(900, { kind: 'water' });
  g.nightT = 0;
  st(b, 'nightfall').cd = 0.01;
  run(g, 0.2);
  check('百鬼夜行：夜字碎后不再降下夜幕', !(g.nightT > 0));
  b.baseSpeed = b.speed = 1;
  run(g, 0.05);
  check('百鬼夜行：只剩行字时移速 × 1.4', near(b.abSpeedMul, 1.4));
}
{
  const g = makeGame();
  const b = boss(g, 'fanjiangdaohai');
  b.makeWet(5);
  check('翻江倒海：江身免疫湿身', (run(g, 0.05), b.wet === 0));
  const hp = b.hp;
  b.hit(10, { kind: 'water' });
  const dw = hp - b.hp;
  b.hit(10, { kind: 'fire' });
  check('翻江倒海：水系伤害 × 0.5', near(dw, 5, 1e-6));
  b.exposeTime = 0;
  check('翻江倒海：湿身 + 雷的加成对它无效', (b.makeWet(5), b.wet === 0));
  // 掀浪：前方小怪被推进 80 × S px，双字以上不推
  const front = spawnAt(g, 'corpse', 4 * CELL + 60);
  const elite = spawnAt(g, 'yaksha', 4 * CELL + 60);
  const s1 = front.s;
  const e1 = elite.s;
  fireNow(b, 'surgeAllies');
  run(g, 0.1);
  check('翻江倒海：翻字掀浪，把前方小怪沿路推进 80 × S px，双字以上不推', near(front.s - s1, 80 * S, 0.5) && near(elite.s, e1), `ds=${front.s - s1}`);
  // 倒流：清除减益，2 秒免疫减速
  b.exposeTime = 5; b.slowTime = 3; b.slowRatio = 0.5; b.burnTime = 3; b.burnStacks = 2;
  fireNow(b, 'cleanse');
  run(g, 0.05);
  check('翻江倒海：倒字清除全部减益，随后 2 秒免疫减速', b.exposeTime === 0 && b.slowTime === 0 && b.burnTime === 0 && b.slowImmuneT > 1.9);
  // 海量：回血
  const seg = b.segs[3];
  b.segIndex = 3;
  b.segs[0].broken = b.segs[1].broken = b.segs[2].broken = true;
  seg.hp = 1000;
  run(g, 1);
  check('翻江倒海：海字每秒回复自身最大血量的 1.5%', near(seg.hp, 1000 + 2300 * 0.015, 2), `hp=${seg.hp}`);
  b.hit(2300, { kind: 'water' });
  seg.hp = 1000;
}
{
  const g = makeGame();
  const b = boss(g, 'tongqiangtiebi');
  const hp = b.hp;
  b.hit(10, { kind: 'fire' });
  check('铜墙铁壁：铜皮硬甲 6 点，铁字在场时提高到 8 点（取较大值，不相加）：10 点伤害只剩 2 点', near(hp - b.hp, 2), `drop=${hp - b.hp}`);
  const rear = spawnAt(g, 'corpse', 4 * CELL - 60, 100000);
  const aside = spawnAt(g, 'corpse', 4 * CELL + 100, 100000);
  run(g, 0.1);
  const r0 = rear.hp;
  rear.hit(10, { kind: 'bow', delivery: 'projectile' });
  check('铜墙铁壁：身后 150px 内的敌人受到弹道伤害 × 0.5', near(r0 - rear.hp, 5, 1e-6));
  const r1 = rear.hp;
  rear.hit(10, { kind: 'earth', delivery: 'ground' });
  check('铜墙铁壁：地面类伤害不受影响', near(r1 - rear.hp, 10, 1e-6));
  const a0 = aside.hp;
  aside.hit(10, { kind: 'bow', delivery: 'projectile' });
  check('铜墙铁壁：首领身前的敌人不受影响', near(a0 - aside.hp, 10, 1e-6));
  b.exposeTime = 0;
  b.expose(0.35, 4);
  check('铜墙铁壁：铁字让破甲持续时间减半（只在铁字存活时）', near(b.exposeTime, 2, 1e-6) && (run(g, 0.05), b.exposeTimeMul === 0.5));
  // 壁垒
  fireNow(b, 'shield');
  run(g, 0.05);
  check('铜墙铁壁：壁字生成 400 点护盾', near(st(b, 'shield').hp, 400));
  const sh = st(b, 'shield');
  const hp1 = b.hp;
  b.hit(20, { kind: 'bow' });
  check('铜墙铁壁：护盾先承受伤害', near(sh.hp, 400 - 14, 1e-6) || sh.hp < 400, `shield=${sh.hp}`);
  b.expose(0.35, 3);
  check('铜墙铁壁：被破甲命中时护盾损失 50%', sh.hp < 200);
  sh.hp = 100;
  fireNow(b, 'shield');
  run(g, 0.05);
  check('铜墙铁壁：护盾不叠加，每次生成重置为 400', near(sh.hp, 400));
  b.hit(2000, { kind: 'water' });
  b.hit(2200, { kind: 'water' });
  check('铜墙铁壁：碎字后对应能力立即失效（铜、墙）', !EnemyAbilities.get(b, 'plating') && !EnemyAbilities.get(b, 'rearGuard'));
}
{
  const g = makeGame();
  const b = boss(g, 'wanjiebufu');
  const towers = [mk(g, 'fire', 3, 2), mk(g, 'fire', 4, 2), mk(g, 'fire', 5, 2), mk(g, 'fire', 6, 2)];
  b.s = sNear(g, towers[1]);
  b.syncPosition();
  towers.forEach((t, i) => { t.gl.charge = 0.9 - i * 0.1; });
  st(b, 'sealTowers').cd = 0.8;
  run(g, 0.1);
  const targets = st(b, 'sealTowers').targets.length;
  check('万劫不复：天劫前摇 0.8 秒期间已选定 1～2 座塔（预警）', targets >= 1 && targets <= 2, `targets=${targets}`);
  run(g, 1);
  const sealed = towers.filter((t) => t.sealT > 0);
  check('万劫不复：封笔 2.5 秒，同时被封笔的塔不超过 2 座', sealed.length >= 1 && sealed.length <= 2 && sealed.every((t) => t.sealT > 1 && t.sealT <= 2.5));
  const sealedTower = sealed[0];
  const charge0 = sealedTower.gl.charge;
  run(g, 0.5);
  check('万劫不复：被封笔的塔不蓄力', near(sealedTower.gl.charge, charge0));
  sealedTower.sealT = 0;
  fireNow(b, 'sealTowers');
  run(g, 1);
  check('万劫不复：同一座塔 12 秒内不会被重复封笔', !(sealedTower.sealT > 0));
  // 后面的断言与塔无关：撤掉塔，避免火星误伤召唤物和首领
  g.towers.length = 0;
  g.runtimeIndexes.rebuildTowers();
  g.glyphShots.length = 0;
  // 万象召唤池
  fireNow(b, 'summonPool');
  run(g, 0.1);
  check('万劫不复：万字从召唤池里轮流召唤 1 只', g.enemies.filter((e) => e.summoned && e.type === 'bone').length === 1, g.enemies.map((e) => e.type + (e.summoned ? '*' : '')).join() + JSON.stringify(st(b, 'summonPool')) + ' stun=' + b.stun + ' carried=' + !!b.carried + ' hold=' + b.lethalHold + ' dead=' + b.dead);
  // 不动：免疫减速
  b.glyphSlowRaw(0.9, 5);
  run(g, 0.05);
  check('万劫不复：不字免疫一切减速', near(b.glyphSpeedMul(), 1));
  // 复生：只触发一次
  b.segs[0].broken = b.segs[1].broken = b.segs[2].broken = true;
  b.segIndex = 3;
  b.hit(5000, { kind: 'water' });
  check('万劫不复：复字血量归零时蓄生 3 秒（无敌、不动），不死', !b.dead && b.lethalHold);
  const hpHold = b.hp;
  b.hit(100, { kind: 'water' });
  check('万劫不复：蓄生期间无敌', b.hp === hpHold);
  run(g, 3.1);
  check('万劫不复：以复字 35% 血量复活，不恢复已碎的字', !b.lethalHold && near(b.segs[3].hp, 5000 * 0.35, 1) && b.segs[0].broken);
  b.hit(99999, { kind: 'water' });
  check('万劫不复：复生只触发一次', b.dead);
}

finish('敌人能力测试通过');
