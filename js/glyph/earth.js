// 土塔（2026-10-20 重做）：范围压制与减速，与火的「直线爆发」区分开。
// 普攻「夯土」：不出弹道，下横砸地，以塔为心震荡一圈，射程内全部敌人受伤并陷入泥泞（减速）。
// 大招「壁垒」：三笔整字飞到敌群最密处立起，区域内重度减速并持续碾压，到时崩塌，伤害并眩晕。
// 与火、水同构，复用 GlyphTower 的笔画消耗、蓄力与写回。
const GlyphEarth = {
  // 普攻：下横（第 3 笔）写满才砸；只要射程内有敌人就砸，一次结算全部
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, 2)) return;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    gl.timer = cfg.poundInterval;
    GlyphTower.consume(t, 2, 0.08, cfg.poundRewrite);
    gl.recoil = 7 * S;
    for (const e of pool) {
      e.glyphSlow(cfg.mireSlow, cfg.mireDuration);
      e.pushVx = (e.x - t.x) * 0.8;
      GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.poundDamage[0], cfg.poundDamage[1])), { color: c.earth, kind: 'earth' });
    }
    GlyphTower.addCharge(t, cfg.chargePerHit * Math.min(cfg.poundChargeCap, pool.length));
    GlyphSystem.push(t.game, { tower: t, kind: 'pound', ground: true, x: t.x, y: t.y, t: 0, dur: 0.45 });
    // ring 内部会再乘 GLYPH_SCALE，这里传回原型像素
    GlyphFX.ring(t.x, t.y, cfg.range / S, c.earth, 0.35, 5);
    GlyphFX.emit(18, t.x, t.y + gl.size * 0.3, { color: c.earthLight, speed: [80, 220], life: [0.25, 0.5], size: [1.5, 3.5], grav: 260 });
    GlyphFX.addShake(Math.min(3, 0.4 * pool.length));
  },

  // 大招「壁垒」：射程内敌群最密的路段；没有合适落点返回 false
  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.wallRadius * 0.8 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.wallFlight, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'lob', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.wallFlight, scale: 1, rot: 0,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(14, t.x, t.y, { color: CONFIG.GLYPH_COLORS.earthLight, speed: [60, 180], life: [0.25, 0.5], size: [1.5, 3.5], grav: 240 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'pound') { s.t += dt; if (s.t >= s.dur) s.done = true; }
    else if (s.kind === 'lob') this.updateLob(s, dt);
    else if (s.kind === 'wall') this.updateWall(s, dt);
  },

  updateLob(s, dt) {
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.wallArc);
    s.scale = 1 + 0.3 * Math.sin(Math.PI * k) + 0.35 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.08;
    GlyphFX.emit(Math.ceil(dt * 40), s.x, s.y, { color: CONFIG.GLYPH_COLORS.earthLight, speed: [10, 50], life: [0.2, 0.45], size: [1.5, 3], grav: 200 });
    if (k < 1) return;
    s.done = true;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    GlyphFX.addHitstop(0.05);
    GlyphFX.addShake(8);
    GlyphFX.ring(s.tx, s.ty, cfg.wallRadius / S, c.earth, 0.4, 7);
    GlyphFX.emit(36, s.tx, s.ty, { color: c.earthLight, speed: [80, 300], life: [0.3, 0.7], size: [2, 4], grav: 320 });
    GlyphFX.stain(s.tx, s.ty, 30, '#5c4630', 0.28);
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'wall', ground: true, x: s.tx, y: s.ty, t: 0, dur: cfg.wallDuration, tick: 0 });
  },

  // 壁垒：区域内重度减速并周期碾压；到时崩塌
  updateWall(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.wallTick) {
      s.tick -= cfg.wallTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.wallRadius)) {
        e.glyphSlow(cfg.wallSlow, cfg.wallTick + 0.2);
        GlyphWorld.damage(e, cfg.wallDps * cfg.wallTick, { color: c.earth, size: 15, kind: 'earth' });
      }
    }
    if (Math.random() < dt * 14) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * cfg.wallRadius;
      GlyphFX.emit(1, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, {
        color: c.earthLight, speed: [10, 40], life: [0.3, 0.6], size: [1.5, 3], angle: -Math.PI / 2, spread: 0.5, grav: -60,
      });
    }
    if (s.t < s.dur) return;
    s.done = true;
    this.collapse(s);
  },

  collapse(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.wallRadius)) {
      e.glyphStun(cfg.collapseStun);
      e.pushVx = (e.x - s.x) * 1.2;
      GlyphWorld.damage(e, cfg.collapseDamage, { color: c.earth, kind: 'earth' });
    }
    GlyphFX.addHitstop(0.07);
    GlyphFX.addShake(11);
    GlyphFX.ring(s.x, s.y, cfg.wallRadius / S * 1.1, c.earth, 0.45, 8);
    GlyphFX.ring(s.x, s.y, cfg.wallRadius / S * 0.7, c.ink, 0.3, 4);
    GlyphFX.emit(46, s.x, s.y, { color: c.earthLight, speed: [90, 340], life: [0.3, 0.7], size: [2, 4], grav: 320 });
    GlyphFX.emit(10, s.x, s.y, { color: '#4a3a28', speed: [15, 60], life: [0.7, 1.2], size: [12, 22], kind: 'smoke', drag: 1 });
    GlyphFX.stampGlyph(CONFIG.GLYPHS.earth, s.x, s.y, cfg.wallGlyph, '#5c4630', 0.22);
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'pound') {
      // 夯土的地波：一圈向外推开的赭色土浪
      const k = s.t / s.dur;
      ctx.save();
      ctx.strokeStyle = `rgba(138,106,63,${0.45 * (1 - k)})`;
      ctx.lineWidth = (10 - 7 * k) * S;
      ctx.beginPath();
      ctx.arc(s.x, s.y, gl.cfg.range * (0.25 + 0.75 * k), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (s.kind === 'lob') {
      GlyphKit.drawLobGlyph(ctx, s, gl.glyph, gl.size, c.earth, c.earthGlow);
    } else if (s.kind === 'wall') {
      const k = s.t / s.dur;
      const r = gl.cfg.wallRadius;
      GlyphKit.drawPool(ctx, s.x, s.y, r * 1.1, '150,115,70', 0.24 * (1 - k * 0.5));
      // 壁垒缘：一圈夯实的土墙虚线
      ctx.save();
      ctx.setLineDash([6 * S, 5 * S]);
      ctx.strokeStyle = `rgba(92,70,48,${0.5 * (1 - k * 0.6)})`;
      ctx.lineWidth = 3 * S;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 字从地里升起（前 0.25 秒），临崩塌时抖动
      const rise = Math.min(1, s.t / 0.25);
      const shake = k > 0.8 ? (Math.random() - 0.5) * 4 * S : 0;
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x + shake, y: s.y + (1 - rise) * 20 * S, size: gl.cfg.wallGlyph * (0.6 + 0.4 * rise),
        color: c.earth, alpha: 0.35 + 0.55 * rise, glow: c.earthGlow, glowBlur: 16, dry: false,
      });
    }
  },
};
