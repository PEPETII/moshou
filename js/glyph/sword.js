// 剑塔（2026-10-20）：近战高频与沿路飞剑。
// 普攻「剑气」：刂的一竖化作剑气，瞬间斩向射程内最近的敌人，可暴击；射程短、出手快。
// 大招「剑落」：竖钩化作巨剑，从离塔最近的路段起沿路朝入口飞斩，途经的敌人各中一剑。
const GlyphSword = {
  SLASH: 7,   // 刂·竖
  BLADE: 8,   // 刂·竖钩

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, this.SLASH)) return;
    const target = GlyphKit.best(pool, (e) => -Math.hypot(e.x - t.x, e.y - t.y));
    if (!target) return;
    const c = CONFIG.GLYPH_COLORS;
    gl.timer = cfg.slashInterval;
    GlyphTower.consume(t, this.SLASH, 0.02, cfg.slashRewrite);
    const crit = Math.random() < cfg.critChance;
    const dmg = GlyphFX.rnd(cfg.slashDamage[0], cfg.slashDamage[1]) * (crit ? cfg.critMul : 1);
    GlyphWorld.damage(target, Math.round(dmg), { crit, color: crit ? c.seal : c.sword, kind: 'sword' });
    GlyphTower.addCharge(t, cfg.chargePerHit);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'slash', x: target.x, y: target.y, ang: -Math.PI / 4 + GlyphFX.rnd(-0.6, 0.6), t: 0, dur: 0.2, crit,
    });
    GlyphFX.emit(crit ? 10 : 5, target.x, target.y, { color: c.swordLight, speed: [80, 220], life: [0.12, 0.3], size: [1, 2.2] });
    if (crit) { GlyphFX.addShake(2); GlyphFX.addHitstop(0.02); }
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const near = GlyphKit.nearestTrack(t.game, t.x, t.y);
    if (!near) return false;
    GlyphKit.consumeAll(t, cfg.flyDistance / cfg.flySpeed, cfg.rewriteAll);
    const p = near.track.pointAt(near.s);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'fly', track: near.track, s: near.s, d: 0, x: p.x, y: p.y, ang: p.ang + Math.PI, hit: new Set(), trail: [],
    });
    GlyphFX.addShake(4);
    GlyphFX.emit(18, t.x, t.y, { color: CONFIG.GLYPH_COLORS.swordLight, speed: [100, 260], life: [0.2, 0.4], size: [1, 2.5] });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'slash') { s.t += dt; if (s.t >= s.dur) s.done = true; }
    else if (s.kind === 'fly') this.updateFly(s, dt);
  },

  // 飞剑：沿路逆行（里程递减），半宽 flyWidth 内的敌人各结算一次
  updateFly(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.d += cfg.flySpeed * dt;
    const sNow = GlyphKit.wrapS(s.track, s.s - s.d);
    const p = s.track.pointAt(sNow);
    s.x = p.x;
    s.y = p.y;
    s.ang = p.ang + Math.PI;
    s.trail.push({ x: p.x, y: p.y });
    if (s.trail.length > 10) s.trail.shift();
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.flyWidth)) {
      if (s.hit.has(e)) continue;
      s.hit.add(e);
      e.pushVx = Math.cos(s.ang) * 160 * CONFIG.GLYPH_SCALE;
      GlyphWorld.damage(e, cfg.flyDamage, { crit: true, color: c.sword, kind: 'sword' });
      GlyphFX.emit(6, e.x, e.y, { color: c.swordLight, speed: [80, 240], life: [0.15, 0.35], size: [1, 2.5], angle: s.ang, spread: 0.7 });
      GlyphFX.addShake(1.5);
    }
    const end = !s.track.loop && sNow <= 0;
    if (s.d >= cfg.flyDistance || end) {
      s.done = true;
      GlyphFX.ring(s.x, s.y, 50, c.sword, 0.3, 5);
    }
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'slash') {
      const k = s.t / s.dur;
      const len = gl.cfg.slashLen * (s.crit ? 1.4 : 1);
      // 一道斜贯的剑痕：先划开，再淡去
      const a = Math.min(1, k * 3);
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.crit ? c.seal : c.sword;
      ctx.lineCap = 'round';
      ctx.lineWidth = (s.crit ? 4 : 2.6) * S;
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.ang) * len / 2, s.y - Math.sin(s.ang) * len / 2);
      ctx.lineTo(s.x + Math.cos(s.ang) * len * (a - 0.5), s.y + Math.sin(s.ang) * len * (a - 0.5));
      ctx.stroke();
      ctx.restore();
    } else if (s.kind === 'fly') {
      Brush.drawTrail(ctx, s.trail, 10 * S, c.swordLight, 0.4);
      GlyphKit.drawStrokeAt(ctx, gl, this.BLADE, s.x, s.y, {
        ang: s.ang, scale: gl.cfg.flyGlyph / gl.size, color: c.sword, glow: c.swordGlow, glowBlur: 16,
      });
    }
  },
};
