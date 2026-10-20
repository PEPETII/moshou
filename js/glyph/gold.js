// 金塔（2026-10-20）：回旋与破甲。
// 普攻「金轮」：两横轮流离开塔身化作回旋刃，飞过目标后折返，去程、回程各结算一次。
// 大招「金钟」：整字罩向敌群最密处，范围伤害并使敌人「破甲」——一段时间内受到的所有伤害加深。
const GlyphGold = {
  BLADES: [2, 3],   // 两横的笔序

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let k = gl.nextDot;
    if (!GlyphTower.ready(t, this.BLADES[k])) k = 1 - k;
    const i = this.BLADES[k];
    if (!GlyphTower.ready(t, i)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    gl.nextDot = 1 - k;
    gl.timer = cfg.bladeInterval;
    const from = GlyphTower.strokeWorld(t, i, 0.5);
    const dist = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    const out = Math.min(cfg.range * 1.1, dist + cfg.bladeReach);
    // 写回在刃收回后才开始
    GlyphTower.consume(t, i, (out * 2) / cfg.bladeSpeed, cfg.bladeRewrite);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'blade', stroke: i, x: from.x, y: from.y, ox: from.x, oy: from.y,
      dx: (target.x - from.x) / dist, dy: (target.y - from.y) / dist, out, d: 0, back: false,
      hit: new Set(), rot: 0,
    });
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.bellRadius * 0.8 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.bellFlight, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'lob', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.bellFlight, scale: 1, rot: 0,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(14, t.x, t.y, { color: CONFIG.GLYPH_COLORS.goldLight, speed: [70, 200], life: [0.25, 0.5], size: [1.5, 3.5], kind: 'ember' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'blade') this.updateBlade(s, dt);
    else if (s.kind === 'lob') this.updateLob(s, dt);
    else if (s.kind === 'bell') { s.t += dt; if (s.t >= s.dur) s.done = true; }
  },

  // 回旋刃：去程沿直线，折返时飞回出手点
  updateBlade(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.rot += dt * 16;
    const step = cfg.bladeSpeed * dt;
    if (!s.back) {
      s.d += step;
      s.x = s.ox + s.dx * s.d;
      s.y = s.oy + s.dy * s.d;
      if (s.d >= s.out) { s.back = true; s.hit.clear(); }
    } else {
      const hx = s.ox - s.x;
      const hy = s.oy - s.y;
      const d = Math.hypot(hx, hy);
      if (d <= step) { s.done = true; return; }
      s.x += hx / d * step;
      s.y += hy / d * step;
    }
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.bladeRadius + 40)) {
      if (s.hit.has(e) || Math.hypot(e.x - s.x, e.y - s.y) > cfg.bladeRadius + e.size * 0.4) continue;
      s.hit.add(e);
      GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.bladeDamage[0], cfg.bladeDamage[1])), { color: c.gold, kind: 'gold', delivery: 'projectile' });
      GlyphTower.addCharge(s.tower, cfg.chargePerHit);
      GlyphFX.emit(5, e.x, e.y, { color: c.goldLight, speed: [60, 180], life: [0.15, 0.35], size: [1.2, 2.5], kind: 'ember' });
    }
  },

  updateLob(s, dt) {
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.bellArc);
    s.scale = 1 + 0.5 * Math.sin(Math.PI * k) + 0.4 * k;
    GlyphFX.emit(Math.ceil(dt * 50), s.x, s.y, { color: CONFIG.GLYPH_COLORS.goldLight, speed: [10, 50], life: [0.2, 0.45], size: [1.5, 3], kind: 'ember' });
    if (k < 1) return;
    s.done = true;
    this.ring(s);
  },

  // 金钟落地：伤害、破甲，并留下一圈逐渐淡去的钟影
  ring(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const r = cfg.bellRadius;
    for (const e of GlyphWorld.enemiesInRange(s.game, s.tx, s.ty, r)) {
      const d = Math.hypot(e.x - s.tx, e.y - s.ty);
      e.expose(cfg.exposeRatio, cfg.exposeDuration);
      GlyphWorld.damage(e, Math.round(cfg.bellDamage * (1 - cfg.bellEdgeFalloff * d / r)), { color: c.gold, kind: 'gold', delivery: 'ground', aoe: true });
    }
    GlyphFX.addHitstop(0.08);
    GlyphFX.addShake(12, true);
    GlyphFX.ring(s.tx, s.ty, r / S * 1.2, c.gold, 0.6, 9);
    GlyphFX.ring(s.tx, s.ty, r / S * 0.85, c.goldLight, 0.45, 5);
    GlyphFX.emit(50, s.tx, s.ty, { color: c.goldLight, speed: [120, 420], life: [0.3, 0.7], size: [1.5, 3.5], kind: 'ember', drag: 3 });
    GlyphFX.stampGlyph(CONFIG.GLYPHS.gold, s.tx, s.ty, cfg.bellGlyph, '#8a6d24', 0.18);
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'bell', ground: true, x: s.tx, y: s.ty, t: 0, dur: cfg.bellLinger });
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const gl = s.tower.gl;
    if (s.kind === 'blade') {
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y, { rot: s.rot, scale: 0.85, color: c.gold, glow: c.goldGlow, glowBlur: 12 });
    } else if (s.kind === 'lob') {
      GlyphKit.drawLobGlyph(ctx, s, gl.glyph, gl.size, c.gold, c.goldGlow);
    } else if (s.kind === 'bell') {
      const k = s.t / s.dur;
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y - (1 - k) * 6, size: gl.cfg.bellGlyph * (1 + 0.1 * k), color: c.gold,
        alpha: 0.7 * (1 - k), glow: c.goldGlow, glowBlur: 20, dry: false,
      });
    }
  },
};
