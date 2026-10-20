// 炮塔（2026-10-20）：超远射程与地毯轰炸。
// 普攻「炮弹」：火旁左点化作炮弹，抛射轰击射程内离塔最远的敌人（按其脚程预判落点），落地溅射；
//   离塔不足 minRange 的敌人打不到——炮塔怕近身。
// 大招「连珠」：「包」的五笔化作五发炮弹，沿敌群最密的路段依次落下。
const GlyphCannon = {
  BARRAGE: [4, 5, 6, 7, 8],   // 「包」五笔

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, 0)) return;
    const target = GlyphKit.best(pool, (e) => {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      return d < cfg.minRange ? -Infinity : d;
    });
    if (!target || Math.hypot(target.x - t.x, target.y - t.y) < cfg.minRange) return;
    gl.timer = cfg.shellInterval;
    GlyphTower.consume(t, 0, cfg.shellFlight, cfg.shellRewrite);
    gl.recoil = 6 * CONFIG.GLYPH_SCALE;
    const land = this.lead(target, cfg.shellFlight);
    const from = GlyphTower.strokeWorld(t, 0, 0.5);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'shell', stroke: 0, sx: from.x, sy: from.y, tx: land.x, ty: land.y, x: from.x, y: from.y,
      t: 0, dur: cfg.shellFlight, rot: 0, big: false,
    });
    GlyphFX.emit(10, from.x, from.y, { color: '#3a2a20', speed: [20, 80], life: [0.4, 0.8], size: [6, 12], kind: 'smoke', drag: 1 });
    GlyphFX.addShake(1.5);
  },

  // 预判：按敌人当前移速推算 flight 秒后的位置
  lead(e, flight) {
    if (!e.track || e.stun > 0 || e.carried) return { x: e.x, y: e.y };
    const ds = e.speed * CONFIG.CELL_SIZE * e.glyphSpeedMul() * flight;
    return e.track.pointAt(GlyphKit.wrapS(e.track, e.s + ds));
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.barrageRadius * 1.5 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.barrageFlight, cfg.rewriteAll, this.BARRAGE);
    GlyphSystem.push(t.game, { tower: t, kind: 'volley', track: best.track, s: best.s, t: 0, n: 0 });
    GlyphFX.addShake(4);
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'shell') this.updateShell(s, dt);
    else if (s.kind === 'volley') this.updateVolley(s, dt);
  },

  // 连珠：每隔 barrageGap 秒从塔身「包」字依次射出一发，落点沿路以 barrageSpacing 排开
  updateVolley(s, dt) {
    const t = s.tower;
    const cfg = t.gl.cfg;
    s.t += dt;
    while (s.n < this.BARRAGE.length && s.t >= s.n * cfg.barrageGap) {
      const k = s.n++;
      const p = s.track.pointAt(GlyphKit.wrapS(s.track, s.s + (k - 2) * cfg.barrageSpacing));
      GlyphSystem.push(s.game, {
        tower: t, kind: 'shell', stroke: this.BARRAGE[k], sx: t.x, sy: t.y - t.gl.size * 0.2, tx: p.x, ty: p.y,
        x: t.x, y: t.y, t: 0, dur: cfg.barrageFlight, rot: 0, big: true,
      });
      GlyphFX.emit(8, t.x, t.y, { color: '#3a2a20', speed: [20, 80], life: [0.4, 0.8], size: [6, 12], kind: 'smoke', drag: 1 });
      GlyphFX.addShake(2);
    }
    if (s.n >= this.BARRAGE.length) s.done = true;
  },

  updateShell(s, dt) {
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.shellArc * (s.big ? 1.3 : 1));
    s.rot += dt * 10;
    if (Math.random() < dt * 30) {
      GlyphFX.emit(1, s.x, s.y, { color: '#4a3f36', speed: [5, 20], life: [0.3, 0.6], size: [4, 8], kind: 'smoke', drag: 1 });
    }
    if (k < 1) return;
    s.done = true;
    this.blast(s);
  },

  blast(s) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const r = s.big ? cfg.barrageRadius : cfg.shellRadius;
    let hits = 0;
    for (const e of GlyphWorld.enemiesInRange(s.game, s.tx, s.ty, r)) {
      const d = Math.hypot(e.x - s.tx, e.y - s.ty);
      const base = s.big ? cfg.barrageDamage : GlyphFX.rnd(cfg.shellDamage[0], cfg.shellDamage[1]);
      hits++;
      e.pushVx = (e.x - s.tx) * 3;
      GlyphWorld.damage(e, Math.round(base * (1 - cfg.shellEdgeFalloff * d / r)), { color: c.cannon, kind: 'cannon' });
    }
    if (!s.big && hits) GlyphTower.addCharge(s.tower, cfg.chargePerHit);
    GlyphFX.addShake(s.big ? 7 : 3);
    if (s.big) GlyphFX.addHitstop(0.03);
    GlyphFX.ring(s.tx, s.ty, r / S, c.cannon, 0.35, s.big ? 7 : 4);
    GlyphFX.emit(s.big ? 34 : 18, s.tx, s.ty, { color: c.fireHot, speed: [80, 300], life: [0.2, 0.5], size: [1.5, 3.5], kind: 'ember', drag: 3 });
    GlyphFX.emit(8, s.tx, s.ty, { color: '#3a2a20', speed: [15, 60], life: [0.6, 1.1], size: [10, 18], kind: 'smoke', drag: 1 });
    GlyphFX.stain(s.tx, s.ty, s.big ? 22 : 14, '#3a2f26', 0.25);
  },

  drawShot(ctx, s) {
    if (s.kind !== 'shell') return;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    const f = Math.min(1, s.t / s.dur);
    // 落点预警：地上一圈渐浓的虚线
    ctx.save();
    ctx.setLineDash([4 * S, 4 * S]);
    ctx.strokeStyle = `rgba(74,63,54,${0.15 + 0.35 * f})`;
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.arc(s.tx, s.ty, (s.big ? gl.cfg.barrageRadius : gl.cfg.shellRadius) * (1.2 - 0.4 * f), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(40,30,20,0.18)';
    ctx.beginPath();
    ctx.arc(s.sx + (s.tx - s.sx) * f, s.sy + (s.ty - s.sy) * f + 6 * S, 7 * S, 0, Math.PI * 2);
    ctx.fill();
    GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y, {
      rot: s.rot, scale: s.big ? 1.1 : 1.3, color: c.cannon, glow: c.fireGlow, glowBlur: 8,
    });
  },
};
