// 木塔：撇笔化作木刺直线射出，沿路贯穿（普攻「木刺」）；四笔整字掷向敌群最密处，
// 落地炸开成一圈木刺并把敌人推开（大招「森」，蓄满自动释放）。
// 与火、水、土同构，复用 GlyphTower 的笔画消耗、蓄力与写回；本文件只描述木自己的招式与绘制。
const GlyphWood = {
  // 普攻：撇笔写满才发；木刺沿直线飞出，不做追踪
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    if (!GlyphTower.ready(t, 2)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    const S = CONFIG.GLYPH_SCALE;
    gl.timer = cfg.shardInterval;
    const from = GlyphTower.strokeWorld(t, 2, 0.5);
    const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    GlyphTower.consume(t, 2, 0.05, cfg.shardRewrite);
    gl.recoil = 3 * S;
    GlyphSystem.push(t.game, {
      tower: t, kind: 'shard', x: from.x, y: from.y,
      vx: (target.x - from.x) / d * cfg.shardSpeed,
      vy: (target.y - from.y) / d * cfg.shardSpeed,
      hit: new Set(), life: (cfg.range * 1.35) / cfg.shardSpeed, trail: [],
    });
    GlyphFX.emit(4, from.x, from.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [40, 110], life: [0.2, 0.4], size: [1.5, 3], kind: 'ink' });
  },

  // 大招「森」：在这座塔射程内找敌群最密的路段落点；没有合适落点返回 false
  cast(t) {
    const cfg = t.gl.cfg;
    const game = t.game;
    const reach = cfg.range * cfg.landRangeMul;
    const r = cfg.burstRadius * 0.8;
    let best = null;
    let bestScore = 0;
    for (const track of GlyphWorld.tracks(game)) {
      const from = track.loop ? 0 : cfg.landMinS;
      const to = track.loop ? track.total : track.total - 40 * CONFIG.GLYPH_SCALE;
      for (const p of track.sample(cfg.landStep, from, to)) {
        if (Math.hypot(p.x - t.x, p.y - t.y) > reach) continue;
        let score = 0;
        for (const e of GlyphWorld.enemiesInRange(game, p.x, p.y, r)) score += e.weight;
        if (score > bestScore) { bestScore = score; best = p; }
      }
    }
    if (!best) return false;
    const step = cfg.rewriteAll / 4;
    for (let i = 0; i < 4; i++) GlyphTower.consume(t, i, cfg.burstFlight + i * step, step);
    GlyphSystem.push(game, {
      tower: t, kind: 'burst', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.burstFlight, scale: 1, rot: 0,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(14, t.x, t.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [70, 190], life: [0.25, 0.5], size: [1.5, 3.5], grav: 220 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'shard') this.updateShard(s, dt);
    else if (s.kind === 'burst') this.updateBurst(s, dt);
  },

  // ---- 普攻：贯穿木刺 ----
  updateShard(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 8) s.trail.shift();
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.shardRadius + 40)) {
      if (s.hit.has(e)) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > cfg.shardRadius + e.size * 0.4) continue;
      this.shardHit(s, e);
      if (s.done) return;
    }
    const b = GlyphWorld.bounds(s.game);
    if (s.life <= 0 || s.x < -50 || s.x > b.w + 50 || s.y < -50 || s.y > b.h + 50) s.done = true;
  },

  shardHit(s, e) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.hit.add(e);
    e.knockback(cfg.shardKnock);
    GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.shardDamage[0], cfg.shardDamage[1])), { color: c.wood, kind: 'wood' });
    GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.emit(6, e.x, e.y, { color: c.woodLight, speed: [60, 180], life: [0.2, 0.4], size: [1.5, 3], grav: 180 });
    GlyphFX.ring(e.x, e.y, 16, c.wood, 0.18, 2.5);
    // 贯穿上限：结算满额目标后木刺散尽
    if (s.hit.size >= cfg.shardPierce) s.done = true;
  },

  // ---- 大招：整字掷出 ----
  updateBurst(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k;
    s.y = s.sy + (s.ty - s.sy) * k - Math.sin(Math.PI * k) * cfg.burstArc;
    s.scale = 1 + 0.4 * Math.sin(Math.PI * k) + 0.4 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.16;
    GlyphFX.emit(Math.ceil(dt * 45), s.x, s.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [10, 45], life: [0.2, 0.45], size: [1.5, 3], grav: 160, kind: 'ink' });
    if (k >= 1) { s.done = true; this.burstLand(s); }
  },

  burstLand(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const r = cfg.burstRadius;
    const { tx, ty } = s;
    for (const e of GlyphWorld.enemiesInRange(s.game, tx, ty, r)) {
      const d = Math.hypot(e.x - tx, e.y - ty);
      const dmg = Math.round(cfg.burstDamage * (1 - cfg.burstEdgeFalloff * d / r));
      e.knockback(cfg.burstKnock);
      e.pushVx = (e.x - tx) * 1.4;
      GlyphWorld.damage(e, dmg, { color: c.wood, kind: 'wood' });
    }
    GlyphFX.addHitstop(0.06);
    GlyphFX.addShake(9);
    // ring 内部会再乘 GLYPH_SCALE，这里传回原型像素
    GlyphFX.ring(tx, ty, r / S * 1.05, c.wood, 0.4, 7);
    GlyphFX.ring(tx, ty, r / S * 0.65, c.ink, 0.28, 3);
    // 一圈木刺：按圆周均匀发射，视觉上就是炸开的枝杈
    const spikes = 14;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      GlyphFX.emit(2, tx, ty, {
        color: i % 2 ? c.woodLight : c.wood, speed: [150, 260], life: [0.22, 0.38], size: [2, 3.5],
        angle: a, spread: 0.12, drag: 2.6, kind: 'ink',
      });
    }
    GlyphFX.emit(18, tx, ty, { color: c.woodLight, speed: [60, 200], life: [0.3, 0.6], size: [1.5, 3], grav: 240 });
    GlyphFX.stain(tx, ty, 26, '#3f5233', 0.24);
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'shard') {
      Brush.drawTrail(ctx, s.trail, 6 * S, c.woodLight, 0.5);
      // 飞出去的就是撇笔本身，按飞行方向旋转笔画
      const stroke = gl.glyph.strokes[2];
      const info = Brush.prepare(stroke);
      const mid = info.pts[Math.floor(info.pts.length / 2)];
      const head = info.pts[0];
      const tail = info.pts[info.pts.length - 1];
      const strokeAng = Math.atan2(tail.y - head.y, tail.x - head.x);
      const size = gl.size * 0.95;
      const k = size / 100;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx) - strokeAng);
      Brush.drawStroke(ctx, stroke, {
        x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color: c.wood, glow: c.woodGlow, glowBlur: 10, dry: false,
      });
      ctx.restore();
    } else if (s.kind === 'burst') {
      const f = s.t / s.dur;
      const gx = s.sx + (s.tx - s.sx) * f;
      const gy = s.sy + (s.ty - s.sy) * f;
      ctx.fillStyle = 'rgba(40,30,20,0.14)';
      ctx.beginPath();
      ctx.ellipse(gx, gy + 10 * S, 30 * S * s.scale, 9 * S * s.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.size * s.scale, rot: s.rot, color: c.wood, glow: c.woodGlow, glowBlur: 22,
      });
    }
  },
};
