// 木塔（2026-10-20 重做）：持续生长与蔓延，与火的「直线爆发」区分开。
// 普攻「播种」：撇笔落到最前敌人前方的路上，长成木苗，持续刺伤并拖慢经过者；每塔木苗有上限。
// 大招「蔓生」：四笔整字落向敌群最密处，藤蔓从落点沿路双向生长，缠住其上敌人（减速 + 持续伤害）。
// 木苗的种植、生长与绘制也供合字「林」复用（见 lin.js），参数一律读各自塔的 cfg。
const GlyphWood = {
  // 普攻：撇（第 3 笔）写满才播种
  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length || !GlyphTower.ready(t, 2)) return;
    const target = GlyphTower.frontTarget(pool);
    if (!target || !target.track) return;
    gl.timer = cfg.seedInterval;
    GlyphTower.consume(t, 2, 0.05, cfg.seedRewrite);
    gl.recoil = 3 * CONFIG.GLYPH_SCALE;
    this.sow(t, 2, target.track, target.s + cfg.seedLead);
  },

  // 把第 i 笔作为种子抛到 track 上里程 s 处，落地后长成木苗
  sow(t, i, track, s) {
    const sw = GlyphKit.wrapS(track, track.loop ? s : Math.min(track.total - 10, s));
    const p = track.pointAt(sw);
    const from = GlyphTower.strokeWorld(t, i, 0.5);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'seed', stroke: i, sx: from.x, sy: from.y, tx: p.x, ty: p.y, x: from.x, y: from.y,
      t: 0, dur: t.gl.cfg.seedFlight, track, s: sw, rot: 0,
    });
    GlyphFX.emit(4, from.x, from.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [40, 110], life: [0.2, 0.4], size: [1.5, 3] });
  },

  // 木苗落地：超过上限时最老的一株枯萎
  plant(s) {
    const t = s.tower;
    const cfg = t.gl.cfg;
    const mine = s.game.glyphShots.filter((o) => o.kind === 'sprout' && o.tower === t && !o.done);
    for (let k = 0; k <= mine.length - cfg.sproutMax; k++) mine[k].done = true;
    GlyphSystem.push(s.game, {
      tower: t, kind: 'sprout', ground: true, x: s.tx, y: s.ty, track: s.track, s: s.s,
      t: 0, tick: 0, touched: cfg.sproutRoot ? new Set() : null,
    });
    GlyphFX.emit(6, s.tx, s.ty, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [30, 90], life: [0.2, 0.4], size: [1.5, 3], grav: 160 });
  },

  // 大招「蔓生」
  cast(t) {
    const cfg = t.gl.cfg;
    const best = GlyphKit.densest(t, { radius: cfg.vineLength * 0.5 });
    if (!best) return false;
    GlyphKit.consumeAll(t, cfg.vineFlight, cfg.rewriteAll);
    GlyphSystem.push(t.game, {
      tower: t, kind: 'lob', sx: t.x, sy: t.y, tx: best.x, ty: best.y, x: t.x, y: t.y,
      t: 0, dur: cfg.vineFlight, scale: 1, rot: 0, track: best.track, s: best.s,
    });
    GlyphFX.addShake(3);
    GlyphFX.emit(14, t.x, t.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [70, 190], life: [0.25, 0.5], size: [1.5, 3.5], grav: 220 });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'seed') this.updateSeed(s, dt);
    else if (s.kind === 'sprout') this.updateSprout(s, dt);
    else if (s.kind === 'lob') this.updateLob(s, dt);
    else if (s.kind === 'vine') this.updateVine(s, dt);
  },

  updateSeed(s, dt) {
    const k = GlyphKit.lob(s, dt, s.tower.gl.cfg.seedArc);
    s.rot += dt * 9;
    if (k >= 1) { s.done = true; this.plant(s); }
  },

  // 木苗：长成后每跳刺伤半径内敌人并减速；林的木苗另有「初触定身」
  updateSprout(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    if (s.t >= cfg.sproutGrow + cfg.sproutLife) { s.done = true; return; }
    if (s.t < cfg.sproutGrow) return;
    s.tick += dt;
    while (s.tick >= cfg.sproutTick) {
      s.tick -= cfg.sproutTick;
      let hits = 0;
      for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, cfg.sproutRadius)) {
        hits++;
        ControlRules.slow(e, cfg.sproutSlow, cfg.sproutTick + 0.2, 'ground');
        if (s.touched && !s.touched.has(e)) { s.touched.add(e); ControlRules.root(e, cfg.sproutRoot, 'ground'); }
        GlyphWorld.damage(e, cfg.sproutDps * cfg.sproutTick, { color: c.wood, size: 14, kind: 'wood', delivery: 'ground', aoe: true, dot: true });
      }
      if (hits) {
        GlyphTower.addCharge(s.tower, cfg.chargePerHit);
        GlyphFX.emit(3, s.x, s.y, { color: c.woodLight, speed: [40, 100], life: [0.2, 0.35], size: [1.5, 2.5], angle: -Math.PI / 2, spread: 0.8 });
      }
    }
  },

  updateLob(s, dt) {
    const cfg = s.tower.gl.cfg;
    const k = GlyphKit.lob(s, dt, cfg.vineArc);
    s.scale = 1 + 0.4 * Math.sin(Math.PI * k) + 0.3 * k;
    s.rot = Math.sin(k * Math.PI * 2) * 0.16;
    GlyphFX.emit(Math.ceil(dt * 40), s.x, s.y, { color: CONFIG.GLYPH_COLORS.woodLight, speed: [10, 45], life: [0.2, 0.45], size: [1.5, 3], grav: 160 });
    if (k < 1) return;
    s.done = true;
    const c = CONFIG.GLYPH_COLORS;
    GlyphFX.addHitstop(0.05);
    GlyphFX.addShake(7, true);
    GlyphFX.ring(s.tx, s.ty, 60, c.wood, 0.4, 6);
    GlyphFX.emit(24, s.tx, s.ty, { color: c.woodLight, speed: [60, 200], life: [0.3, 0.6], size: [1.5, 3], grav: 240 });
    GlyphFX.stain(s.tx, s.ty, 24, '#3f5233', 0.22);
    GlyphSystem.push(s.game, {
      tower: s.tower, kind: 'vine', ground: true, x: s.tx, y: s.ty, track: s.track, s: s.s, len: 0, t: 0, tick: 0,
    });
  },

  // 藤蔓：沿路双向生长到 vineLength，缠住其上敌人
  updateVine(s, dt) {
    const cfg = s.tower.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    s.t += dt;
    s.len = Math.min(cfg.vineLength, s.len + cfg.vineGrowSpeed * dt);
    s.tick += dt;
    while (s.tick >= cfg.vineTick) {
      s.tick -= cfg.vineTick;
      for (const e of GlyphKit.alongTrack(s.game, s.track, s.s, s.len)) {
        ControlRules.slow(e, cfg.vineSlow, cfg.vineTick + 0.25, 'ground');
        GlyphWorld.damage(e, cfg.vineDps * cfg.vineTick, { color: c.wood, size: 14, kind: 'wood', delivery: 'ground', aoe: true, dot: true });
      }
    }
    // 生长的两端冒出新叶
    if (s.len < cfg.vineLength) {
      for (const dir of [-1, 1]) {
        const p = s.track.pointAt(GlyphKit.wrapS(s.track, s.s + dir * s.len));
        GlyphFX.emit(1, p.x, p.y, { color: c.woodLight, speed: [20, 60], life: [0.3, 0.5], size: [1.5, 3], grav: -40 });
      }
    }
    if (s.t >= cfg.vineDuration) s.done = true;
  },

  // 木苗外观：一株随生长放大的小「木」字，脚下一圈淡绿
  drawSprout(ctx, s, size, color, glow) {
    const cfg = s.tower.gl.cfg;
    const grow = Math.min(1, s.t / cfg.sproutGrow);
    const fade = Math.min(1, (cfg.sproutGrow + cfg.sproutLife - s.t) / 0.6);
    GlyphKit.drawPool(ctx, s.x, s.y, cfg.sproutRadius * 1.1, '80,110,70', 0.16 * grow * fade);
    Brush.drawGlyph(ctx, CONFIG.GLYPHS.wood, {
      x: s.x, y: s.y - size * 0.25 * grow, size: size * (0.3 + 0.7 * grow), color,
      alpha: 0.85 * fade, glow: grow >= 1 ? glow : null, glowBlur: 8, dry: false,
    });
  },

  drawShot(ctx, s) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const gl = s.tower.gl;
    if (s.kind === 'seed') {
      GlyphKit.drawStrokeAt(ctx, gl, s.stroke, s.x, s.y, { rot: s.rot, scale: 0.7, color: c.wood, glow: c.woodGlow });
    } else if (s.kind === 'sprout') {
      this.drawSprout(ctx, s, 34 * S, c.wood, c.woodGlow);
    } else if (s.kind === 'lob') {
      GlyphKit.drawLobGlyph(ctx, s, gl.glyph, gl.size, c.wood, c.woodGlow);
    } else if (s.kind === 'vine') {
      const cfg = gl.cfg;
      const fade = Math.min(1, (cfg.vineDuration - s.t) / 0.5);
      GlyphKit.drawBand(ctx, s.track, s.s - s.len, s.s + s.len, cfg.vineWidth, `rgba(79,111,74,${0.16 * fade})`);
      // 藤上的叶：沿路每隔一段交替画撇、捺
      const strokes = CONFIG.GLYPHS.wood.strokes;
      const step = 26 * S;
      let n = 0;
      for (let d = -s.len; d <= s.len; d += step, n++) {
        const p = s.track.pointAt(GlyphKit.wrapS(s.track, s.s + d));
        Brush.drawStroke(ctx, strokes[2 + (n % 2)], {
          x: p.x, y: p.y, size: 30 * S, rot: p.ang + (n % 2 ? 0.5 : -0.5), color: c.wood, alpha: 0.75 * fade, dry: false,
        });
      }
    }
  },
};
