// 土塔：上横化作石片掷出，命中后碎石四溅（普攻「落石」）；三笔整字砸向敌群最密处，
// 落点震荡定身并留下「土」字陷坑，持续碾压（大招「陷」，蓄满自动释放）。
// 与火、水同构，复用 GlyphTower 的笔画消耗、蓄力与写回；本文件只描述土自己的招式与绘制。
const GlyphEarth = {
  // 普攻：上横写满才发；石片沿直线飞向射程内最靠前的敌人，不追踪
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    if (!GlyphTower.ready(t, 0)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target) return;
    const S = CONFIG.GLYPH_SCALE;
    gl.timer = cfg.slabInterval;
    const from = GlyphTower.strokeWorld(t, 0, 0.5);
    const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
    GlyphTower.consume(t, 0, 0.06, cfg.slabRewrite);
    gl.recoil = 3 * S;
    GlyphSystem.push(t.game, {
      tower: t, kind: 'slab', x: from.x, y: from.y,
      vx: (target.x - from.x) / d * cfg.slabSpeed,
      vy: (target.y - from.y) / d * cfg.slabSpeed,
      rot: Math.random() * Math.PI * 2, spin: (Math.random() < 0.5 ? -1 : 1) * 7,
      life: 1.6, trail: [],
    });
    GlyphFX.emit(5, from.x, from.y, { color: CONFIG.GLYPH_COLORS.earthLight, speed: [40, 120], life: [0.2, 0.4], size: [1.5, 3], kind: 'ink' });
  },

  // 大招「陷」：在这座塔射程内找敌群最密的路段落点；没有合适落点返回 false
  cast(t) {
    const cfg = t.gl.cfg;
    const game = t.game;
    const reach = cfg.range * cfg.landRangeMul;
    const r = cfg.quakeRadius * 0.8;
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
    const step = cfg.rewriteAll / 3;
    for (let i = 0; i < 3; i++) GlyphTower.consume(t, i, cfg.quakeFlight + i * step, step);
    GlyphSystem.push(game, {
      tower: t, kind: 'quake', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.quakeFlight, scale: 1, rot: 0,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(14, t.x, t.y, { color: CONFIG.GLYPH_COLORS.earthLight, speed: [60, 180], life: [0.25, 0.5], size: [1.5, 3.5], grav: 240 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'slab') this.updateSlab(s, dt);
    else if (s.kind === 'quake') this.updateQuake(s, dt);
    else if (s.kind === 'pit') this.updatePit(s, dt);
  },

  // ---- 普攻：石片 ----
  updateSlab(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.rot += s.spin * dt;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 7) s.trail.shift();
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.slabRadius + 40)) {
      if (Math.hypot(e.x - s.x, e.y - s.y) <= cfg.slabRadius + e.size * 0.4) { this.slabHit(s, e); return; }
    }
    const b = GlyphWorld.bounds(s.game);
    if (s.life <= 0 || s.x < -50 || s.x > b.w + 50 || s.y < -50 || s.y > b.h + 50) s.done = true;
  },

  slabHit(s, e) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.done = true;
    e.knockback(cfg.slabKnock);
    GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.slabDamage[0], cfg.slabDamage[1])), { color: c.earth, kind: 'earth' });
    for (const o of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.slabSplash)) {
      if (o === e) continue;
      GlyphWorld.damage(o, cfg.slabSplashDamage, { color: c.earthLight, size: 15, kind: 'earth' });
    }
    GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.emit(10, s.x, s.y, { color: c.earthLight, speed: [70, 240], life: [0.25, 0.5], size: [1.5, 3.5], grav: 220 });
    GlyphFX.ring(s.x, s.y, 22, c.earth, 0.22, 3);
    GlyphFX.addShake(1);
  },

  // ---- 大招：整字下砸 ----
  updateQuake(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k;
    s.y = s.sy + (s.ty - s.sy) * k - Math.sin(Math.PI * k) * cfg.quakeArc;
    s.scale = 1 + 0.3 * Math.sin(Math.PI * k) + 0.35 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.08;
    GlyphFX.emit(Math.ceil(dt * 40), s.x, s.y, { color: CONFIG.GLYPH_COLORS.earthLight, speed: [10, 50], life: [0.2, 0.45], size: [1.5, 3], grav: 200, kind: 'ink' });
    if (k >= 1) { s.done = true; this.quakeLand(s); }
  },

  quakeLand(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const r = cfg.quakeRadius;
    const { tx, ty } = s;
    for (const e of GlyphWorld.enemiesInRange(s.game, tx, ty, r)) {
      const d = Math.hypot(e.x - tx, e.y - ty);
      const dmg = Math.round(cfg.quakeDamage * (1 - cfg.quakeEdgeFalloff * d / r));
      e.glyphStun(cfg.quakeStun);
      e.knockback(cfg.quakeKnock);
      e.pushVx = (e.x - tx) * 1.2;
      GlyphWorld.damage(e, dmg, { color: c.earth, kind: 'earth' });
    }
    GlyphFX.addHitstop(0.07);
    GlyphFX.addShake(11);
    // ring 内部会再乘 GLYPH_SCALE，这里传回原型像素
    GlyphFX.ring(tx, ty, r / S * 1.1, c.earth, 0.45, 8);
    GlyphFX.ring(tx, ty, r / S * 0.7, c.ink, 0.3, 4);
    GlyphFX.emit(46, tx, ty, { color: c.earthLight, speed: [90, 340], life: [0.3, 0.7], size: [2, 4], grav: 320 });
    GlyphFX.emit(16, tx, ty, { color: c.earth, speed: [50, 200], life: [0.4, 0.8], size: [2, 4], grav: 260 });
    GlyphFX.emit(10, tx, ty, { color: '#4a3a28', speed: [15, 60], life: [0.7, 1.2], size: [12, 22], kind: 'smoke', drag: 1 });
    GlyphFX.stain(tx, ty, 34, '#5c4630', 0.32);
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'pit', ground: true, x: tx, y: ty, t: 0, dur: cfg.pitDuration, tick: 0 });
  },

  // 陷坑：地上「土」字周期性碾压范围内的敌人，并把人按住
  updatePit(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.pitTick) {
      s.tick -= cfg.pitTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.pitRadius)) {
        GlyphWorld.damage(e, cfg.pitDps * cfg.pitTick, { color: c.earth, size: 15, kind: 'earth' });
        e.glyphStun(cfg.pitStun);
      }
    }
    const k = s.t / s.dur;
    // 碎石从土字笔画上冒起，随陷坑消退而稀疏
    const n = Math.ceil(dt * 26 * (1 - k));
    const strokes = CONFIG.GLYPHS.earth.strokes;
    for (let i = 0; i < n; i++) {
      const stroke = strokes[Math.floor(Math.random() * strokes.length)];
      const p = Brush.toWorld(Brush.pointAt(stroke, Math.random()), { x: s.x, y: s.y, size: cfg.pitGlyph });
      GlyphFX.emit(1, p.x, p.y, {
        color: Math.random() < 0.5 ? c.earthLight : c.earth, speed: [10, 40], life: [0.3, 0.6], size: [1.5, 3],
        angle: -Math.PI / 2, spread: 0.5, grav: -60, kind: 'ink', drag: 2,
      });
    }
    if (k >= 1) {
      s.done = true;
      GlyphFX.stampGlyph(CONFIG.GLYPHS.earth, s.x, s.y, cfg.pitGlyph, '#5c4630', 0.22);
    }
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'slab') {
      Brush.drawTrail(ctx, s.trail, 7 * S, c.earthLight, 0.45);
      // 飞出去的就是上横那一笔，按飞行方向旋转笔画本身
      const stroke = gl.glyph.strokes[0];
      const info = Brush.prepare(stroke);
      const mid = info.pts[Math.floor(info.pts.length / 2)];
      const head = info.pts[0];
      const tail = info.pts[info.pts.length - 1];
      const strokeAng = Math.atan2(tail.y - head.y, tail.x - head.x);
      const size = gl.size * 0.9;
      const k = size / 100;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      Brush.drawStroke(ctx, stroke, {
        x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color: c.earth, glow: c.earthGlow, glowBlur: 10, dry: false,
      });
      ctx.restore();
      // 石片边缘的碎屑感：沿笔画两端点两粒小石
      ctx.fillStyle = c.earthLight;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(s.rot + strokeAng) * dir * size * 0.42, s.y + Math.sin(s.rot + strokeAng) * dir * size * 0.42, 1.6 * S, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (s.kind === 'quake') {
      const f = s.t / s.dur;
      const gx = s.sx + (s.tx - s.sx) * f;
      const gy = s.sy + (s.ty - s.sy) * f;
      ctx.fillStyle = 'rgba(40,30,20,0.16)';
      ctx.beginPath();
      ctx.ellipse(gx, gy + 10 * S, 32 * S * s.scale, 10 * S * s.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.size * s.scale, rot: s.rot, color: c.earth, glow: c.earthGlow, glowBlur: 22,
      });
    } else if (s.kind === 'pit') {
      const k = s.t / s.dur;
      const r = gl.cfg.pitRadius;
      const g = ctx.createRadialGradient(s.x, s.y, 8 * S, s.x, s.y, r * 1.15);
      g.addColorStop(0, `rgba(150,115,70,${0.26 * (1 - k)})`);
      g.addColorStop(0.7, `rgba(120,92,58,${0.12 * (1 - k)})`);
      g.addColorStop(1, 'rgba(120,92,58,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
      // 坑缘：几道向外放射的裂纹
      ctx.save();
      ctx.strokeStyle = `rgba(92,70,48,${0.35 * (1 - k)})`;
      ctx.lineWidth = 1.6 * S;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + s.t * 0.15;
        const r0 = r * 0.55;
        const r1 = r * (0.85 + 0.15 * Math.sin(i * 2.3));
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
        ctx.lineTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.cfg.pitGlyph, color: k < 0.15 ? c.earthLight : c.earth,
        alpha: 0.18 + 0.7 * (1 - k), glow: c.earthGlow, glowBlur: 22 * (1 - k), dry: false,
      });
    }
  },
};
