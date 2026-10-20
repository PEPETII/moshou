// 山塔（2026-10-20）：唯一的路径塔。
// 放在路上，有生命（CONFIG.TOWERS.mountain.hp），敌人走到它前一格会停下攻击它——
// 挡路沿用敌人侧既有的阻挡链（Enemy.checkBlocking → RuntimeIndexes.blockingTowerByCell → Tower.takeDamage），
// 生命归零时由敌人侧调用 removeTower 移除。
// 普攻「峰刺」：三笔各化一根石刺，预警片刻后从最前三名敌人脚下拱出，伤害并短暂定身。
// 大招「崩」：回满生命，以山为心沿路双向震荡，击退、眩晕并伤害。
const GlyphMountain = {
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    const ready = [0, 1, 2].filter((i) => GlyphTower.ready(t, i));
    if (!ready.length) return;
    gl.timer = cfg.spikeInterval;
    const targets = pool.slice().sort((a, b) => b.s - a.s).slice(0, ready.length);
    targets.forEach((e, k) => {
      const i = ready[k];
      GlyphTower.consume(t, i, cfg.spikeDelay, cfg.spikeRewrite);
      GlyphSystem.push(t.game, { tower: t, kind: 'spike', stroke: i, x: e.x, y: e.y, t: 0, dur: cfg.spikeDelay + 0.4, fired: false });
    });
  },

  cast(t) {
    const cfg = t.gl.cfg;
    const near = GlyphKit.nearestTrack(t.game, t.x, t.y);
    if (!near) return false;
    if (t.maxHp > 0) t.hp = Math.min(t.maxHp, t.hp + t.maxHp * cfg.quakeHeal);
    GlyphKit.consumeAll(t, 0.3, cfg.rewriteAll);
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    for (const e of GlyphKit.alongTrack(t.game, near.track, near.s, cfg.quakeReach)) {
      e.knockback(cfg.quakeKnock);
      e.glyphStun(cfg.quakeStun);
      GlyphWorld.damage(e, cfg.quakeDamage, { color: c.mountain, kind: 'mountain' });
    }
    GlyphSystem.push(t.game, { tower: t, kind: 'quake', ground: true, track: near.track, s: near.s, t: 0, dur: 0.55 });
    GlyphFX.addHitstop(0.08);
    GlyphFX.addShake(13);
    GlyphFX.ring(t.x, t.y, 90, c.mountain, 0.5, 9);
    GlyphFX.emit(40, t.x, t.y, { color: c.mountainLight, speed: [90, 320], life: [0.3, 0.7], size: [2, 4], grav: 320 });
    GlyphFX.emit(10, t.x, t.y, { color: '#4a4a40', speed: [15, 60], life: [0.7, 1.2], size: [12, 22], kind: 'smoke', drag: 1 });
    GlyphFX.number(t, t.maxHp * cfg.quakeHeal, { color: c.wood, size: 18 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'spike') this.updateSpike(s, dt);
    else if (s.kind === 'quake') { s.t += dt; if (s.t >= s.dur) s.done = true; }
  },

  updateSpike(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    s.t += dt;
    if (!s.fired && s.t >= cfg.spikeDelay) {
      s.fired = true;
      let hits = 0;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, 26 * S)) {
        hits++;
        e.glyphStun(cfg.spikeStun);
        GlyphWorld.damage(e, Math.round(GlyphFX.rnd(cfg.spikeDamage[0], cfg.spikeDamage[1])), { color: c.mountain, kind: 'mountain' });
      }
      if (hits) GlyphTower.addCharge(s.tower, cfg.chargePerHit);
      GlyphFX.emit(10, s.x, s.y, { color: c.mountainLight, speed: [60, 200], life: [0.2, 0.45], size: [1.5, 3], grav: 300, angle: -Math.PI / 2, spread: 0.9 });
      GlyphFX.addShake(1.2);
    }
    if (s.t >= s.dur) s.done = true;
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'spike') {
      const cfg = gl.cfg;
      if (s.t < cfg.spikeDelay) {
        // 预警：地面裂开一道小缝
        ctx.save();
        ctx.strokeStyle = `rgba(90,90,80,${0.3 + 0.5 * s.t / cfg.spikeDelay})`;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo(s.x - 10 * S, s.y + 6 * S);
        ctx.lineTo(s.x - 2 * S, s.y + 2 * S);
        ctx.lineTo(s.x + 3 * S, s.y + 7 * S);
        ctx.lineTo(s.x + 11 * S, s.y + 3 * S);
        ctx.stroke();
        ctx.restore();
        return;
      }
      // 石刺：该笔竖直拱出，再缩回
      const k = (s.t - cfg.spikeDelay) / (s.dur - cfg.spikeDelay);
      const up = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y - 14 * S * up, {
        ang: -Math.PI / 2, scale: 0.55 + 0.35 * up, color: c.mountain, glow: c.mountainGlow, alpha: 0.4 + 0.6 * up,
      });
    } else if (s.kind === 'quake') {
      const k = s.t / s.dur;
      const reach = gl.cfg.quakeReach * Math.min(1, k * 2.5);
      GlyphKit.drawBand(ctx, s.track, s.s - reach, s.s + reach, 26 * S, `rgba(90,90,80,${0.12 * (1 - k)})`);
    }
  },
};
