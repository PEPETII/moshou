// 风塔（2026-10-20）：扇形与聚怪。
// 普攻「风刃」：内里一撇一点轮流化作风刃，朝最前敌人的方向扇形横扫，扇内全部受伤并被吹退。
// 大招「旋」：整字落到敌群最密处化作旋风，把周围敌人沿路吸向中心，并持续伤害。
const GlyphWind = {
  GUSTS: [2, 3],

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let k = gl.nextDot;
    if (!GlyphTower.ready(t, this.GUSTS[k])) k = 1 - k;
    const i = this.GUSTS[k];
    if (!GlyphTower.ready(t, i)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    const c = CONFIG.GLYPH_COLORS;
    gl.nextDot = 1 - k;
    gl.timer = cfg.gustInterval;
    GlyphTower.consume(t, i, 0.1, cfg.gustRewrite);
    const aim = Math.atan2(target.y - t.y, target.x - t.x);
    let hits = 0;
    for (const e of pool) {
      let da = Math.atan2(e.y - t.y, e.x - t.x) - aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > cfg.gustAngle) continue;
      hits++;
      ControlRules.knock(e, cfg.gustKnock, 'wind');
      e.pushVx = Math.cos(aim) * 120 * CONFIG.GLYPH_SCALE;
      GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.gustDamage[0], cfg.gustDamage[1])), { color: c.wind, kind: 'wind', delivery: 'instant', aoe: true });
    }
    GlyphTower.addCharge(t, cfg.chargePerHit * Math.min(cfg.gustChargeCap, hits));
    GlyphSystem.push(t.game, { tower: t, kind: 'gust', stroke: i, x: t.x, y: t.y, aim, t: 0, dur: 0.3 });
    if (hits) GlyphFX.addShake(Math.min(2.5, 0.4 * hits));
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.vortexRadius * 0.8 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.vortexFlight, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'lob', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.vortexFlight, scale: 1, rot: 0, track: best.track, s: best.s,
    });
    GlyphFX.addShake(3);
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'gust') { s.t += dt; if (s.t >= s.dur) s.done = true; }
    else if (s.kind === 'lob') this.updateLob(s, dt);
    else if (s.kind === 'vortex') this.updateVortex(s, dt);
  },

  updateLob(s, dt) {
    const k = GlyphKit.lob(s, dt, 60 * CONFIG.GLYPH_SCALE);
    s.rot += dt * 12;
    if (k < 1) return;
    s.done = true;
    const cfg = s.tower.gl.cfg;
    GlyphFX.ring(s.tx, s.ty, cfg.vortexRadius / CONFIG.GLYPH_SCALE, CONFIG.GLYPH_COLORS.wind, 0.4, 5);
    GlyphFX.addShake(5, true);
    GlyphSystem.push(s.game, {
      tower: s.tower, kind: 'vortex', ground: true, x: s.tx, y: s.ty, track: s.track, s: s.s,
      t: 0, dur: cfg.vortexDuration, tick: 0, rot: 0, pulling: new Set(),
    });
  },

  // 旋风：同一路径上、半径内的敌人沿路被吸向中心里程（工单 12）：
  // 每个旋风同时最多吸入 carryBudget.wind 点体量，先来后到；一只敌人同时只被一个旋风吸；
  // 吸力按档位打折（三字、四字不吸入，只吃伤害）；离开后 pullImmune 秒内吸力打折
  updateVortex(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const C = CONFIG.CONTROL;
    if (!s.pulling) s.pulling = new Set();
    s.t += dt;
    s.rot += dt * 7;
    const near = GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.vortexRadius);
    const inside = new Set(near);
    let used = 0;
    for (const e of s.pulling) {
      if (e.dead || !inside.has(e)) this.releasePull(s, e);
      else used += ControlRules.carryCost(e);
    }
    for (const e of near) {
      // 瘴雾被旋风覆盖时全程消散
      if (e.ab && e.ab.miasma) e.ab.miasma.vortexT = 0.3;
      if (e.carried || e.track !== s.track) continue;
      if (!s.pulling.has(e)) {
        const cost = ControlRules.carryCost(e);
        if (!ControlRules.canCarry(e, 'wind') || used + cost > C.carryBudget.wind) continue;
        used += cost;
        s.pulling.add(e);
        e.pulledBy = s;
      }
      const d = GlyphKit.pathDelta(s.track, e.s, s.s);
      const pull = cfg.vortexPull * dt * ControlRules.tier(e).pullMul * (e.pullImmuneT > 0 ? C.pullImmuneMul : 1);
      e.s = GlyphKit.wrapS(s.track, e.s + Math.sign(d) * Math.min(Math.abs(d), pull));
      e.syncPosition();
    }
    s.tick += dt;
    while (s.tick >= cfg.vortexTick) {
      s.tick -= cfg.vortexTick;
      for (const e of near) if (!e.dead) GlyphWorld.damage(e, cfg.vortexDps * cfg.vortexTick, { color: c.wind, size: 14, kind: 'wind', delivery: 'ground', aoe: true, dot: true });
    }
    const a = s.rot * 2 + Math.random() * Math.PI * 2;
    const r = cfg.vortexRadius * (0.4 + Math.random() * 0.6);
    GlyphFX.emit(1, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, {
      color: c.windLight, speed: [60, 120], life: [0.3, 0.5], size: [1.2, 2.5], angle: a + Math.PI * 0.6, spread: 0.2, kind: 'drop',
    });
    if (s.t >= s.dur) {
      s.done = true;
      for (const e of Array.from(s.pulling)) this.releasePull(s, e);
    }
  },

  releasePull(s, e) {
    s.pulling.delete(e);
    if (e.pulledBy === s) e.pulledBy = null;
    e.pullImmuneT = CONFIG.CONTROL.pullImmune;
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'gust') {
      const cfg = gl.cfg;
      const k = s.t / s.dur;
      // 扇面淡影 + 风刃从扇的一侧扫到另一侧
      ctx.save();
      ctx.fillStyle = `rgba(150,190,180,${0.18 * (1 - k)})`;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.arc(s.x, s.y, cfg.range, s.aim - cfg.gustAngle, s.aim + cfg.gustAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const a = s.aim - cfg.gustAngle + 2 * cfg.gustAngle * k;
      const r = cfg.range * (0.45 + 0.4 * k);
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, {
        ang: a + Math.PI / 2, scale: 1.3, color: c.wind, glow: c.windGlow, alpha: 1 - k * 0.6,
      });
    } else if (s.kind === 'lob') {
      GlyphKit.drawLobGlyph(ctx, s, gl.glyph, gl.size * 0.9, c.wind, c.windGlow);
    } else if (s.kind === 'vortex') {
      const cfg = gl.cfg;
      const fade = Math.min(1, (s.dur - s.t) / 0.5, s.t / 0.2);
      GlyphKit.drawPool(ctx, s.x, s.y, cfg.vortexRadius, '120,160,150', 0.18 * fade);
      ctx.save();
      ctx.strokeStyle = `rgba(95,125,120,${0.4 * fade})`;
      ctx.lineWidth = 2 * S;
      for (let i = 0; i < 3; i++) {
        const r = cfg.vortexRadius * (0.35 + i * 0.22);
        const a0 = -s.rot * (1 + i * 0.3) + i * 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, a0, a0 + Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.restore();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: cfg.vortexGlyph, rot: -s.rot, color: c.wind, alpha: 0.75 * fade,
        glow: c.windGlow, glowBlur: 14, dry: false,
      });
    }
  },
};
