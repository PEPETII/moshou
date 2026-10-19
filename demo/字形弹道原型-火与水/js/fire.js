// 火塔：左右两点化作追踪火星（普攻）；整个「火」字被掷出，落地炸开、留下燃烧的火字（大招「焚」）
const FireTower = {
  update(t, dt) {
    t.timer -= dt;
    if (t.timer > 0) return;
    const pool = World.inRange(t.x, t.y, t.cfg.range);
    if (!pool.length) return;
    let i = t.nextDot;
    if (!Towers.ready(t, i)) i = 1 - i;
    if (!Towers.ready(t, i)) return;
    t.nextDot = 1 - i;
    t.timer = t.cfg.sparkInterval;
    pool.sort((a, b) => b.s - a.s);
    const target = pool[Math.floor(Math.random() * Math.min(3, pool.length))];
    const from = Towers.strokeWorld(t, i, 0.5);
    // 初速沿该点向外、略偏上，随后转向追踪
    let dx = from.x - t.x, dy = from.y - t.y - t.size * 0.3;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    Towers.consume(t, i, 0.05, t.cfg.dotRewrite);
    Towers.shots.push({ tower: t, kind: 'spark', stroke: i, x: from.x, y: from.y, vx: dx * 280, vy: dy * 280, speed: 280, target, trail: [], life: 2.2 });
    if (Towers.mode === 'glyph') FX.emit(4, from.x, from.y, { color: COLORS.fireHot, speed: [30, 90], life: [0.2, 0.4], size: [1.5, 3], kind: 'ember' });
  },

  cast(t) {
    const cfg = t.cfg;
    let best = null, bestScore = 0;
    // 只在塔附近找落点，避免砸到画面边缘的出生口
    for (let s = 150; s <= World.total - 40; s += 16) {
      const p = World.pointAt(s);
      if (Math.hypot(p.x - t.x, p.y - t.y) > cfg.range * 1.15) continue;
      let score = 0;
      for (const e of World.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < cfg.bombRadius * 0.8) score += e.weight;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) return false;
    const step = cfg.rewriteAll / 4;
    for (let i = 0; i < 4; i++) Towers.consume(t, i, cfg.bombFlight + i * step, step);
    Towers.shots.push({ tower: t, kind: 'bomb', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y, t: 0, dur: cfg.bombFlight, scale: 1, rot: 0 });
    FX.addShake(3);
    if (Towers.mode === 'glyph') FX.emit(18, t.x, t.y, { color: COLORS.fireHot, speed: [80, 220], life: [0.3, 0.6], size: [2, 4], kind: 'ember' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'spark') this.updateSpark(s, dt);
    else if (s.kind === 'bomb') this.updateBomb(s, dt);
    else if (s.kind === 'mark') this.updateMark(s, dt);
  },

  updateSpark(s, dt) {
    const cfg = s.tower.cfg;
    s.life -= dt;
    if (!s.target || s.target.dead) {
      s.target = null;
      let bestD = 260;
      for (const e of World.enemies) {
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d < bestD) { bestD = d; s.target = e; }
      }
    }
    if (s.target) {
      const dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy) || 1;
      s.speed = Math.min(cfg.sparkSpeed, s.speed + 900 * dt);
      const k = Math.min(1, dt * 7);
      s.vx += (dx / d * s.speed - s.vx) * k;
      s.vy += (dy / d * s.speed - s.vy) * k;
      if (d < s.target.size * 0.55) { this.sparkHit(s, s.target); return; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 9) s.trail.shift();
    if (s.life <= 0 || s.x < -50 || s.x > STAGE.W + 50 || s.y < -50 || s.y > STAGE.H + 50) s.done = true;
  },

  sparkHit(s, e) {
    const cfg = s.tower.cfg;
    s.done = true;
    const crit = Math.random() < cfg.critChance;
    const dmg = Math.round(rnd(cfg.sparkDamage[0], cfg.sparkDamage[1]) * (crit ? cfg.critMul : 1));
    e.pushVx = s.vx * 0.3;
    World.damage(e, dmg, { crit, color: crit ? COLORS.fire : COLORS.ink, kind: 'fire' });
    World.burn(e, 1, cfg.burnDuration);
    Towers.addCharge(s.tower, cfg.chargePerHit);
    if (Towers.mode === 'glyph') {
      FX.emit(crit ? 16 : 8, e.x, e.y, { color: COLORS.fireHot, speed: [60, crit ? 280 : 180], life: [0.2, 0.45], size: [1.5, 3.5], kind: 'ember' });
      FX.ring(e.x, e.y, crit ? 40 : 22, COLORS.fire, 0.25, crit ? 5 : 3);
    } else {
      FX.emit(4, e.x, e.y, { color: COLORS.plain, speed: [30, 80], life: [0.2, 0.3], size: [1.5, 2.5] });
    }
    FX.addShake(crit ? 2.5 : 0.5);
    if (crit) FX.addHitstop(0.025);
  },

  updateBomb(s, dt) {
    const cfg = s.tower.cfg;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k;
    s.y = s.sy + (s.ty - s.sy) * k - Math.sin(Math.PI * k) * cfg.bombArc;
    s.scale = 1 + 0.75 * Math.sin(Math.PI * k) + 0.55 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.12;
    if (Towers.mode === 'glyph') FX.emit(Math.ceil(dt * 90), s.x, s.y, { color: COLORS.fireHot, speed: [10, 60], life: [0.25, 0.5], size: [2, 4], kind: 'ember' });
    if (k >= 1) { s.done = true; this.explode(s); }
  },

  explode(s) {
    const cfg = s.tower.cfg, r = cfg.bombRadius;
    const { tx, ty } = s;
    for (const e of World.inRange(tx, ty, r)) {
      const d = Math.hypot(e.x - tx, e.y - ty);
      const crit = Math.random() < 0.25;
      const dmg = cfg.bombDamage * (1 - 0.35 * d / r) * (crit ? 1.6 : 1);
      e.pushVx = (e.x - tx) * 4;
      World.damage(e, dmg, { crit, color: COLORS.fire, kind: 'fire' });
      World.burn(e, 3, cfg.burnDuration + 1);
    }
    FX.addHitstop(0.09);
    FX.addShake(15);
    if (Towers.mode === 'glyph') {
      FX.ring(tx, ty, r * 1.25, COLORS.fire, 0.5, 10);
      FX.ring(tx, ty, r * 0.8, COLORS.ink, 0.35, 5);
      FX.emit(70, tx, ty, { color: COLORS.fireHot, speed: [120, 560], life: [0.35, 0.9], size: [2, 5], kind: 'ember', drag: 3 });
      FX.emit(30, tx, ty, { color: COLORS.fire, speed: [80, 300], life: [0.4, 0.8], size: [2, 4], grav: 200 });
      FX.emit(12, tx, ty, { color: '#3a2a20', speed: [20, 80], life: [0.8, 1.4], size: [14, 26], kind: 'smoke', drag: 1 });
      FX.stain(tx, ty, 40, '#4a2a1e', 0.35);
    } else {
      FX.ring(tx, ty, r, COLORS.plain, 0.4, 4);
      FX.emit(20, tx, ty, { color: COLORS.plain, speed: [60, 200], life: [0.3, 0.5], size: [2, 3] });
    }
    Towers.shots.push({ tower: s.tower, kind: 'mark', ground: true, x: tx, y: ty, t: 0, dur: cfg.markDuration, tick: 0 });
  },

  updateMark(s, dt) {
    const cfg = s.tower.cfg;
    s.t += dt; s.tick += dt;
    while (s.tick >= 0.3) {
      s.tick -= 0.3;
      for (const e of World.inRange(s.x, s.y, cfg.markRadius)) {
        World.damage(e, cfg.markDps * 0.3, { color: COLORS.fire, size: 15, kind: 'fire' });
        World.burn(e, 1, 1.2);
      }
    }
    const k = s.t / s.dur;
    if (Towers.mode === 'glyph') {
      // 火苗从火字笔画上窜起
      const n = Math.ceil(dt * 70 * (1 - k));
      for (let i = 0; i < n; i++) {
        const stroke = GLYPHS.fire.strokes[Math.floor(Math.random() * 4)];
        const p = Brush.toWorld(Brush.pointAt(stroke, Math.random()), { x: s.x, y: s.y, size: 200 });
        FX.emit(1, p.x, p.y, { color: Math.random() < 0.5 ? COLORS.fireHot : COLORS.fire, speed: [20, 70], life: [0.3, 0.7], size: [2, 4.5], angle: -Math.PI / 2, spread: 0.35, grav: -120, kind: 'ember', drag: 1 });
      }
    }
    if (k >= 1) {
      s.done = true;
      if (Towers.mode === 'glyph' && FX.feedback) FX.stampGlyph(GLYPHS.fire, s.x, s.y, 200, '#5a3324', 0.22);
    }
  },

  drawShot(ctx, s) {
    const glyph = Towers.mode === 'glyph';
    if (s.kind === 'spark') {
      if (!glyph) {
        ctx.fillStyle = COLORS.plain;
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
        return;
      }
      Brush.drawTrail(ctx, s.trail, 9, COLORS.fireHot, 0.55);
      // 飞出去的就是那一点：按速度方向旋转笔画本身
      const stroke = GLYPHS.fire.strokes[s.stroke];
      const info = Brush.prepare(stroke);
      const mid = info.pts[Math.floor(info.pts.length / 2)];
      const head = info.pts[0], tail = info.pts[info.pts.length - 1];
      const strokeAng = Math.atan2(tail.y - head.y, tail.x - head.x);
      const size = s.tower.size * 1.35, k = size / 100;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx) - strokeAng);
      Brush.drawStroke(ctx, stroke, { x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color: COLORS.fire, glow: COLORS.fireGlow, glowBlur: 12, dry: false });
      ctx.restore();
    } else if (s.kind === 'bomb') {
      const gx = s.sx + (s.tx - s.sx) * (s.t / s.dur), gy = s.sy + (s.ty - s.sy) * (s.t / s.dur);
      ctx.fillStyle = 'rgba(40,30,20,0.15)';
      ctx.beginPath(); ctx.ellipse(gx, gy + 10, 30 * s.scale, 9 * s.scale, 0, 0, Math.PI * 2); ctx.fill();
      if (!glyph) {
        ctx.fillStyle = COLORS.plain;
        ctx.beginPath(); ctx.arc(s.x, s.y, 12 * s.scale, 0, Math.PI * 2); ctx.fill();
        return;
      }
      Brush.drawGlyph(ctx, GLYPHS.fire, { x: s.x, y: s.y, size: s.tower.size * s.scale, rot: s.rot, color: COLORS.fire, glow: COLORS.fireGlow, glowBlur: 24 });
    } else if (s.kind === 'mark') {
      const k = s.t / s.dur, r = s.tower.cfg.markRadius;
      if (!glyph) {
        ctx.fillStyle = `rgba(150,120,100,${0.22 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const g = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, r * 1.1);
      g.addColorStop(0, `rgba(240,130,60,${0.28 * (1 - k)})`);
      g.addColorStop(1, 'rgba(240,130,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.1, 0, Math.PI * 2); ctx.fill();
      const hot = k < 0.12;
      Brush.drawGlyph(ctx, GLYPHS.fire, {
        x: s.x, y: s.y, size: 200, color: hot ? '#f6b25a' : COLORS.fire,
        alpha: 0.15 + 0.75 * (1 - k), glow: COLORS.fireGlow, glowBlur: 26 * (1 - k), dry: false,
      });
    }
  },
};
