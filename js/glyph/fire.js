// 火塔：左右两点化作追踪火星（普攻「火星」）；整个「火」字被掷出，落地炸开，
// 留下燃烧的火字（大招「焚」，蓄满自动释放）。移植自原型 fire.js（工单 05）。
const GlyphFire = {
  // 普攻：只有对应的点写满时才能发射
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let i = gl.nextDot;
    if (!GlyphTower.ready(t, i)) i = 1 - i;
    if (!GlyphTower.ready(t, i)) return;
    gl.nextDot = 1 - i;
    gl.timer = cfg.sparkInterval;
    pool.sort((a, b) => b.s - a.s);
    const target = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    const from = GlyphTower.strokeWorld(t, i, 0.5);
    // 初速沿该点向外、略偏上，随后转向追踪
    let dx = from.x - t.x;
    let dy = from.y - t.y - gl.size * 0.3;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    GlyphTower.consume(t, i, 0.05, cfg.dotRewrite);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'spark', stroke: i, x: from.x, y: from.y,
      vx: dx * cfg.sparkSpeed0, vy: dy * cfg.sparkSpeed0, speed: cfg.sparkSpeed0,
      target, trail: [], life: 2.2,
    });
    GlyphFX.emit(4, from.x, from.y, { color: CONFIG.GLYPH_COLORS.fireHot, speed: [30, 90], life: [0.2, 0.4], size: [1.5, 3], kind: 'ember' });
  },

  // 大招「焚」：在这座塔射程内找敌群最密的路段落点；没有合适落点返回 false
  cast(t) {
    const gl = t.gl;
    const cfg = gl.cfg;
    const game = t.game;
    const reach = cfg.range * cfg.landRangeMul;
    const r = cfg.bombRadius * 0.8;
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
    for (let i = 0; i < 4; i++) GlyphTower.consume(t, i, cfg.bombFlight + i * step, step);
    GlyphSystem.push(game, {
      tower: t, kind: 'bomb', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.bombFlight, scale: 1, rot: 0,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(18, t.x, t.y, { color: CONFIG.GLYPH_COLORS.fireHot, speed: [80, 220], life: [0.3, 0.6], size: [2, 4], kind: 'ember' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'spark') this.updateSpark(s, dt);
    else if (s.kind === 'bomb') this.updateBomb(s, dt);
    else if (s.kind === 'mark') this.updateMark(s, dt);
  },

  updateSpark(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.life -= dt;
    if (!s.target || s.target.dead) s.target = GlyphWorld.nearestEnemy(s.game, s.x, s.y, cfg.sparkSeek);
    if (s.target) {
      const dx = s.target.x - s.x;
      const dy = s.target.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      s.speed = Math.min(cfg.sparkSpeed, s.speed + cfg.sparkAccel * dt);
      const k = Math.min(1, dt * 7);
      s.vx += (dx / d * s.speed - s.vx) * k;
      s.vy += (dy / d * s.speed - s.vy) * k;
      if (d < s.target.size * 0.55) { this.sparkHit(s, s.target); return; }
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 9) s.trail.shift();
    const b = GlyphWorld.bounds(s.game);
    if (s.life <= 0 || s.x < -50 || s.x > b.w + 50 || s.y < -50 || s.y > b.h + 50) s.done = true;
  },

  sparkHit(s, e) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.done = true;
    const crit = Math.random() < cfg.critChance;
    const dmg = Math.round(GlyphFX.rnd(cfg.sparkDamage[0], cfg.sparkDamage[1]) * (crit ? cfg.critMul : 1));
    e.pushVx = s.vx * 0.3;
    GlyphWorld.damage(e, dmg, { crit, color: crit ? c.fire : c.ink, kind: 'fire' });
    e.ignite(1, cfg.burnDuration);
    GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.emit(crit ? 16 : 8, e.x, e.y, { color: c.fireHot, speed: [60, crit ? 280 : 180], life: [0.2, 0.45], size: [1.5, 3.5], kind: 'ember' });
    GlyphFX.ring(e.x, e.y, crit ? 40 : 22, c.fire, 0.25, crit ? 5 : 3);
    GlyphFX.addShake(crit ? 2.5 : 0.5);
    if (crit) GlyphFX.addHitstop(0.025);
  },

  updateBomb(s, dt) {
    const cfg = s.tower.gl.cfg;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k;
    s.y = s.sy + (s.ty - s.sy) * k - Math.sin(Math.PI * k) * cfg.bombArc;
    s.scale = 1 + 0.75 * Math.sin(Math.PI * k) + 0.55 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.12;
    GlyphFX.emit(Math.ceil(dt * 90), s.x, s.y, { color: CONFIG.GLYPH_COLORS.fireHot, speed: [10, 60], life: [0.25, 0.5], size: [2, 4], kind: 'ember' });
    if (k >= 1) { s.done = true; this.explode(s); }
  },

  explode(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const r = cfg.bombRadius;
    const { tx, ty } = s;
    for (const e of GlyphWorld.enemiesInRange(s.game, tx, ty, r)) {
      const d = Math.hypot(e.x - tx, e.y - ty);
      const crit = Math.random() < cfg.bombCrit;
      const dmg = cfg.bombDamage * (1 - cfg.bombEdgeFalloff * d / r) * (crit ? cfg.bombCritMul : 1);
      e.pushVx = (e.x - tx) * 4;
      GlyphWorld.damage(e, dmg, { crit, color: c.fire, kind: 'fire' });
      e.ignite(cfg.bombIgnite, cfg.burnDuration + 1);
    }
    GlyphFX.addHitstop(0.09);
    GlyphFX.addShake(15);
    // 特效半径在 GlyphFX.ring 内会再乘 GLYPH_SCALE，所以这里传回原型像素
    const S = CONFIG.GLYPH_SCALE;
    GlyphFX.ring(tx, ty, r / S * 1.25, c.fire, 0.5, 10);
    GlyphFX.ring(tx, ty, r / S * 0.8, c.ink, 0.35, 5);
    GlyphFX.emit(70, tx, ty, { color: c.fireHot, speed: [120, 560], life: [0.35, 0.9], size: [2, 5], kind: 'ember', drag: 3 });
    GlyphFX.emit(30, tx, ty, { color: c.fire, speed: [80, 300], life: [0.4, 0.8], size: [2, 4], grav: 200 });
    GlyphFX.emit(12, tx, ty, { color: '#3a2a20', speed: [20, 80], life: [0.8, 1.4], size: [14, 26], kind: 'smoke', drag: 1 });
    GlyphFX.stain(tx, ty, 40, '#4a2a1e', 0.35);
    GlyphSystem.push(s.game, { tower: s.tower, kind: 'mark', ground: true, x: tx, y: ty, t: 0, dur: cfg.markDuration, tick: 0 });
  },

  // 焦土：地上燃烧的火字，周期性灼烧范围内的敌人
  updateMark(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.tick += dt;
    while (s.tick >= cfg.markTick) {
      s.tick -= cfg.markTick;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.markRadius)) {
        GlyphWorld.damage(e, cfg.markDps * cfg.markTick, { color: c.fire, size: 15, kind: 'fire' });
        e.ignite(1, cfg.markIgniteTime);
      }
    }
    const k = s.t / s.dur;
    // 火苗从火字笔画上窜起
    const n = Math.ceil(dt * 70 * (1 - k));
    const strokes = CONFIG.GLYPHS.fire.strokes;
    for (let i = 0; i < n; i++) {
      const stroke = strokes[Math.floor(Math.random() * 4)];
      const p = Brush.toWorld(Brush.pointAt(stroke, Math.random()), { x: s.x, y: s.y, size: cfg.markGlyph });
      GlyphFX.emit(1, p.x, p.y, {
        color: Math.random() < 0.5 ? c.fireHot : c.fire, speed: [20, 70], life: [0.3, 0.7], size: [2, 4.5],
        angle: -Math.PI / 2, spread: 0.35, grav: -120, kind: 'ember', drag: 1,
      });
    }
    if (k >= 1) {
      s.done = true;
      GlyphFX.stampGlyph(CONFIG.GLYPHS.fire, s.x, s.y, cfg.markGlyph, '#5a3324', 0.22);
    }
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'spark') {
      Brush.drawTrail(ctx, s.trail, 9 * S, c.fireHot, 0.55);
      // 飞出去的就是那一点：按速度方向旋转笔画本身
      const stroke = gl.glyph.strokes[s.stroke];
      const info = Brush.prepare(stroke);
      const mid = info.pts[Math.floor(info.pts.length / 2)];
      const head = info.pts[0];
      const tail = info.pts[info.pts.length - 1];
      const strokeAng = Math.atan2(tail.y - head.y, tail.x - head.x);
      const size = gl.size * gl.cfg.sparkSize;
      const k = size / 100;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx) - strokeAng);
      Brush.drawStroke(ctx, stroke, {
        x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color: c.fire, glow: c.fireGlow, glowBlur: 12, dry: false,
      });
      ctx.restore();
    } else if (s.kind === 'bomb') {
      const f = s.t / s.dur;
      const gx = s.sx + (s.tx - s.sx) * f;
      const gy = s.sy + (s.ty - s.sy) * f;
      ctx.fillStyle = 'rgba(40,30,20,0.15)';
      ctx.beginPath();
      ctx.ellipse(gx, gy + 10 * S, 30 * S * s.scale, 9 * S * s.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.size * s.scale, rot: s.rot, color: c.fire, glow: c.fireGlow, glowBlur: 24,
      });
    } else if (s.kind === 'mark') {
      const k = s.t / s.dur;
      const r = gl.cfg.markRadius;
      const g = ctx.createRadialGradient(s.x, s.y, 10 * S, s.x, s.y, r * 1.1);
      g.addColorStop(0, `rgba(240,130,60,${0.28 * (1 - k)})`);
      g.addColorStop(1, 'rgba(240,130,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 1.1, 0, Math.PI * 2);
      ctx.fill();
      Brush.drawGlyph(ctx, gl.glyph, {
        x: s.x, y: s.y, size: gl.cfg.markGlyph, color: k < 0.12 ? '#f6b25a' : c.fire,
        alpha: 0.15 + 0.75 * (1 - k), glow: c.fireGlow, glowBlur: 26 * (1 - k), dry: false,
      });
    }
  },
};
