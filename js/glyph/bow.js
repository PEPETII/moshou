// 弓塔（2026-10-20）：超远单发与反重甲。
// 普攻「穿云」：弦上一横化作箭，射向射程内血量最高的敌人（巨通常最先吃箭），对重敌加伤，可暴击。
// 大招「箭雨」：在敌群最密的一段路上持续落箭。
const GlyphBow = {
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, 1)) return;
    const target = GlyphKit.best(pool, (e) => e.visibleHp());
    if (!target) return;
    gl.timer = cfg.arrowInterval;
    const from = GlyphTower.strokeWorld(t, 1, 0.5);
    const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    GlyphTower.consume(t, 1, 0.05, cfg.arrowRewrite);
    gl.recoil = 4 * CONFIG.GLYPH_SCALE;
    GlyphSystem.push(t.game, {
      tower: t, kind: 'arrow', target, x: from.x, y: from.y,
      vx: (target.x - from.x) / d * cfg.arrowSpeed, vy: (target.y - from.y) / d * cfg.arrowSpeed,
      life: (cfg.range * 1.4) / cfg.arrowSpeed, trail: [],
    });
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.rainLength * 0.4 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.rainDuration, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'rain', ground: true, track: best.track, s: best.s, x: best.x, y: best.y, t: 0, acc: 0, drops: [],
    });
    GlyphFX.emit(16, t.x, t.y - t.gl.size * 0.4, {
      color: CONFIG.GLYPH_COLORS.bowLight, speed: [200, 360], life: [0.2, 0.4], size: [1, 2], angle: -Math.PI / 2, spread: 0.4,
    });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'arrow') this.updateArrow(s, dt);
    else if (s.kind === 'rain') this.updateRain(s, dt);
  },

  // 箭：直线飞行，不追踪；碰到的第一个敌人吃箭（未必是原目标）
  updateArrow(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    if (GlyphKit.fly(s, dt, 6)) { s.done = true; return; }
    const e = GlyphKit.touch(s, cfg.arrowRadius);
    if (!e) return;
    s.done = true;
    const crit = Math.random() < cfg.critChance;
    const dmg = GlyphFX.rnd(cfg.arrowDamage[0], cfg.arrowDamage[1]) * (e.tier === 'heavy' ? cfg.heavyMul : 1) * (crit ? cfg.critMul : 1);
    e.pushVx = s.vx * 0.15;
    GlyphWorld.damage(e, Math.round(dmg), { crit, color: crit ? c.seal : c.bow, kind: 'bow', delivery: 'projectile' });
    GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.emit(6, e.x, e.y, { color: c.bowLight, speed: [60, 160], life: [0.15, 0.3], size: [1, 2.2], angle: Math.atan2(s.vy, s.vx), spread: 0.6 });
    if (crit) { GlyphFX.addShake(2); GlyphFX.addHitstop(0.02); }
  },

  // 箭雨：沿路 ±rainLength/2 内随机落点；每支箭飞落 0.2 秒后结算半径内一个敌人
  updateRain(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    s.t += dt;
    if (s.t < cfg.rainDuration) {
      s.acc += dt * cfg.rainRate;
      while (s.acc >= 1) {
        s.acc -= 1;
        const p = s.track.pointAt(GlyphKit.wrapS(s.track, s.s + GlyphFX.rnd(-0.5, 0.5) * cfg.rainLength));
        const o = GlyphFX.rnd(-14, 14) * S;
        s.drops.push({ x: p.x - Math.sin(p.ang) * o, y: p.y + Math.cos(p.ang) * o, t: 0 });
      }
    }
    for (const d of s.drops) {
      d.t += dt;
      if (d.t < 0.2 || d.hit) continue;
      d.hit = true;
      const e = GlyphWorld.nearestEnemy(s.game, d.x, d.y, cfg.rainHitRadius);
      if (e) GlyphWorld.damage(e, cfg.rainDamage, { color: c.bow, size: 14, kind: 'bow', delivery: 'ground', aoe: true });
      GlyphFX.emit(2, d.x, d.y, { color: c.bowLight, speed: [20, 70], life: [0.15, 0.3], size: [1, 2], grav: 200 });
    }
    s.drops = s.drops.filter((d) => d.t < 0.5);
    if (s.t >= cfg.rainDuration && !s.drops.length) s.done = true;
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'arrow') {
      Brush.drawTrail(ctx, s.trail, 3 * S, c.bowLight, 0.5);
      GlyphKit.drawStrokeAt(ctx, gl, 1, s.x, s.y, { ang: Math.atan2(s.vy, s.vx), scale: 0.9, color: c.bow, glow: c.bowGlow });
    } else if (s.kind === 'rain') {
      const cfg = gl.cfg;
      const fade = s.t < cfg.rainDuration ? 1 : Math.max(0, 1 - (s.t - cfg.rainDuration) / 0.4);
      GlyphKit.drawBand(ctx, s.track, s.s - cfg.rainLength / 2, s.s + cfg.rainLength / 2, 22 * S, `rgba(122,74,46,${0.07 * fade})`);
      ctx.save();
      ctx.strokeStyle = c.bow;
      ctx.lineWidth = 1.6 * S;
      ctx.lineCap = 'round';
      for (const d of s.drops) {
        if (d.t >= 0.2) {
          // 插在地上的箭杆
          ctx.globalAlpha = 1 - (d.t - 0.2) / 0.3;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + 4 * S, d.y - 9 * S);
          ctx.stroke();
          continue;
        }
        const f = d.t / 0.2;
        const y0 = d.y - (1 - f) * 120 * S;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(d.x + (1 - f) * 30 * S, y0 - 12 * S);
        ctx.lineTo(d.x + (1 - f) * 30 * S - 4 * S, y0);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
};
