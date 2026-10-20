// 冰塔（2026-10-20）：叠层减速与冻结。
// 普攻「冰凌」：竖钩化作冰凌直射最前敌人，命中叠一层「寒」（每层减速），叠满即冻结。
// 大招「冻」：寒潮从塔身向外扩散，扫过射程内的每个敌人都被冻结并受伤。
const GlyphIce = {
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, 2)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    gl.timer = cfg.icicleInterval;
    const from = GlyphTower.strokeWorld(t, 2, 0.5);
    const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    GlyphTower.consume(t, 2, 0.05, cfg.icicleRewrite);
    gl.recoil = 3 * CONFIG.GLYPH_SCALE;
    GlyphSystem.push(t.game, {
      tower: t, kind: 'icicle', x: from.x, y: from.y,
      vx: (target.x - from.x) / d * cfg.icicleSpeed, vy: (target.y - from.y) / d * cfg.icicleSpeed,
      life: (cfg.range * 1.3) / cfg.icicleSpeed, trail: [],
    });
  },

  cast(t, pool) {
    if (!pool.length) return false;
    const cfg = t.gl.cfg;
    const dur = cfg.range / cfg.frostSpeed;
    GlyphKit.consumeAll(t, dur, cfg.rewriteAll);
    GlyphSystem.push(t.game, { tower: t, kind: 'frost', ground: true, x: t.x, y: t.y, r: 0, t: 0, dur, hit: new Set() });
    GlyphFX.addShake(5, true);
    GlyphFX.addHitstop(0.05);
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'icicle') this.updateIcicle(s, dt);
    else if (s.kind === 'frost') this.updateFrost(s, dt);
  },

  updateIcicle(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    if (GlyphKit.fly(s, dt, 7)) { s.done = true; return; }
    const e = GlyphKit.touch(s, cfg.icicleRadius);
    if (!e) return;
    s.done = true;
    e.chill(cfg.chillStacks, cfg.chillDuration, cfg.freezeTime);
    GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.icicleDamage[0], cfg.icicleDamage[1])), { color: c.ice, kind: 'ice', delivery: 'projectile' });
    GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.emit(8, e.x, e.y, { color: c.iceLight, speed: [60, 180], life: [0.2, 0.45], size: [1.2, 2.6], kind: 'drop' });
    GlyphFX.ring(e.x, e.y, e.iceTime > 0 ? 36 : 18, c.ice, 0.22, 3);
  },

  // 寒潮：半径按 frostSpeed 扩到射程，扫到谁就冻住谁（每只只冻一次）
  updateFrost(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.r = Math.min(cfg.range, cfg.frostSpeed * s.t);
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, s.r)) {
      if (s.hit.has(e)) continue;
      s.hit.add(e);
      ControlRules.freeze(e, cfg.frostFreeze, 'ground');
      GlyphWorld.damage(e, cfg.frostDamage, { color: c.ice, kind: 'ice', delivery: 'ground', aoe: true });
      GlyphFX.emit(4, e.x, e.y, { color: c.iceLight, speed: [30, 100], life: [0.3, 0.6], size: [1.2, 2.5], kind: 'drop' });
    }
    const n = Math.ceil(dt * 50);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      GlyphFX.emit(1, s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r, {
        color: c.iceLight, speed: [20, 60], life: [0.3, 0.6], size: [1.2, 2.4], angle: a, spread: 0.3, kind: 'drop',
      });
    }
    if (s.t >= s.dur) {
      s.done = true;
      GlyphFX.stain(s.x, s.y, 40, '#5b8aa6', 0.14);
    }
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'icicle') {
      Brush.drawTrail(ctx, s.trail, 5 * S, c.iceLight, 0.55);
      GlyphKit.drawStrokeAt(ctx, gl, 2, s.x, s.y, { ang: Math.atan2(s.vy, s.vx), scale: 0.8, color: c.ice, glow: c.iceGlow });
    } else if (s.kind === 'frost') {
      const k = s.t / s.dur;
      GlyphKit.drawPool(ctx, s.x, s.y, s.r, '170,215,240', 0.22 * (1 - k * 0.5));
      ctx.save();
      ctx.strokeStyle = `rgba(79,143,176,${0.6 * (1 - k * 0.5)})`;
      ctx.lineWidth = 3 * S;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      // 冰棱：沿波前均匀排一圈短刺
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r);
        ctx.lineTo(s.x + Math.cos(a) * (s.r + 9 * S), s.y + Math.sin(a) * (s.r + 9 * S));
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};
