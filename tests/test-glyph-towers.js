/**
 * 十一座新字形塔回归测试（2026-10-20）：金、风、炮、雷、冰、弓、山、剑与合字炎、林、焚。
 * 每座塔检查：配置结构与火、水一致、已注册、普攻造成伤害、蓄满自动释放大招，
 * 以及各自独特机制（破甲、聚怪、盲区、连锁、冻结、优先高血、阻挡、飞剑、双爆、繁衍、爆燃）。
 */
const { createEnv, makeChecker } = require('./helpers/glyph-env');

const env = createEnv();
const { X, CELL, makeGame, mk, run, spawnAt, sNear, fakeCtx, GLYPH_TYPES } = env;
const { CONFIG, GlyphSystem, GlyphTower, GlyphKit } = X;
const { check, near, finish } = makeChecker();
const S = CONFIG.GLYPH_SCALE;

// ---------- 配置结构 ----------
const SHARED_KEYS = ['range', 'chargePerSec', 'chargePerHit', 'rewriteAll'];
for (const type of GLYPH_TYPES) {
  const tower = CONFIG.TOWERS[type];
  const glyph = CONFIG.GLYPHS[type];
  const cfg = tower && tower.glyph;
  const ids = glyph ? glyph.strokes.map((s) => s.id) : [];
  check(`${type}：字形 / 招式 / 造价 / 文案齐全`, !!(tower && glyph && cfg && tower.char === glyph.char && tower.cost > 0 && tower.desc));
  check(`${type}：笔画 id 不重复且笔宽为三段`, ids.length > 0 && new Set(ids).size === ids.length
    && glyph.strokes.every((s) => s.pts.length >= 2 && s.w.length === 3));
  check(`${type}：通用字段与火、水一致`, SHARED_KEYS.every((k) => typeof cfg[k] === 'number'));
  check(`${type}：射程（格）与招式射程同步`, near(tower.range * CELL, cfg.range));
  check(`${type}：已注册招式实现`, GlyphTower.impl(type) === GlyphSystem.IMPLS[type] && GlyphSystem.IMPLS[type] !== X.GlyphWater);
  check(`${type}：有主色与光晕`, !!(CONFIG.GLYPH_COLORS[type] && CONFIG.GLYPH_COLORS[type + 'Glow']));
  check(`${type}：图鉴文案两招（山多一条被动）`, !!(CONFIG.CODEX.towers[type] && CONFIG.CODEX.towers[type].moves.length === (type === 'mountain' ? 3 : 2)));
}
check('商店塔池 12 座单字塔，不含合字', CONFIG.ACTIVE_TOWERS.length === 12
  && CONFIG.ACTIVE_TOWERS.every((t) => !CONFIG.TOWERS[t].fusion));
check('合字塔标记 fusion', ['yan', 'lin', 'fen'].every((t) => CONFIG.TOWERS[t].fusion === true));
check('没有任何现役塔是路径塔，山没有生命', Object.keys(CONFIG.TOWERS).every((t) => !CONFIG.TOWERS[t].onPath && !(CONFIG.TOWERS[t].hp > 0)));
check('炎＝两火 8 笔、林＝两木 8 笔、焚＝林 + 火 12 笔', CONFIG.GLYPHS.yan.strokes.length === 8
  && CONFIG.GLYPHS.lin.strokes.length === 8 && CONFIG.GLYPHS.fen.strokes.length === 12);
check('合字笔画落在字身内', ['yan', 'lin', 'fen'].every((t) => CONFIG.GLYPHS[t].strokes
  .every((s) => s.pts.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100))));
check('像素量乘 GLYPH_SCALE', near(CONFIG.TOWERS.cannon.glyph.range, 320 * S) && near(CONFIG.TOWERS.cannon.glyph.minRange, 110 * S)
  && near(CONFIG.TOWERS.fen.glyph.blazeLength, 260 * S) && CONFIG.TOWERS.fen.glyph.blazeBurn === 3);

// ---------- 通用：普攻与自动大招 ----------
for (const type of GLYPH_TYPES) {
  const g = makeGame();
  const t = mk(g, type, 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  // 炮有近身盲区：把敌人放远一些
  const base = type === 'cannon' ? s0 + 140 * S : s0;
  const es = [];
  // 慢慢走动：木、林的木苗种在敌人前方，要等敌人走上去
  for (let i = 0; i < 5; i++) {
    const e = spawnAt(g, 'corpse', base + i * 10, 100000);
    e.baseSpeed = e.speed = 0.25;
    es.push(e);
  }
  run(g, 2.5);
  check(`${type}：普攻打中敌人`, es.some((e) => e.hp < e.maxHp));
  const hp0 = es.reduce((a, e) => a + e.hp, 0);
  t.gl.charge = 1;
  g.glyphUltCd = 0;
  run(g, 0.1);
  check(`${type}：蓄满自动释放大招，蓄力清零`, t.gl.charge < 0.3, `charge=${t.gl.charge.toFixed(2)}`);
  run(g, 3);
  check(`${type}：大招后总伤害继续增加`, es.reduce((a, e) => a + e.hp, 0) < hp0);
  g.enemies.length = 0;
  g.towers.length = 0;
  let err = null;
  try { run(g, 10); } catch (e) { err = e; }
  check(`${type}：出售后残留弹道自然结束`, !err && g.glyphShots.length === 0, err ? String(err.stack).slice(0, 200) : `left=${g.glyphShots.map((s) => s.kind)}`);
}

// ---------- 金：破甲 ----------
{
  const g = makeGame();
  const t = mk(g, 'gold', 3, 2);
  run(g, 1.5);
  const es = [0, 1, 2].map((i) => spawnAt(g, 'corpse', sNear(g, t) + i * 8, 100000));
  t.gl.charge = 1;
  run(g, 1);
  check('金钟使范围内敌人破甲，受伤加深', es.every((e) => e.exposeTime > 0 && near(e.damageMul(), 1 + CONFIG.TOWERS.gold.glyph.exposeRatio)));
  const e = es[0];
  const before = e.hp;
  X.GlyphWorld.damage(e, 10, {});
  check('破甲期间 10 点伤害实扣 13.5', near(before - e.hp, 13.5));
}
{
  const g = makeGame();
  const t = mk(g, 'gold', 3, 2);
  run(g, 1.5);
  spawnAt(g, 'giant', sNear(g, t), 100000);
  run(g, 0.05);
  const blade = g.glyphShots.find((s) => s.kind === 'blade');
  check('金轮：横笔化作回旋刃', !!blade && t.gl.strokes[blade.stroke].prog < 1);
  run(g, 0.3);
  check('回旋刃飞过目标后折返', blade.back === true);
  run(g, 1);
  check('回旋刃回到出手点后结束', blade.done === true);
}

// ---------- 风：扇形与聚怪 ----------
{
  const g = makeGame();
  const t = mk(g, 'wind', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  const front = spawnAt(g, 'corpse', s0 + 20, 100000);
  const behind = spawnAt(g, 'corpse', s0 - 20, 100000);
  run(g, 0.05);
  check('风刃扇形横扫：扇内多名敌人同时受伤', front.hp < front.maxHp && behind.hp < behind.maxHp);
}
{
  const g = makeGame();
  const t = mk(g, 'wind', 3, 2);
  const s0 = sNear(g, t);
  const a = spawnAt(g, 'corpse', s0 - 40 * S, 100000);
  const b = spawnAt(g, 'corpse', s0 + 40 * S, 100000);
  const track = a.track;
  GlyphSystem.push(g, { tower: t, kind: 'vortex', ground: true, x: track.pointAt(s0).x, y: track.pointAt(s0).y, track, s: s0, t: 0, dur: 3, tick: 0, rot: 0 });
  const gap0 = b.s - a.s;
  run(g, 0.6);
  check('旋风沿路把两侧敌人吸向中心', b.s - a.s < gap0 - 20 * S, `gap ${gap0.toFixed(0)} → ${(b.s - a.s).toFixed(0)}`);
}

// ---------- 炮：盲区 ----------
{
  const g = makeGame();
  const t = mk(g, 'cannon', 3, 2);
  run(g, 1.5);
  spawnAt(g, 'corpse', sNear(g, t), 100000);
  run(g, 2);
  check('炮：离塔过近的敌人打不到', !g.glyphShots.some((s) => s.kind === 'shell'));
  const far = spawnAt(g, 'giant', sNear(g, t) + 180 * S, 100000);
  run(g, 2.6);
  check('炮：射程内远处的敌人被轰中', far.hp < far.maxHp);
}

// ---------- 雷：连锁与水雷联动 ----------
{
  const g = makeGame();
  const t = mk(g, 'thunder', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  const es = [0, 1, 2, 3].map((i) => spawnAt(g, 'corpse', s0 + i * 30, 100000));
  run(g, 0.05);
  check('电弧瞬发连锁：一次放电击中多名敌人', es.filter((e) => e.hp < e.maxHp).length >= 3);
}
{
  const g = makeGame();
  const t = mk(g, 'thunder', 3, 2);
  const cfg = CONFIG.TOWERS.thunder.glyph;
  const dry = spawnAt(g, 'corpse', 100, 100000);
  const wet = spawnAt(g, 'corpse', 400, 100000);
  wet.makeWet(5);
  const realRnd = X.GlyphFX.rnd;
  X.GlyphFX.rnd = (a) => a;
  X.GlyphThunder = GlyphSystem.IMPLS.thunder;
  X.GlyphThunder.chain(t, dry, { x: t.x, y: t.y });
  X.GlyphThunder.chain(t, wet, { x: t.x, y: t.y });
  X.GlyphFX.rnd = realRnd;
  check('湿身目标伤害 ×1.5', near(wet.maxHp - wet.hp, Math.round(cfg.arcDamage[0] * cfg.wetMul)) && near(dry.maxHp - dry.hp, cfg.arcDamage[0]));
}

// ---------- 冰：叠寒冻结 ----------
{
  const g = makeGame();
  const t = mk(g, 'ice', 3, 2);
  const e = spawnAt(g, 'corpse', 100, 100000);
  e.chill(1, 3, 1); e.chill(1, 3, 1);
  check('寒叠层减速', e.chillStacks === 2 && e.glyphSpeedMul() < 0.8);
  e.chill(2, 3, 1.1);
  check('寒叠满即冻结并清层', e.chillStacks === 0 && e.iceTime > 0 && e.stun >= 1.1);
  const f = spawnAt(g, 'corpse', sNear(g, t), 100000);
  t.gl.charge = 1;
  run(g, 0.5);
  check('寒潮冻结射程内敌人', f.iceTime > 0 && f.stun > 0);
}

// ---------- 弓：优先高血 ----------
{
  const g = makeGame();
  const t = mk(g, 'bow', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  spawnAt(g, 'corpse', s0 + 40, 500);
  const big = spawnAt(g, 'giant', s0 - 40, 5000);
  run(g, 0.05);
  const arrow = g.glyphShots.find((s) => s.kind === 'arrow');
  check('穿云优先射血量最高者', !!arrow && arrow.target === big);
}

// ---------- 山：非路径塔、「镇」光环、崩不回血 ----------
{
  const g = makeGame();
  g._pathCellSet = new Set(env.cells.map((c) => `${c.x},${c.y}`));
  g._placementGridSet = new Set();
  for (let x = 0; x < 26; x++) for (let y = 0; y < 6; y++) if (!g._pathCellSet.has(`${x},${y}`)) g._placementGridSet.add(`${x},${y}`);
  g.ink = 999;
  check('山不能放在路径格上', !g.canPlaceTower('mountain', 5, 1) && g.getPlacementBlockReason('mountain', 5, 1) === '这里不能建造');
  check('山可以放在可建造格上', g.canPlaceTower('mountain', 5, 3));
  const m = mk(g, 'mountain', 3, 2);
  check('山没有生命、不挡路', !(m.maxHp > 0) && !g.runtimeIndexes.getBlockingTowerAt(3, 2));
  const near = spawnAt(g, 'corpse', sNear(g, m), 100000);
  const far = spawnAt(g, 'corpse', 8 * CELL, 100000);
  run(g, 0.1);
  const r = CONFIG.TOWERS.mountain.glyph.suppressRate;
  check('「镇」：射程内敌人的能力冷却流速压到 suppressRate', near.abilityTimeScale === Math.max(CONFIG.CONTROL.suppressFloor, r), `scale=${near.abilityTimeScale}`);
  check('「镇」：射程外不受影响', far.abilityTimeScale === 1);
  const m2 = mk(g, 'mountain', 4, 2);
  run(g, 0.1);
  check('「镇」：多座山不叠加', near.abilityTimeScale === Math.max(CONFIG.CONTROL.suppressFloor, r));
  g.removeTower(m2);
  m.gl.charge = 1;
  m.gl.cfg = CONFIG.TOWERS.mountain.glyph;
  g.glyphUltCd = 0;
  const hp0 = near.hp;
  run(g, 0.05);
  check('崩：蓄满自动释放、不回血', m.gl.charge < 1 && m.hp === 0);
}

// ---------- 剑：飞剑沿路 ----------
{
  const g = makeGame();
  const t = mk(g, 'sword', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  const far = spawnAt(g, 'corpse', Math.max(5, s0 - 150 * S), 100000);
  spawnAt(g, 'corpse', s0, 100000);
  t.gl.charge = 1;
  run(g, 0.8);
  check('剑落：巨剑沿路逆行，斩到射程外的敌人', far.hp < far.maxHp);
}

// ---------- 炎：双爆 ----------
{
  const g = makeGame();
  const t = mk(g, 'yan', 3, 2);
  run(g, 1.5);
  const e = spawnAt(g, 'corpse', sNear(g, t), 100000);
  run(g, 0.05);
  check('炎柱叠两层灼烧', e.burnStacks >= 2);
  t.gl.charge = 1;
  g.glyphUltCd = 0;
  run(g, 0.05);
  check('双爆：两枚火字', g.glyphShots.filter((s) => s.kind === 'bomb').length === 2);
}

// ---------- 林：双生与繁衍 ----------
{
  const g = makeGame();
  const t = mk(g, 'lin', 3, 2);
  run(g, 1.5);
  spawnAt(g, 'corpse', sNear(g, t), 100000);
  run(g, 0.05);
  check('双生：一次种下两颗种子', g.glyphShots.filter((s) => s.kind === 'seed').length === 2);
  t.gl.charge = 1;
  g.glyphUltCd = 0;
  run(g, 0.05);
  check('成林：射程内敌人被定身', g.enemies.every((e) => e.stun > 0));
  const victim = spawnAt(g, 'corpse', sNear(g, t) + 20, 5);
  const before = g.glyphShots.filter((s) => s.kind === 'sprout').length;
  X.GlyphWorld.damage(victim, 999, {});
  const after = g.glyphShots.filter((s) => s.kind === 'sprout').length;
  check('林中被击杀者原地再生木苗', victim.dead && after === before + 1);
}

// ---------- 焚：燎原与爆燃 ----------
{
  const g = makeGame();
  const t = mk(g, 'fen', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  for (let i = 0; i < 4; i++) spawnAt(g, 'corpse', s0 + i * 10, 100000);
  t.gl.charge = 1;
  g.glyphUltCd = 0;
  run(g, 1.2);
  const blaze = g.glyphShots.find((s) => s.kind === 'blaze');
  check('燎原：大火沿路蔓延', !!blaze && GlyphSystem.IMPLS.fen.burning(blaze, t.gl.cfg).hi > 0);
  const victim = g.enemies[0];
  victim.hp = 1;
  X.GlyphWorld.damage(victim, 5, {});
  check('燃烧路段上被击杀 → 登记爆燃', victim.dead && blaze.pending.length === 1);
  const others = g.enemies.filter((e) => !e.dead);
  const hp0 = others.map((e) => e.hp);
  run(g, 1 / 60);
  check('爆燃在下一帧结算并波及周围', others.some((e, i) => e.hp < hp0[i]) && blaze.pending.length === 0);
}

// ---------- 绘制 ----------
{
  const g = makeGame();
  const towers = GLYPH_TYPES.map((type, i) => mk(g, type, 1 + (i % 9), i < 9 ? 2 : 3));
  const s0 = sNear(g, towers[0]);
  for (let i = 0; i < 20; i++) spawnAt(g, 'corpse', s0 + i * 20, 100000);
  towers.forEach((t) => { t.gl.charge = 1; t.selected = true; });
  towers[6].hp = 10;
  const c = fakeCtx();
  let err = null;
  try {
    for (let i = 0; i < 360; i++) {
      run(g, 1 / 60);
      GlyphSystem.drawGround(c, g);
      g.towers.forEach((t) => t.draw(c, env.vt.t));
      GlyphSystem.drawShots(c, g);
      GlyphSystem.drawFX(c);
      g.enemies.forEach((e) => e.draw(c, { drawInkText() {} }));
    }
    GLYPH_TYPES.forEach((type) => GlyphTower.drawGhost(c, type, 100, 100, 0.5));
  } catch (e) { err = e; }
  check('十一座塔的塔身、弹道、地面效果、敌人状态绘制不抛错（6 秒含大招）', !err, err ? String(err.stack).slice(0, 300) : '');
}

finish('十一座新字形塔测试通过');
