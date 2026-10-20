// 林（合字：木 + 木，2026-10-20）：定身与繁衍。
// 普攻「双生」：左右两木的撇一齐落地，在最前敌人前方一次种下两株木苗；林的木苗初触定身。
// 大招「成林」：射程内全部敌人被定身，林地持续伤害；林中被击杀的敌人原地再生一株木苗。
// 木苗的种植、生长、结算与绘制复用 GlyphWood（参数读林自己的 cfg）。
const GlyphLin = {
  SEEDS: [2, 6],   // 左木撇、右木撇

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    if (!this.SEEDS.every((i) => GlyphTower.ready(t, i))) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target || !target.track) return;
    gl.timer = cfg.seedInterval;
    gl.recoil = 3 * CONFIG.GLYPH_SCALE;
    this.SEEDS.forEach((i, k) => {
      GlyphTower.consume(t, i, 0.05, cfg.seedRewrite);
      GlyphWood.sow(t, i, target.track, target.s + cfg.seedLead + k * cfg.seedSpread);
    });
  },

  cast(t, pool) {
    if (!pool.length) return false;
    const cfg = t.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    GlyphKit.consumeAll(t, 0.4, cfg.rewriteAll);
    for (const e of pool) ControlRules.root(e, cfg.forestRoot, 'ground');
    GlyphSystem.push(t.game, { tower: t, kind: 'forest', ground: true, x: t.x, y: t.y, t: 0, dur: cfg.forestDuration, tick: 0 });
    GlyphFX.addHitstop(0.06);
    GlyphFX.addShake(8, true);
    GlyphFX.ring(t.x, t.y, cfg.range / CONFIG.GLYPH_SCALE, c.lin, 0.5, 8);
    GlyphFX.emit(40, t.x, t.y, { color: c.linLight, speed: [80, 300], life: [0.3, 0.7], size: [1.5, 3.5], grav: 160 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'seed') GlyphWood.updateSeed(s, dt);
    else if (s.kind === 'sprout') GlyphWood.updateSprout(s, dt);
    else if (s.kind === 'forest') this.updateForest(s, dt);
  },

  updateForest(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.forestTick) {
      s.tick -= cfg.forestTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.range)) {
        GlyphWorld.damage(e, cfg.forestDps * cfg.forestTick, { color: c.lin, size: 14, kind: 'wood', delivery: 'ground', aoe: true, dot: true });
      }
    }
    if (s.t >= s.dur) s.done = true;
  },

  // 林中击杀：原地直接长出一株木苗（不经播种飞行）
  onKill(s, e) {
    if (s.kind !== 'forest' || !e.track) return;
    if (Math.hypot(e.x - s.x, e.y - s.y) > s.tower.gl.cfg.range) return;
    GlyphWood.plant({ tower: s.tower, game: s.game, tx: e.x, ty: e.y, track: e.track, s: e.s });
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'seed') {
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y, { rot: s.rot, scale: 0.6, color: c.lin, glow: c.linGlow });
    } else if (s.kind === 'sprout') {
      GlyphWood.drawSprout(ctx, s, 38 * S, c.lin, c.linGlow);
    } else if (s.kind === 'forest') {
      const r = gl.cfg.range;
      const fade = Math.min(1, (s.dur - s.t) / 0.5, s.t / 0.25);
      GlyphKit.drawPool(ctx, s.x, s.y, r, '60,110,70', 0.16 * fade);
      // 一圈林木：环上均匀立八株小「木」
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        Brush.drawGlyph(ctx, CONFIG.GLYPHS.wood, {
          x: s.x + Math.cos(a) * r * 0.72, y: s.y + Math.sin(a) * r * 0.72, size: 30 * S, color: c.lin, alpha: 0.6 * fade, dry: false,
        });
      }
    }
  },
};
