// 雷塔（2026-10-20）：瞬发连锁与水雷联动。
// 普攻「电弧」：雨中四点轮流放电，电弧瞬间击中最前敌人后在敌群间跳跃，每跳衰减；
//   湿身（被水打湿）的目标伤害加深，且跳到它身上时不衰减——先水后雷。
// 大招「霹雳」：天雷轮番劈落射程内的敌人（优先湿身者），小范围伤害并眩晕。
const GlyphThunder = {
  DOTS: [4, 5, 6, 7],

  update(t, dt, pool) {
    const gl = t.gl;
    const cfg = gl.cfg;
    gl.timer -= dt;
    if (gl.timer > 0 || !pool.length) return;
    let i = -1;
    for (let k = 0; k < 4; k++) {
      const cand = this.DOTS[(gl.nextDot + k) % 4];
      if (GlyphTower.ready(t, cand)) { i = cand; gl.nextDot = (gl.nextDot + k + 1) % 4; break; }
    }
    if (i < 0) return;
    const first = GlyphTower.frontTarget(pool);
    if (!first) return;
    gl.timer = cfg.arcInterval;
    GlyphTower.consume(t, i, 0.05, cfg.arcRewrite);
    const from = GlyphTower.strokeWorld(t, i, 0.5);
    this.chain(t, first, from);
  },

  // 连锁：从 first 开始，每次跳到 arcJumpRange 内最近的未击中敌人
  chain(t, first, from) {
    const cfg = t.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const pts = [{ x: from.x, y: from.y }];
    const hit = new Set();
    let e = first;
    let dmg = GlyphFX.rnd(cfg.arcDamage[0], cfg.arcDamage[1]);
    for (let j = 0; e && j <= cfg.arcJumps; j++) {
      hit.add(e);
      pts.push({ x: e.x, y: e.y });
      const wet = e.wet > 0;
      GlyphWorld.damage(e, Math.round(dmg), { crit: wet, color: c.thunder, kind: 'thunder', delivery: 'instant', aoe: j > 0, wetBonus: cfg.wetMul });
      GlyphTower.addCharge(t, cfg.chargePerHit);
      GlyphFX.emit(5, e.x, e.y, { color: c.thunderLight, speed: [60, 200], life: [0.1, 0.25], size: [1, 2.2], kind: 'ember' });
      if (!wet) dmg *= cfg.arcFalloff;
      let next = null;
      let bestD = cfg.arcJumpRange;
      for (const o of GlyphWorld.enemiesInRange(t.game, e.x, e.y, cfg.arcJumpRange)) {
        if (hit.has(o)) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d < bestD) { bestD = d; next = o; }
      }
      e = next;
    }
    GlyphSystem.push(t.game, { tower: t, kind: 'arc', pts, t: 0, dur: 0.22 });
    GlyphFX.addShake(Math.min(2.5, 0.5 * hit.size));
  },

  cast(t, pool) {
    if (!pool.length) return false;
    const cfg = t.gl.cfg;
    GlyphKit.consumeAll(t, cfg.boltCount * cfg.boltGap, cfg.rewriteAll);
    GlyphSystem.push(t.game, { tower: t, kind: 'storm', t: 0, n: 0 });
    GlyphFX.addShake(4);
    GlyphFX.emit(20, t.x, t.y, { color: CONFIG.GLYPH_COLORS.thunderLight, speed: [80, 260], life: [0.2, 0.4], size: [1, 2.5], kind: 'ember' });
    return true;
  },

  updateShot(s, dt) {
    if (s.kind === 'arc' || s.kind === 'bolt') { s.t += dt; if (s.t >= s.dur) s.done = true; }
    else if (s.kind === 'storm') this.updateStorm(s, dt);
  },

  // 霹雳：每隔 boltGap 秒劈一道；湿身者优先，其次随机
  updateStorm(s, dt) {
    const t = s.tower;
    const cfg = t.gl.cfg;
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    s.t += dt;
    while (s.n < cfg.boltCount && s.t >= s.n * cfg.boltGap) {
      s.n++;
      const pool = GlyphWorld.enemiesInRange(s.game, t.x, t.y, cfg.range);
      if (!pool.length) continue;
      const wet = pool.filter((e) => e.wet > 0);
      const list = wet.length ? wet : pool;
      const target = list[Math.floor(Math.random() * list.length)];
      const { x, y } = target;
      for (const e of GlyphWorld.enemiesInRange(s.game, x, y, cfg.boltRadius)) {
        ControlRules.stun(e, cfg.boltStun, 'thunder');
        GlyphWorld.damage(e, cfg.boltDamage, { crit: e === target, color: c.thunder, kind: 'thunder', delivery: 'instant', aoe: true, wetBonus: cfg.wetMul });
      }
      GlyphSystem.push(s.game, { tower: t, kind: 'bolt', x, y, t: 0, dur: 0.28 });
      GlyphFX.addShake(6, true);
      GlyphFX.addHitstop(0.03);
      GlyphFX.ring(x, y, cfg.boltRadius / S * 1.3, c.thunder, 0.3, 5);
      GlyphFX.emit(22, x, y, { color: c.thunderLight, speed: [80, 320], life: [0.15, 0.4], size: [1, 2.5], kind: 'ember', drag: 3 });
      GlyphFX.stain(x, y, 12, '#2e2a4a', 0.2);
    }
    if (s.n >= cfg.boltCount) s.done = true;
  },

  // 折线电光：每帧重新抖动，两层（光晕 + 芯）
  drawZigzag(ctx, pts, alpha, width) {
    const c = CONFIG.GLYPH_COLORS;
    const S = CONFIG.GLYPH_SCALE;
    const path = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (14 * S)));
      for (let k = 1; k < n; k++) {
        const f = k / n;
        path.push({ x: a.x + (b.x - a.x) * f + (Math.random() - 0.5) * 12 * S, y: a.y + (b.y - a.y) * f + (Math.random() - 0.5) * 12 * S });
      }
      path.push(b);
    }
    ctx.save();
    ctx.lineJoin = 'round';
    for (const layer of [{ w: width * 2.6, color: c.thunderGlow, a: 0.5 }, { w: width, color: c.thunderLight, a: 1 }]) {
      ctx.globalAlpha = alpha * layer.a;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = layer.w;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawShot(ctx, s) {
    const S = CONFIG.GLYPH_SCALE;
    const fade = 1 - s.t / s.dur;
    if (s.kind === 'arc') {
      this.drawZigzag(ctx, s.pts, fade, 2.2 * S);
    } else if (s.kind === 'bolt') {
      this.drawZigzag(ctx, [{ x: s.x + 20 * S, y: s.y - 260 * S }, { x: s.x, y: s.y }], fade, 3.5 * S);
      GlyphKit.drawPool(ctx, s.x, s.y, 40 * S, '180,170,250', 0.35 * fade);
    }
  },
};
