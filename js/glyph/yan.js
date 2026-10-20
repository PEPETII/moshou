// 炎（合字：火 + 火，2026-10-20）：光束与双落点。
// 普攻「炎柱」：上火两点轮流放出瞬发火柱，贯穿整条直线，每个被扫到的敌人叠两层灼烧。
// 大招「双爆」：上火、下火各成一枚火字，先后砸向两处相隔的敌群，落地炸开并留下焦土。
// 属性独立配置（glyphs-fusion.js），不由两座火塔叠加推导。
const GlyphYan = {
  DOTS: [0, 1],                 // 上火两点
  TOP: [0, 1, 2, 3],
  BOTTOM: [4, 5, 6, 7],

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let k = gl.nextDot;
    if (!GlyphTower.ready(t, this.DOTS[k])) k = 1 - k;
    const i = this.DOTS[k];
    if (!GlyphTower.ready(t, i)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    gl.nextDot = 1 - k;
    gl.timer = cfg.beamInterval;
    GlyphTower.consume(t, i, 0.05, cfg.beamRewrite);
    const ox = t.x;
    const oy = t.y - gl.size * 0.2;
    const aim = Math.atan2(target.y - oy, target.x - ox);
    const len = Math.min(cfg.range * 1.1, Math.hypot(target.x - ox, target.y - oy) + cfg.beamReach);
    this.beam(t, ox, oy, aim, len);
    GlyphSystem.push(t.game, { tower: t, kind: 'beam', x: ox, y: oy, aim, len, t: 0, dur: 0.25 });
  },

  beam(t, ox, oy, aim, len) {
    const cfg = t.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const dx = Math.cos(aim);
    const dy = Math.sin(aim);
    let hits = 0;
    for (const e of GlyphWorld.enemiesInRange(t.game, ox + dx * len / 2, oy + dy * len / 2, len / 2 + cfg.beamWidth + 30)) {
      const along = (e.x - ox) * dx + (e.y - oy) * dy;
      if (along < 0 || along > len) continue;
      if (Math.abs((e.x - ox) * dy - (e.y - oy) * dx) > cfg.beamWidth + e.size * 0.3) continue;
      hits++;
      e.ignite(cfg.beamIgnite, cfg.burnDuration);
      GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.beamDamage[0], cfg.beamDamage[1])), { color: c.yan, kind: 'fire' });
      GlyphFX.emit(4, e.x, e.y, { color: c.yanLight, speed: [40, 150], life: [0.2, 0.4], size: [1.5, 3], kind: 'ember' });
    }
    GlyphTower.addCharge(t, cfg.chargePerHit * Math.min(cfg.beamChargeCap, hits));
    if (hits) GlyphFX.addShake(Math.min(2.5, 0.5 * hits));
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const first = GlyphKit.densest(t, { radius: cfg.bombRadius * 0.8 });
    if (!first) return false;
    const second = GlyphKit.densest(t, {
      radius: cfg.bombRadius * 0.8, avoid: { x: first.x, y: first.y, r: cfg.bombSeparation },
    }) || first;
    GlyphKit.consumeAll(t, cfg.bombFlight, cfg.rewriteAll / 2, this.TOP);
    GlyphKit.consumeAll(t, cfg.bombFlight + cfg.bombGap, cfg.rewriteAll / 2, this.BOTTOM);
    [[first, 0], [second, -cfg.bombGap]].forEach(([p, t0]) => {
      GlyphSystem.push(t.game, {
        tower: t, kind: 'bomb', sx: t.x, sy: t.y, tx: p.x, ty: p.y, x: t.x, y: t.y, t: t0, dur: cfg.bombFlight, scale: 1, rot: 0,
      });
    });
    GlyphFX.addShake(4);
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'beam') { s.t += dt; if (s.t >= s.dur) s.done = true; }
    else if (s.kind === 'bomb') this.updateBomb(s, dt);
    else if (s.kind === 'mark') this.updateMark(s, dt);
  },

  updateBomb(s, dt) {
    if (s.t < 0) { s.t += dt; return; }
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.bombArc);
    s.scale = 1 + 0.75 * Math.sin(Math.PI * k) + 0.4 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.12;
    GlyphFX.emit(Math.ceil(dt * 90), s.x, s.y, { color: CONFIG.GLYPH_COLORS.yanLight, speed: [10, 60], life: [0.25, 0.5], size: [2, 4], kind: 'ember' });
    if (k < 1) return;
    s.done = true;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const r = cfg.bombRadius;
    for (const e of GlyphWorld.enemiesInRange(s.game, s.tx, s.ty, r)) {
      const d = Math.hypot(e.x - s.tx, e.y - s.ty);
      e.pushVx = (e.x - s.tx) * 4;
      e.ignite(cfg.bombIgnite, cfg.burnDuration + 1);
      GlyphWorld.damage(e, Math.round(cfg.bombDamage * (1 - cfg.bombEdgeFalloff * d / r)), { color: c.yan, kind: 'fire' });
    }
    GlyphFX.addHitstop(0.08);
    GlyphFX.addShake(14);
    GlyphFX.ring(s.tx, s.ty, r / S * 1.25, c.yan, 0.5, 10);
    GlyphFX.emit(60, s.tx, s.ty, { color: c.yanLight, speed: [120, 520], life: [0.35, 0.9], size: [2, 5], kind: 'ember', drag: 3 });
    GlyphFX.emit(10, s.tx, s.ty, { color: '#3a2a20', speed: [20, 80], life: [0.8, 1.4], size: [14, 26], kind: 'smoke', drag: 1 });
    GlyphFX.stain(s.tx, s.ty, 38, '#4a2a1e', 0.35);
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'mark', ground: true, x: s.tx, y: s.ty, t: 0, dur: cfg.markDuration, tick: 0 });
  },

  updateMark(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.markTick) {
      s.tick -= cfg.markTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.markRadius)) {
        GlyphWorld.damage(e, cfg.markDps * cfg.markTick, { color: c.yan, size: 15, kind: 'fire' });
        e.ignite(1, 1.2);
      }
    }
    if (Math.random() < dt * 40) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * cfg.markRadius * 0.8;
      GlyphFX.emit(1, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, {
        color: c.yanLight, speed: [20, 70], life: [0.3, 0.7], size: [2, 4], angle: -Math.PI / 2, spread: 0.35, grav: -120, kind: 'ember', drag: 1,
      });
    }
    if (s.t >= s.dur) {
      s.done = true;
      GlyphFX.stampGlyph(s.tower.gl.glyph, s.x, s.y, cfg.markGlyph, '#5a3324', 0.2);
    }
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'beam') {
      const fade = 1 - s.t / s.dur;
      const ex = s.x + Math.cos(s.aim) * s.len;
      const ey = s.y + Math.sin(s.aim) * s.len;
      ctx.save();
      ctx.lineCap = 'round';
      for (const layer of [{ w: gl.cfg.beamWidth * 1.6, color: c.yanGlow, a: 0.5 }, { w: gl.cfg.beamWidth * 0.7, color: c.yan, a: 0.9 }, { w: 3 * S, color: c.yanLight, a: 1 }]) {
        ctx.globalAlpha = fade * layer.a;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.w * (0.6 + 0.4 * fade);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();
    } else if (s.kind === 'bomb') {
      if (s.t < 0) return;
      // 每一枚就是炎字里的一个「火」
      GlyphKit.drawLobGlyph(ctx, s, CONFIG.GLYPHS.fire, gl.size, c.yan, c.yanGlow);
    } else if (s.kind === 'mark') {
      const k = s.t / s.dur;
      GlyphKit.drawPool(ctx, s.x, s.y, gl.cfg.markRadius * 1.1, '240,130,60', 0.28 * (1 - k));
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.cfg.markGlyph, color: c.yan, alpha: 0.15 + 0.7 * (1 - k), glow: c.yanGlow, glowBlur: 24 * (1 - k), dry: false,
      });
    }
  },
};
