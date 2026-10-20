/**
 * 火、水字形弹道回归测试（工单 05）：加载真实配置、笔刷、字形组件与招式，
 * 用最小的 Game 驱动塔与敌人，检查按实例的笔画/蓄力、普攻、自动大招、全局间隔、
 * 浪的下限与不重复卷入、出售后弹道收尾，以及绘制不抛错。
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const vt = { t: 1e6 };
const ctx = { console, Math, Set, Map, WeakMap, Array, Object, JSON, setTimeout, clearTimeout };
ctx.Date = { now: () => vt.t };
ctx.performance = { now: () => vt.t };
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.document = { getElementById: () => null, createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
vm.createContext(ctx);

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const conquestSrc = read('js/conquestGame.js');
const files = [
  'js/config.js', 'js/config/domain-01.js', 'js/config/domain-02.js', 'js/config/domain-03.js',
  'js/config/glyph-battle.js', 'js/config/glyphs.js', 'js/config/glyphs-ext.js', 'js/config/glyphs-fusion.js',
  'js/config/fusion.js', 'js/config/codex.js',
  'js/utils.js', 'js/runtime.js', 'js/core/path-track.js', 'js/core/spawner.js',
  'js/glyph/brush.js', 'js/glyph/fx.js', 'js/glyph/adapter.js', 'js/glyph/glyph-tower.js', 'js/glyph/kit.js',
  'js/glyph/fire.js', 'js/glyph/water.js', 'js/glyph/earth.js', 'js/glyph/wood.js',
  ...['gold', 'wind', 'cannon', 'thunder', 'ice', 'bow', 'mountain', 'sword', 'yan', 'lin', 'fen'].map((n) => `js/glyph/${n}.js`),
  'js/glyph/system.js',
  'js/tower.js', 'js/entities/towers/effects.js',
  'js/entities/towers/misc.js', 'js/entities/towers/rendering-basic.js',
  'js/enemy.js', 'js/entities/enemy/combat.js', 'js/entities/enemy/lifecycle.js', 'js/entities/enemy/misc.js', 'js/entities/enemy/motion.js',
];
const src = files.map(read).join('\n;\n')
  + '\nclass Game {}\n' + read('js/core/waves.js')
  + '\n;' + conquestSrc.slice(0, conquestSrc.indexOf('class ConquestGame {'))
  + '\nclass ConquestGame {}\n' + read('js/modes/conquest/waves.js')
  + '\nglobalThis.__X = { Enemy, Tower, Game, ConquestGame, PathTrack, RuntimeIndexes, CONFIG, GlyphTower, GlyphSystem, GlyphFX, GlyphFire, GlyphWater, GlyphEarth, GlyphWood, GlyphKit, Brush };';
vm.runInContext(src, ctx);
const { Enemy, Tower, Game, ConquestGame, RuntimeIndexes, CONFIG, GlyphTower, GlyphSystem, GlyphFX, GlyphFire, GlyphWater, GlyphEarth, GlyphWood, GlyphKit, Brush } = ctx.__X;
const CELL = CONFIG.CELL_SIZE;
const S = CONFIG.GLYPH_SCALE;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// 路径 (0,1)→(9,1)→(9,4)：直道加拐角，足够放下两座塔
const cells = [];
for (let x = 0; x <= 9; x++) cells.push({ x, y: 1 });
for (let y = 2; y <= 4; y++) cells.push({ x: 9, y });

function makeGame(Cls = Game) {
  const g = new Cls();
  Object.assign(g, {
    ink: 0, coreHp: 20, maxCoreHp: 20, towers: [], enemies: [], path: cells,
    gameEnded: false, updateUI() {}, worldW: 26 * CELL,
    particleSystem: { createExplosion() {} },
    gameOver(v) { this.gameEnded = true; },
  });
  g.runtimeIndexes = new RuntimeIndexes(g);
  g.resetBattleState(null);
  return g;
}

function mk(g, type, gx, gy) {
  const t = new Tower(type, gx, gy, g);
  g.towers.push(t);
  return t;
}

// 把所有塔、弹道、敌人推进 sec 秒（步长 1/60）
function run(g, sec) {
  const dtMs = 1000 / 60;
  const n = Math.round(sec * 60);
  for (let i = 0; i < n; i++) {
    vt.t += dtMs;
    GlyphSystem.tick(g, dtMs / 1000);
    g.runtimeIndexes.rebuildEnemies();
    for (const t of g.towers) t.update(vt.t, dtMs, g.enemies);
    for (const e of g.enemies) e.update(vt.t, dtMs);
    g.enemies = g.enemies.filter((e) => !e.dead);
    g.runtimeIndexes.rebuildEnemies();
    GlyphSystem.update(g, dtMs / 1000);
  }
}

function spawnAt(g, type, s, hp) {
  const e = new Enemy(type, cells, g);
  e.s = s; e.lane = 0; e.baseSpeed = e.speed = 0; e.syncPosition();
  if (hp) { e.hp = e.maxHp = hp; }
  g.enemies.push(e);
  return e;
}

// 假 2D 画布：任何方法都可调用，用来检查绘制代码不抛错
function fakeCtx() {
  const target = {};
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// ---------- 配置 ----------
const fireCfg = CONFIG.TOWERS.fire.glyph;
const waterCfg = CONFIG.TOWERS.water.glyph;
check('火、水塔身尺寸 68，造价保留', CONFIG.TOWERS.fire.size === 68 && CONFIG.TOWERS.water.size === 68 && CONFIG.TOWERS.fire.cost === 120 && CONFIG.TOWERS.water.cost === 100);
check('像素量乘 GLYPH_SCALE', near(fireCfg.range, 235 * S) && near(fireCfg.sparkSpeed, 520 * S) && near(fireCfg.bombArc, 150 * S)
  && near(fireCfg.bombRadius, 125 * S) && near(fireCfg.markRadius, 100 * S) && near(waterCfg.jetWidth, 18 * S)
  && near(waterCfg.jetKnock, 8 * S) && near(waterCfg.waveSpeed, 420 * S));
check('时间、伤害、概率、蓄力类参数照搬', fireCfg.sparkInterval === 0.3 && fireCfg.bombDamage === 85 && fireCfg.critChance === 0.15
  && fireCfg.chargePerSec === 0.12 && fireCfg.chargePerHit === 0.012 && waterCfg.chargePerSec === 0.08 && waterCfg.chargePerHit === 0.02
  && waterCfg.waveTime === 1.05 && waterCfg.waveStun === 0.55);
check('Tower.range（格）与招式射程一致', near(CONFIG.TOWERS.fire.range * CELL, fireCfg.range));
check('全局大招间隔已配置', CONFIG.ULT_GLOBAL_GAP === 0.6);
check('火 4 笔、水 4 笔，笔顺固定', CONFIG.GLYPHS.fire.strokes.length === 4 && CONFIG.GLYPHS.water.strokes.length === 4
  && CONFIG.GLYPHS.water.strokes[0].id === 'shu');
check('土 3 笔，笔顺为横、竖、横', CONFIG.GLYPHS.earth.strokes.length === 3
  && CONFIG.GLYPHS.earth.strokes.map((s) => s.id).join() === 'hengTop,shu,hengBottom');
check('土塔招式参数按 GLYPH_SCALE 换算', near(CONFIG.TOWERS.earth.glyph.range, 165 * S)
  && near(CONFIG.TOWERS.earth.glyph.wallRadius, 95 * S) && near(CONFIG.TOWERS.earth.glyph.wallGlyph, 150 * S)
  && CONFIG.TOWERS.earth.glyph.poundInterval === 1.15 && CONFIG.TOWERS.earth.glyph.wallSlow === 0.65
  && CONFIG.TOWERS.earth.cost === 150
  && near(CONFIG.TOWERS.earth.range * CELL, CONFIG.TOWERS.earth.glyph.range));
check('土已进入塔池与图鉴文案', CONFIG.ACTIVE_TOWERS.includes('earth')
  && CONFIG.CODEX.towers.earth && CONFIG.CODEX.towers.earth.moves.length === 2);
check('木 4 笔，笔顺为横、竖、撇、捺', CONFIG.GLYPHS.wood.strokes.length === 4
  && CONFIG.GLYPHS.wood.strokes.map((s) => s.id).join() === 'heng,shu,pie,na');
check('木塔招式参数按 GLYPH_SCALE 换算', near(CONFIG.TOWERS.wood.glyph.range, 215 * S)
  && near(CONFIG.TOWERS.wood.glyph.vineLength, 170 * S) && near(CONFIG.TOWERS.wood.glyph.sproutRadius, 26 * S)
  && CONFIG.TOWERS.wood.glyph.sproutMax === 4 && CONFIG.TOWERS.wood.cost === 105
  && near(CONFIG.TOWERS.wood.range * CELL, CONFIG.TOWERS.wood.glyph.range));
check('木已进入塔池与图鉴文案', CONFIG.ACTIVE_TOWERS.includes('wood')
  && CONFIG.CODEX.towers.wood && CONFIG.CODEX.towers.wood.moves.length === 2);

// ---------- 按实例的状态 ----------
{
  const g = makeGame();
  const f1 = mk(g, 'fire', 3, 2);
  const f2 = mk(g, 'fire', 5, 2);
  const w1 = mk(g, 'water', 7, 2);
  check('字形塔挂载 gl 组件、旧攻击字段清零', f1.gl && w1.gl && f1.damage === 0 && f1.cooldown === 0 && w1.slow === 0);
  check('每座塔各自持有笔画、蓄力', f1.gl.strokes !== f2.gl.strokes && f1.gl.strokes.length === 4 && f1.gl.charge === 0.35 && w1.gl.charge === 0.35);
  check('新塔「写出整字」：所有笔画 prog 从 0 起、按笔顺延迟', f1.gl.strokes.every((s) => s.prog === 0) && f1.gl.strokes[0].delay < f1.gl.strokes[3].delay);
  f1.gl.charge = 0.9;
  check('蓄力互不影响', f2.gl.charge === 0.35);
  run(g, 1.5);
  check('空场 1.5 秒后整字写完', f1.gl.strokes.every((s) => s.prog >= 1));
  check('没有敌人时不蓄力', f1.gl.charge === 0.9);
  // 非字形配置不挂 gl（旧单字塔已于 2026-10-20 删除，这里注入一个测试桩类型）
  CONFIG.TOWERS.__probe = { char: '测', cost: 0, size: 68 };
  check('旧塔（非字形）不挂 gl', new Tower('__probe', 1, 3, g).gl === null);
  delete CONFIG.TOWERS.__probe;
}

// ---------- 火：普攻、灼烧、两点轮流与写回 ----------
{
  const g = makeGame();
  const f = mk(g, 'fire', 3, 2);   // 塔心 (252, 180)
  run(g, 1.5);
  const e = spawnAt(g, 'giant', 3 * CELL, 100000);
  const hp0 = e.hp;
  run(g, 0.08);
  const sparks = g.glyphShots.filter((s) => s.kind === 'spark');
  check('射程内有敌人：发射火星并消耗对应的点', sparks.length === 1 && f.gl.strokes[sparks[0].stroke].prog < 1);
  run(g, 0.6);
  const used = new Set();
  g.glyphShots.forEach((s) => s.kind === 'spark' && used.add(s.stroke));
  check('敌人受伤并被灼烧', e.hp < hp0 && e.burnTime > 0 || e.burnStacks > 0);
  check('命中增加蓄力', f.gl.charge > 0.35);
  run(g, 2.5);
  check('被灼烧的敌人至少叠到 2 层或在持续掉血', e.hp < hp0 - 20);
}

// ---------- 火：焚 ----------
{
  const g = makeGame();
  const f = mk(g, 'fire', 3, 2);
  run(g, 1.5);
  // 入口（带延伸）附近 150px 内不允许落点：敌人只在入口处，焚返回 false
  const early = spawnAt(g, 'corpse', 0, 100000);
  check('没有合适落点时 cast 返回 false', GlyphFire.cast(f, [early]) === false);
  g.enemies.length = 0;
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', 4.5 * CELL + i * 8, 100000);
  const pool = GlyphWorld_inRange(g, f);
  f.gl.charge = 1;
  run(g, 0.1);
  const bomb = g.glyphShots.find((s) => s.kind === 'bomb');
  check('蓄满且射程内有敌人 → 自动释放，蓄力清零', !!bomb && f.gl.charge < 0.2, `charge=${f.gl.charge.toFixed(2)}`);
  check('焚消耗全部 4 笔', f.gl.strokes.every((s) => s.prog < 1));
  const tr = g.getPathTrack(g.path);
  check('落点在这座塔射程 1.15 倍内、离入口足够远', Math.hypot(bomb.tx - f.x, bomb.ty - f.y) <= fireCfg.range * 1.15 + 1
    && tr.nearestS(bomb.tx, bomb.ty) >= fireCfg.landMinS - 1);
  const hpBefore = g.enemies.map((e) => e.hp);
  run(g, 1.0);
  check('落地后爆炸伤害范围内敌人', g.enemies.every((e, i) => e.hp < hpBefore[i]));
  const mark = g.glyphShots.find((s) => s.kind === 'mark');
  check('留下火字焦土（地面弹道）', !!mark && mark.ground === true);
  run(g, 4);
  check('焦土 3.2 秒后消失', !g.glyphShots.some((s) => s.kind === 'mark'));
}
function GlyphWorld_inRange(g, t) { return g.runtimeIndexes.enemiesInRange(t.x, t.y, t.gl.cfg.range); }

// ---------- 水：水箭 ----------
{
  const g = makeGame();
  const w = mk(g, 'water', 5, 2);   // 塔心 (396, 180)
  run(g, 1.5);
  const e = spawnAt(g, 'corpse', 5.2 * CELL, 100000);
  const s0 = e.s;
  run(g, 0.2);
  const jet = g.glyphShots.find((s) => s.kind === 'jet');
  check('竖钩被消耗并发出水箭', !!jet && w.gl.strokes[0].prog < 1 && w.gl.strokes[1].prog >= 1);
  run(g, 0.3);
  check('水箭击退、打湿、造成伤害', e.s < s0 && e.wet > 0 && e.hp < e.maxHp);
  // 充能上限：10 只敌人排成一列，一发水箭最多按 3 个命中充能
  const g2 = makeGame();
  const w2 = mk(g2, 'water', 5, 2);
  run(g2, 1.5);
  for (let i = 0; i < 10; i++) spawnAt(g2, 'corpse', 5.0 * CELL + (i - 5) * 3, 100000);
  w2.gl.charge = 0.5;
  g2.runtimeIndexes.rebuildEnemies();
  const before = w2.gl.charge;
  GlyphWater.jetHit({ tower: w2, game: g2, x: w2.x, y: w2.y, aim: Math.atan2(g2.enemies[0].y - w2.y, g2.enemies[0].x - w2.x), len: 200 });
  const gain = w2.gl.charge - before;
  check('单发水箭充能最多按 3 个命中计', gain <= waterCfg.chargePerHit * 3 + 1e-9 && gain > 0, `gain=${gain.toFixed(3)}`);
}

// ---------- 水：潮（塔防）----------
{
  const g = makeGame();
  const w = mk(g, 'water', 5, 2);
  run(g, 1.5);
  const es = [];
  for (let i = 0; i < 5; i++) es.push(spawnAt(g, 'corpse', 4.6 * CELL + i * 10, 100000));
  w.gl.charge = 1;
  const sMax = Math.max(...es.map((e) => e.s));
  run(g, 0.05);
  const wave = g.glyphShots.find((s) => s.kind === 'wave');
  check('自动释放潮：消耗横撇、撇、捺，竖钩保留', !!wave && !w.gl.strokes[1].prog && w.gl.strokes[0].prog >= 0);
  check('浪头从最前敌人前方涌起', wave.s0 > sMax && wave.s0 <= sMax + waterCfg.waveLead + 1);
  check('塔防倒卷下限为 waveFloor', near(wave.floor, 80 * S));
  run(g, 0.5);
  check('卷入的敌人 carried 指向浪、s 跟随浪头', es.filter((e) => e.carried === wave).length >= 3 && es.every((e) => e.s < sMax + 1));
  const ids = new Set(wave.caught);
  // 另一座水塔的浪不能再卷同一批敌人
  const w2 = mk(g, 'water', 7, 2);
  run(g, 1.5);
  const wave2 = { tower: w2, game: g, kind: 'wave', track: wave.track, s: wave.s0, s0: wave.s0, floor: wave.floor, t: 0, dur: 1, caught: [] };
  GlyphWater.updateWave(wave2, 1 / 60);
  check('一只敌人同一时间只被一道浪卷入', wave2.caught.every((e) => !ids.has(e)));
  run(g, 1.2);
  check('浪结束后释放：carried 清空并眩晕', es.every((e) => e.carried === null) && es.some((e) => e.stun > 0 || e.hp < e.maxHp));
  check('倒卷不把敌人推出画面（s 不低于下限）', es.every((e) => e.s >= 80 * S - 1), `min s=${Math.min(...es.map((e) => e.s)).toFixed(1)}`);
}

// 塔正前方（离塔最近）的路径里程
const sNear = (g, t) => GlyphKit.nearestTrack(g, t.x, t.y).s;

// ---------- 土：夯土（2026-10-20 重做）----------
{
  const g = makeGame();
  const t = mk(g, 'earth', 3, 2);
  run(g, 1.5);
  const s0 = sNear(g, t);
  const a = spawnAt(g, 'corpse', s0, 100000);
  const b = spawnAt(g, 'corpse', s0 + 20, 100000);
  run(g, 0.05);
  check('下横砸地：射程内敌人全部受伤并陷入泥泞', a.hp < a.maxHp && b.hp < b.maxHp && a.slowTime > 0 && b.slowTime > 0);
  check('夯土不出飞行弹道，只留地波', g.glyphShots.length > 0 && g.glyphShots.every((s) => s.kind === 'pound'));
  check('下横被消耗', t.gl.strokes[2].prog < 1 && t.gl.strokes[0].prog >= 1);
  check('泥泞使移速倍率降到 0.65', near(a.glyphSpeedMul(), 1 - CONFIG.TOWERS.earth.glyph.mireSlow));
}

// ---------- 土：壁垒 ----------
{
  const g = makeGame();
  const t = mk(g, 'earth', 3, 2);
  run(g, 1.5);
  const early = spawnAt(g, 'corpse', 0, 100000);
  check('没有合适落点时 cast 返回 false', GlyphEarth.cast(t, [early]) === false);
  g.enemies.length = 0;
  const s0 = sNear(g, t);
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', s0 + i * 8, 100000);
  t.gl.charge = 1;
  run(g, 0.1);
  check('蓄满且射程内有敌人 → 自动释放壁垒，蓄力清零', g.glyphShots.some((s) => s.kind === 'lob') && t.gl.charge < 0.2, `charge=${t.gl.charge.toFixed(2)}`);
  check('壁垒消耗全部 3 笔', t.gl.strokes.every((s) => s.prog < 1));
  run(g, 1.0);
  const wall = g.glyphShots.find((s) => s.kind === 'wall');
  check('落地立起壁垒（地面弹道）', !!wall && wall.ground === true);
  check('壁垒内敌人被重度减速', g.enemies.every((e) => e.slowTime > 0 && e.glyphSpeedMul() <= 1 - 0.6 + 1e-9));
  const hpWall = g.enemies.map((e) => e.hp);
  run(g, 4.5);
  check('壁垒到时崩塌并消失', !g.glyphShots.some((s) => s.kind === 'wall'));
  check('崩塌造成伤害', g.enemies.every((e, i) => hpWall[i] - e.hp >= CONFIG.TOWERS.earth.glyph.collapseDamage));
}

// ---------- 木：播种（2026-10-20 重做）----------
{
  const g = makeGame();
  const t = mk(g, 'wood', 3, 2);
  run(g, 1.5);
  const e = spawnAt(g, 'giant', sNear(g, t), 100000);
  run(g, 0.05);
  check('撇笔被消耗并抛出种子', g.glyphShots.filter((s) => s.kind === 'seed').length === 1 && t.gl.strokes[2].prog < 1);
  run(g, 0.6);
  const sprout = g.glyphShots.find((s) => s.kind === 'sprout');
  check('种子落在目标前方的路上，长成木苗', !!sprout && sprout.ground && near(sprout.s, e.s + CONFIG.TOWERS.wood.glyph.seedLead, 1));
  e.s = sprout.s; e.syncPosition();
  run(g, 1.2);
  check('木苗刺伤并拖慢经过者，回充蓄力', e.hp < e.maxHp && e.slowTime > 0 && t.gl.charge > 0.35);
  run(g, 5);
  const mine = g.glyphShots.filter((s) => s.kind === 'sprout' && s.tower === t);
  check('每塔木苗不超过上限', mine.length >= 1 && mine.length <= CONFIG.TOWERS.wood.glyph.sproutMax, `n=${mine.length}`);
}

// ---------- 木：蔓生 ----------
{
  const g = makeGame();
  const t = mk(g, 'wood', 3, 2);
  run(g, 1.5);
  const early = spawnAt(g, 'corpse', 0, 100000);
  check('没有合适落点时 cast 返回 false', GlyphWood.cast(t, [early]) === false);
  g.enemies.length = 0;
  const s0 = sNear(g, t);
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', s0 + i * 12, 100000);
  t.gl.charge = 1;
  run(g, 0.1);
  check('蓄满且射程内有敌人 → 自动释放蔓生，蓄力清零', g.glyphShots.some((s) => s.kind === 'lob') && t.gl.charge < 0.2);
  check('蔓生消耗全部 4 笔', t.gl.strokes.every((s) => s.prog < 1));
  run(g, 1.6);
  const vine = g.glyphShots.find((s) => s.kind === 'vine');
  check('藤蔓沿路生长', !!vine && vine.len > 0 && vine.len <= CONFIG.TOWERS.wood.glyph.vineLength);
  check('藤上敌人被缠住（减速并受伤）', g.enemies.every((e) => e.slowTime > 0 && e.hp < e.maxHp));
  run(g, 4.6);
  check('藤蔓到时消失', !g.glyphShots.some((s) => s.kind === 'vine'));
}

// ---------- 全局大招间隔 ----------
{
  const g = makeGame();
  const towers = [mk(g, 'fire', 3, 2), mk(g, 'fire', 4, 2), mk(g, 'fire', 5, 2)];
  run(g, 1.5);
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', 4.5 * CELL + i * 8, 100000);
  towers.forEach((t) => { t.gl.charge = 1; });
  const times = [];
  const orig = GlyphSystem.noteCast;
  let clock = 0;
  GlyphSystem.noteCast = function(game) { times.push(clock); return orig.call(this, game); };
  for (let i = 0; i < 180; i++) { clock = i / 60; run(g, 1 / 60); }
  GlyphSystem.noteCast = orig;
  check('三座蓄满的塔依次释放，不同帧扎堆', times.length >= 2 && times.every((t, i) => i === 0 || t - times[i - 1] >= CONFIG.ULT_GLOBAL_GAP - 0.02),
    `casts=${times.map((t) => t.toFixed(2)).join(',')}`);
}

// ---------- 征服（环形）：倒卷下限不绕回 ----------
{
  const g = makeGame(ConquestGame);
  g.path = cells.slice();
  g.getPathTrack = ConquestGame.prototype.getPathTrack;
  const w = mk(g, 'water', 5, 2);
  const track = g.getPathTrack(g.path);
  const e = new Enemy('corpse', cells, g);
  e.track = track; e.s = 150; e.lane = 0; e.baseSpeed = e.speed = 0; e.syncPosition(); e.x = w.x; e.y = w.y + 10;
  g.enemies.push(e);
  w.gl.strokes.forEach((s) => { s.prog = 1; });
  GlyphSystem.reset(g);
  const ok = GlyphWater.cast(w, [e]);
  const wave = g.glyphShots.find((s) => s.kind === 'wave');
  check('征服：下限 = max(0, s0 − 推回距离)，不跨过 0 点', ok && wave && wave.floor >= 0 && wave.floor <= wave.s0 && track.loop === true);
  // 太靠近起点，没有倒卷空间：返回 false（不浪费蓄力）
  const e2 = new Enemy('corpse', cells, g); e2.track = track; e2.s = 5; e2.lane = 0; e2.syncPosition();
  w.gl.strokes.forEach((s) => { s.prog = 1; });
  GlyphSystem.reset(g);
  check('没有倒卷空间时 cast 返回 false', GlyphWater.cast(w, [e2]) === false);
}

// ---------- 出售后弹道收尾 ----------
{
  const g = makeGame();
  const f = mk(g, 'fire', 3, 2);
  run(g, 1.5);
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', 4.5 * CELL + i * 8, 100000);
  f.gl.charge = 1;
  run(g, 0.2);
  check('焚在飞行中', g.glyphShots.some((s) => s.kind === 'bomb'));
  g.towers.splice(g.towers.indexOf(f), 1);   // 出售：塔不再更新
  let err = null;
  try { run(g, 6); } catch (e) { err = e; }
  check('出售后残留弹道自然结束，不报错', !err && g.glyphShots.length === 0, err ? String(err.stack).slice(0, 200) : `left=${g.glyphShots.length}`);
}

// ---------- 绘制 ----------
{
  const g = makeGame();
  const f = mk(g, 'fire', 3, 2);
  const w = mk(g, 'water', 7, 2);
  const ea = mk(g, 'earth', 5, 2);
  const wd = mk(g, 'wood', 6, 4);
  for (let i = 0; i < 6; i++) spawnAt(g, 'corpse', 4.5 * CELL + i * 8, 100000);
  f.gl.charge = 1; w.gl.charge = 1; ea.gl.charge = 1; wd.gl.charge = 1; f.selected = true;
  const c = fakeCtx();
  let err = null;
  try {
    for (let i = 0; i < 240; i++) {
      run(g, 1 / 60);
      GlyphSystem.drawGround(c, g);
      g.towers.forEach((t) => t.draw(c, vt.t));
      GlyphSystem.drawShots(c, g);
      GlyphSystem.drawFX(c);
    }
    GlyphTower.drawGhost(c, 'fire', 100, 100, 0.5);
    GlyphTower.drawGhost(c, 'water', 100, 100, 0.5, '#b4473a');
    GlyphTower.drawGhost(c, 'earth', 100, 100, 0.5, '#8a6a3f');
    GlyphTower.drawGhost(c, 'wood', 100, 100, 0.5, '#4f6f4a');
  } catch (e) { err = e; }
  check('塔身、弹道、焦土、浪头、壁垒、藤蔓、特效绘制不抛错（4 秒含大招）', !err, err ? String(err.stack).slice(0, 300) : '');
}

// ---------- 打击反馈（工单 06）----------
{
  const FB = CONFIG.GLYPH_FEEDBACK;
  const reset = () => { GlyphFX.feedback = true; GlyphFX.reduceMotion = false; ctx.InkUI = undefined; GlyphFX.reset({ w: 1872, h: 432 }); };
  const dummy = () => ({ x: 100, y: 100, char: '尸', size: 26, drawSize: 19, weight: 1, pushVx: 0 });

  reset();
  check('反馈默认开、配置集中', GlyphFX.feedback === true && FB.storageKey === 'moshou_hit_feedback' && FB.hitstopMax === 0.12 && FB.numberMax === 80);
  check('墨渍层按世界尺寸创建', GlyphFX.stainCanvas && GlyphFX.stainCanvas.width === 1872 && GlyphFX.stainCanvas.height === 432);

  // 顿帧：取最大值、有上限、按游戏时间递减
  GlyphFX.addHitstop(0.09); GlyphFX.addHitstop(0.07);
  check('顿帧取最大值而不累加', GlyphFX.hitstop === 0.09);
  GlyphFX.addHitstop(0.5);
  check('顿帧上限 0.12 秒', GlyphFX.hitstop === 0.12);
  const sc = GlyphFX.frameScale(0.05);
  check('顿帧期间游戏时间 ×0.06 并按帧时间递减', sc === FB.hitstopScale && near(GlyphFX.hitstop, 0.07));
  GlyphFX.frameScale(0.05); GlyphFX.frameScale(0.05);
  check('顿帧结束后恢复 1 倍', GlyphFX.frameScale(0.016) === 1);

  // 震屏：上限、减少动效只关震屏
  GlyphFX.addShake(500);
  check('震屏上限 22×GLYPH_SCALE', near(GlyphFX.shake, FB.maxShake * S));
  const gEnd = { gameEnded: true };
  check('结算、暂停时不抖', GlyphFX.shakeOffset(gEnd).x === 0 && GlyphFX.shakeOffset({ paused: true }).y === 0);
  GlyphFX.reset({ w: 1872, h: 432 });
  ctx.InkUI = { motionReduced: () => true };
  GlyphFX.frameScale(0.016);
  GlyphFX.addShake(10); GlyphFX.number(dummy(), 12, {}); GlyphFX.addHitstop(0.05);
  check('减少动效：不震屏，数字与顿帧仍在', GlyphFX.reduceMotion && GlyphFX.shake === 0 && GlyphFX.numbers.length === 1 && GlyphFX.hitstop === 0.05);

  // 关闭反馈：数字、顿帧、震屏、碎字、墨渍、连斩全消失，粒子（招式表现）保留
  reset();
  GlyphFX.feedback = false;
  GlyphFX.number(dummy(), 12, {}); GlyphFX.addShake(10); GlyphFX.addHitstop(0.1);
  GlyphFX.kill(dummy(), 'fire'); GlyphFX.shatter(dummy());
  GlyphFX.emit(5, 0, 0, { color: '#000', speed: [1, 2], life: [1, 1], size: [1, 1] });
  GlyphFX.ring(0, 0, 40, '#000', 0.3, 3);
  check('关闭：无数字/顿帧/震屏/碎字/连斩', GlyphFX.numbers.length === 0 && GlyphFX.hitstop === 0 && GlyphFX.shake === 0
    && GlyphFX.shards.length === 0 && GlyphFX.combo === 0 && GlyphFX.frameScale(0.016) === 1);
  check('关闭：招式粒子与冲击环保留', GlyphFX.particles.length === 5 && GlyphFX.rings.length === 1);
  {
    let touched = 0;
    GlyphFX.stainCtx = new Proxy({}, { get: () => () => { touched++; } });
    GlyphFX.stain(10, 10, 30, '#000', 0.3); GlyphFX.stampGlyph(CONFIG.GLYPHS.fire, 10, 10, 50, '#000', 0.2);
    check('关闭：不出墨渍与焦痕', touched === 0);
  }

  // 击杀：连斩、碎字、墨渍、朱印
  reset();
  for (let i = 0; i < 25; i++) GlyphFX.kill(dummy(), i % 2 ? 'water' : 'fire');
  check('击杀计连斩并盖「一气呵成」朱印', GlyphFX.combo === 25 && GlyphFX.banner && GlyphFX.banner.text === '一气呵成' && GlyphFX.nextMark === 1);
  check('击杀出碎字（每杀两半）', GlyphFX.shards.length === 50);
  GlyphFX.update(1.7);
  check('连斩超时清零', GlyphFX.combo === 0 && GlyphFX.nextMark === 0 && GlyphFX.bestCombo === 25);
  reset();
  GlyphFX.kill({ ...dummy(), weight: 3 }, 'fire');
  check('重敌击杀：震屏、顿帧与冲击环', GlyphFX.shake > 0 && GlyphFX.hitstop === 0.06 && GlyphFX.rings.length === 1);

  // 伤害数字：同屏上限；灼烧合并
  reset();
  for (let i = 0; i < 120; i++) GlyphFX.number(dummy(), 7 + i, {});
  check('同屏伤害数字上限 80，丢弃最旧', GlyphFX.numbers.length === 80 && GlyphFX.numbers[0].text === '47');
  reset();
  {
    const g = makeGame();
    const e = spawnAt(g, 'corpse', 3 * CELL, 100000);
    e.ignite(3, 5);
    let shown = 0;
    const orig = GlyphFX.number.bind(GlyphFX);
    GlyphFX.number = (...a) => { shown++; return orig(...a); };
    const sh0 = e.shakeEndTime;
    for (let i = 0; i < 120; i++) e.tickGlyphStatus(1 / 60);
    GlyphFX.number = orig;
    check('灼烧 2 秒合并为约 4 个数字（每 0.45 秒一次）', shown >= 3 && shown <= 5, `shown=${shown}`);
    check('字形伤害不触发旧受击抖动', e.shakeEndTime === sh0);
  }

  // 绘制不抛错
  reset();
  {
    const c = fakeCtx();
    let err = null;
    try {
      for (let i = 0; i < 30; i++) GlyphFX.kill(dummy(), 'fire');
      GlyphFX.number(dummy(), 20, { crit: true });
      GlyphFX.stain(100, 100, 40, '#4a2a1e', 0.35);
      for (let i = 0; i < 90; i++) {
        GlyphFX.update(1 / 60);
        GlyphFX.drawStain(c); GlyphFX.draw(c); GlyphFX.drawHud(c, 960);
      }
    } catch (e) { err = e; }
    check('墨渍、碎字、数字、连斩、朱印绘制与褪色不抛错', !err, err ? String(err.stack).slice(0, 300) : '');
  }
  reset();
  GlyphFX.release();
  check('release 释放墨渍画布引用', GlyphFX.stainCanvas === null && GlyphFX.stainCtx === null);
  GlyphFX.feedback = true;
}

if (failed) {
  console.error(`\n${failed} 项失败`);
  process.exit(1);
}
console.log('\n字形塔测试通过');
