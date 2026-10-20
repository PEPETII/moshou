// 焚（合字：林 + 火，2026-10-20）：沿路蔓延的大火与死亡连燃。
// 普攻「焚木」：林的两竖（树干）轮流化作燃木抛出，落地伤害并留下短时火场。
// 大招「燎原」：整字砸向敌群最密处，大火从落点沿路双向蔓延，每段路被点燃后燃烧一阵；
//   燃烧路段上被击杀的敌人会爆燃，波及周围——爆燃在下一帧结算，连锁不递归。
const GlyphFen = {
  LOGS: [1, 5],   // 上林左右两木的竖

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let k = gl.nextDot;
    if (!GlyphTower.ready(t, this.LOGS[k])) k = 1 - k;
    const i = this.LOGS[k];
    if (!GlyphTower.ready(t, i)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    gl.nextDot = 1 - k;
    gl.timer = cfg.logInterval;
    GlyphTower.consume(t, i, cfg.logFlight, cfg.logRewrite);
    const from = GlyphTower.strokeWorld(t, i, 0.5);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'log', stroke: i, sx: from.x, sy: from.y, tx: target.x, ty: target.y, x: from.x, y: from.y,
      t: 0, dur: cfg.logFlight, rot: 0,
    });
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.blazeLength * 0.4 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.blazeFlight, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'lob', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.blazeFlight, scale: 1, rot: 0, track: best.track, s: best.s,
    });
    GlyphFX.addShake(4);
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'log') this.updateLog(s, dt);
    else if (s.kind === 'fire') this.updateFire(s, dt);
    else if (s.kind === 'lob') this.updateLob(s, dt);
    else if (s.kind === 'blaze') this.updateBlaze(s, dt);
  },

  updateLog(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const k = GlyphKit.lob(s, dt, cfg.logArc);
    s.rot += dt * 8;
    GlyphFX.emit(Math.ceil(dt * 40), s.x, s.y, { color: c.fenLight, speed: [10, 40], life: [0.2, 0.4], size: [1.5, 3], kind: 'ember' });
    if (k < 1) return;
    s.done = true;
    let hits = 0;
    for (const e of GlyphWorld.enemiesInRange(s.game, s.tx, s.ty, cfg.logRadius)) {
      hits++;
      e.ignite(cfg.fireIgnite, cfg.burnDuration);
      GlyphWorld.damage(e, cfg.logDamage, { color: c.fen, kind: 'fire' });
    }
    if (hits) GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.ring(s.tx, s.ty, cfg.logRadius / CONFIG.GLYPH_SCALE, c.fen, 0.3, 4);
    GlyphFX.emit(16, s.tx, s.ty, { color: c.fenLight, speed: [60, 220], life: [0.25, 0.5], size: [1.5, 3.5], kind: 'ember' });
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'fire', ground: true, x: s.tx, y: s.ty, t: 0, tick: 0 });
  },

  // 火场：短时、小范围持续灼烧
  updateFire(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.fireTick) {
      s.tick -= cfg.fireTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.fireRadius)) {
        e.ignite(cfg.fireIgnite, cfg.burnDuration);
        GlyphWorld.damage(e, cfg.fireDps * cfg.fireTick, { color: c.fen, size: 14, kind: 'fire' });
      }
    }
    if (Math.random() < dt * 25) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * cfg.fireRadius * 0.8;
      GlyphFX.emit(1, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, {
        color: c.fenLight, speed: [20, 60], life: [0.3, 0.6], size: [2, 3.5], angle: -Math.PI / 2, spread: 0.4, grav: -100, kind: 'ember',
      });
    }
    if (s.t >= cfg.fireLife) s.done = true;
  },

  updateLob(s, dt) {
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.blazeArc);
    s.scale = 1 + 0.6 * Math.sin(Math.PI * k) + 0.4 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.12;
    GlyphFX.emit(Math.ceil(dt * 80), s.x, s.y, { color: CONFIG.GLYPH_COLORS.fenLight, speed: [10, 60], life: [0.25, 0.5], size: [2, 4], kind: 'ember' });
    if (k < 1) return;
    s.done = true;
    const c = CONFIG.GLYPH_COLORS;
    GlyphFX.addHitstop(0.08);
    GlyphFX.addShake(12);
    GlyphFX.ring(s.tx, s.ty, 110, c.fen, 0.5, 9);
    GlyphFX.emit(50, s.tx, s.ty, { color: c.fenLight, speed: [120, 460], life: [0.3, 0.8], size: [2, 5], kind: 'ember', drag: 3 });
    GlyphFX.stain(s.tx, s.ty, 36, '#4a2a1e', 0.35);
    GlyphSystem.push(s.game, {
      tower: s.tower, kind: 'blaze', ground: true, x: s.tx, y: s.ty, track: s.track, s: s.s, t: 0, tick: 0, pending: [],
    });
  },

  // 当前燃烧路段：距落点 [lo, hi]（双向对称）
  burning(s, cfg) {
    const hi = Math.min(cfg.blazeLength, s.t * cfg.blazeSpeed);
    const lo = Math.max(0, (s.t - cfg.blazeBurn) * cfg.blazeSpeed);
    return { lo, hi };
  },

  onBlaze(s, e, cfg) {
    const { lo, hi } = this.burning(s, cfg);
    if (e.track !== s.track || hi <= lo) return false;
    const d = Math.abs(GlyphKit.pathDelta(s.track, s.s, e.s));
    return d >= lo - cfg.blazeWidth * 0.5 && d <= hi;
  },

  updateBlaze(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    // 上一帧登记的爆燃
    const pending = s.pending;
    s.pending = [];
    for (const p of pending) {
      for (const e of GlyphWorld.enemiesInRange(s.game, p.x, p.y, cfg.explodeRadius)) {
        e.ignite(cfg.explodeIgnite, cfg.burnDuration);
        GlyphWorld.damage(e, cfg.explodeDamage, { color: c.fen, kind: 'fire' });
      }
      GlyphFX.ring(p.x, p.y, cfg.explodeRadius / CONFIG.GLYPH_SCALE, c.fen, 0.3, 5);
      GlyphFX.emit(14, p.x, p.y, { color: c.fenLight, speed: [80, 260], life: [0.2, 0.5], size: [1.5, 3.5], kind: 'ember' });
      GlyphFX.addShake(2);
    }
    const { lo, hi } = this.burning(s, cfg);
    s.tick += dt;
    while (s.tick >= cfg.blazeTick) {
      s.tick -= cfg.blazeTick;
      for (const e of GlyphKit.alongTrack(s.game, s.track, s.s, hi)) {
        if (!this.onBlaze(s, e, cfg)) continue;
        e.ignite(cfg.blazeIgnite, cfg.burnDuration);
        GlyphWorld.damage(e, cfg.blazeDps * cfg.blazeTick, { color: c.fen, size: 14, kind: 'fire' });
      }
    }
    // 火苗沿燃烧段窜起
    if (hi > lo) {
      const n = Math.ceil(dt * 60);
      for (let i = 0; i < n; i++) {
        const d = (Math.random() < 0.5 ? -1 : 1) * GlyphFX.rnd(lo, hi);
        const p = s.track.pointAt(GlyphKit.wrapS(s.track, s.s + d));
        GlyphFX.emit(1, p.x + GlyphFX.rnd(-1, 1) * cfg.blazeWidth * 0.6, p.y, {
          color: Math.random() < 0.5 ? c.fenLight : c.fen, speed: [20, 70], life: [0.3, 0.6], size: [2, 4],
          angle: -Math.PI / 2, spread: 0.35, grav: -120, kind: 'ember', drag: 1,
        });
      }
    }
    if (s.t >= cfg.blazeLength / cfg.blazeSpeed + cfg.blazeBurn && !s.pending.length) s.done = true;
  },

  // 燃烧路段上被击杀：登记一次爆燃，下一帧结算
  onKill(s, e) {
    if (s.kind !== 'blaze' || !this.onBlaze(s, e, s.tower.gl.cfg)) return;
    s.pending.push({ x: e.x, y: e.y });
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const gl = s.tower.gl;
    if (s.kind === 'log') {
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y, { rot: s.rot, scale: 0.9, color: c.fen, glow: c.fenGlow, glowBlur: 14 });
    } else if (s.kind === 'fire') {
      const k = s.t / gl.cfg.fireLife;
      GlyphKit.drawPool(ctx, s.x, s.y, gl.cfg.fireRadius, '240,120,50', 0.3 * (1 - k));
    } else if (s.kind === 'lob') {
      GlyphKit.drawLobGlyph(ctx, s, gl.glyph, gl.size, c.fen, c.fenGlow);
    } else if (s.kind === 'blaze') {
      const cfg = gl.cfg;
      const { lo, hi } = this.burning(s, cfg);
      if (hi <= lo) return;
      for (const dir of [-1, 1]) {
        const a = s.s + dir * lo;
        const b = s.s + dir * hi;
        GlyphKit.drawBand(ctx, s.track, Math.min(a, b), Math.max(a, b), cfg.blazeWidth, 'rgba(230,110,40,0.12)');
      }
    }
  },
};
