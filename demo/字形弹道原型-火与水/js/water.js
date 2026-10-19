// 水塔：竖钩被拉长成一道贯穿水箭（普攻）；横撇、撇、捺离开塔身化作浪头，
// 沿路径倒卷，把卷入的敌人一路推回去（大招「潮」）
const WaterTower = {
  update(t, dt) {
    t.timer -= dt;
    if (t.timer > 0 || !Towers.ready(t, 0)) return;
    const target = Towers.frontTarget(t);
    if (!target) return;
    const cfg = t.cfg;
    t.timer = cfg.jetInterval;
    const ox = t.x, oy = t.y - t.size * 0.08;
    const aim = Math.atan2(target.y - oy, target.x - ox);
    const len = Math.min(cfg.range + 20, Math.hypot(target.x - ox, target.y - oy) + 70);
    Towers.consume(t, 0, 0.3, cfg.shuRewrite);
    t.recoil = 4;
    Towers.shots.push({ tower: t, kind: 'jet', x: ox, y: oy, aim, len, t: 0, dur: 0.38, hit: false });
  },

  cast(t) {
    const cfg = t.cfg;
    // 浪从射程内最靠前的敌人前方涌起，向来路倒卷
    const front = Towers.frontTarget(t);
    if (!front) return false;
    const s0 = Math.min(World.total - 10, front.s + 40);
    const step = cfg.rewriteSides / 3;
    for (let i = 1; i < 4; i++) Towers.consume(t, i, cfg.waveTime * 0.7 + (i - 1) * step, step);
    Towers.shots.push({ tower: t, kind: 'wave', s: s0, s0, t: 0, dur: cfg.waveTime, caught: [] });
    FX.addShake(5);
    FX.addHitstop(0.05);
    if (Towers.mode === 'glyph') FX.emit(24, t.x, t.y, { color: COLORS.waterLight, speed: [80, 240], life: [0.3, 0.6], size: [1.5, 3], kind: 'drop' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'jet') this.updateJet(s, dt);
    else if (s.kind === 'wave') this.updateWave(s, dt);
  },

  updateJet(s, dt) {
    s.t += dt;
    if (!s.hit && s.t >= 0.09) { s.hit = true; this.jetHit(s); }
    if (s.t >= s.dur) s.done = true;
  },

  jetHit(s) {
    const cfg = s.tower.cfg;
    const dx = Math.cos(s.aim), dy = Math.sin(s.aim);
    let hits = 0;
    for (const e of World.enemies) {
      if (e.dead) continue;
      const along = (e.x - s.x) * dx + (e.y - s.y) * dy;
      if (along < 0 || along > s.len) continue;
      const off = Math.abs((e.x - s.x) * dy - (e.y - s.y) * dx);
      if (off > cfg.jetWidth + e.size * 0.3) continue;
      hits++;
      e.s -= cfg.jetKnock * (e.weight > 1 ? 0.3 : 1);
      e.wet = cfg.wetDuration;
      e.pushVx = dx * 140;
      World.damage(e, Math.round(rnd(cfg.jetDamage[0], cfg.jetDamage[1])), { color: COLORS.water, kind: 'water' });
      if (Towers.mode === 'glyph') FX.emit(7, e.x, e.y, { color: COLORS.waterLight, speed: [60, 200], life: [0.25, 0.5], size: [1.5, 3], angle: s.aim, spread: 0.9, kind: 'drop' });
    }
    // 充能按命中数计，但封顶 3 个，避免敌群扎堆时潮无限连放
    Towers.addCharge(s.tower, cfg.chargePerHit * Math.min(3, hits));
    const ex = s.x + dx * s.len, ey = s.y + dy * s.len;
    if (Towers.mode === 'glyph') {
      // 钩 = 水花：在末端甩出一簇水滴
      FX.emit(12, ex, ey, { color: COLORS.waterLight, speed: [60, 240], life: [0.25, 0.55], size: [1.5, 3], angle: s.aim + Math.PI * 0.75, spread: 0.8, kind: 'drop' });
      FX.ring(ex, ey, 26, COLORS.water, 0.25, 3);
    }
    if (hits) FX.addShake(Math.min(3, 0.6 * hits));
  },

  updateWave(s, dt) {
    const cfg = s.tower.cfg;
    s.t += dt;
    const prev = s.s;
    s.s = Math.max(80, s.s - cfg.waveSpeed * dt); // 不把敌人推出画面
    for (const e of World.enemies) {
      if (e.dead || e.carried) continue;
      if (e.s >= s.s - 4 && e.s <= prev + 50 && e.s <= s.s0 + 40) {
        e.carried = s;
        e.carryOff = rnd(8, 48);
        s.caught.push(e);
        e.wet = cfg.wetDuration + 1.5;
        World.damage(e, cfg.waveCatchDamage, { color: COLORS.water, kind: 'water' });
      }
    }
    for (const e of s.caught) if (!e.dead) e.s = s.s + e.carryOff;
    const p = World.pointAt(s.s);
    if (Towers.mode === 'glyph') {
      const travel = p.ang + Math.PI, nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
      const n = Math.ceil(dt * 70);
      for (let i = 0; i < n; i++) {
        const o = rnd(-30, 30);
        FX.emit(1, p.x + nx * o, p.y + ny * o, { color: Math.random() < 0.6 ? COLORS.waterLight : COLORS.water, speed: [90, 240], life: [0.2, 0.45], size: [1.5, 3.2], angle: travel, spread: 0.6, kind: 'drop', drag: 3 });
      }
      if (Math.random() < dt * 20) FX.emit(1, p.x, p.y, { color: COLORS.waterLight, speed: [5, 20], life: [0.6, 1], size: [12, 20], kind: 'smoke', drag: 1 });
    }
    if (s.t >= s.dur || s.s <= 80) { s.done = true; this.release(s, p); }
  },

  release(s, p) {
    const cfg = s.tower.cfg;
    for (const e of s.caught) {
      if (e.dead) continue;
      e.carried = null;
      e.stun = cfg.waveStun;
      e.wet = cfg.wetDuration + 1.5;
      World.damage(e, cfg.waveEndDamage, { color: COLORS.water, kind: 'water' });
    }
    FX.addShake(9);
    FX.addHitstop(0.07);
    if (Towers.mode === 'glyph') {
      FX.ring(p.x, p.y, 95, COLORS.water, 0.5, 9);
      FX.emit(55, p.x, p.y, { color: COLORS.waterLight, speed: [80, 400], life: [0.3, 0.8], size: [1.5, 3.5], kind: 'drop', drag: 2.5 });
      FX.emit(20, p.x, p.y, { color: COLORS.water, speed: [60, 220], life: [0.3, 0.6], size: [2, 3.5], kind: 'drop' });
      FX.stain(p.x, p.y, 32, '#2a4a60', 0.2);
    } else {
      FX.ring(p.x, p.y, 70, COLORS.plain, 0.4, 4);
    }
  },

  drawShot(ctx, s) {
    const glyph = Towers.mode === 'glyph';
    if (s.kind === 'jet') {
      const prog = Math.min(1, s.t / 0.09);
      const fade = s.t > 0.09 ? 1 - (s.t - 0.09) / (s.dur - 0.09) : 1;
      if (!glyph) {
        const l = s.len * prog;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = COLORS.plain;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.aim) * l, s.y + Math.sin(s.aim) * l); ctx.stroke();
        ctx.restore();
        return;
      }
      // 把塔身的竖钩本身拉长到目标：竖是水柱，钩是甩出的水花
      const shu = GLYPHS.water.strokes[0];
      const widthK = s.tower.size / 100;
      for (const layer of [{ w: 2.2, color: COLORS.waterLight, a: 0.28 }, { w: 1 + 0.4 * fade, color: COLORS.water, a: 0.4 + 0.6 * fade }]) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.aim - Math.PI / 2);
        ctx.scale(widthK * layer.w, s.len / 85);
        ctx.translate(-51, -5);
        Brush.drawStroke(ctx, shu, { x: 50, y: 50, size: 100, progress: prog, color: layer.color, alpha: layer.a * fade, wash: false, dry: layer.w < 2 });
        ctx.restore();
      }
    } else if (s.kind === 'wave') {
      const p = World.pointAt(s.s);
      if (!glyph) {
        ctx.fillStyle = 'rgba(119,113,106,0.35)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, Math.PI * 2); ctx.fill();
        return;
      }
      // 浪后的水痕
      for (let d = 0; d < 160; d += 10) {
        const q = World.pointAt(Math.min(s.s0, s.s + d));
        ctx.fillStyle = `rgba(60,110,145,${0.2 * (1 - d / 160)})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, 30, 0, Math.PI * 2); ctx.fill();
      }
      // 浪头 = 「水」字离开塔身的三笔，字顶朝向前进方向
      const travel = p.ang + Math.PI;
      const swell = 1 + 0.08 * Math.sin(s.t * 18);
      Brush.drawGlyph(ctx, GLYPHS.water, {
        x: p.x, y: p.y, size: 130 * swell, rot: travel + Math.PI / 2,
        color: COLORS.water, glow: 'rgba(80,140,180,0.45)', glowBlur: 14,
      }, (i) => (i === 0 ? { hidden: true } : null));
    }
  },
};
