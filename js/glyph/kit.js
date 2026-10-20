// 字形招式共用工具（2026-10-20 十一塔批次）
//
// 新塔的招式反复用到同几件事：在射程内挑敌群最密的路段、按笔顺消耗一组笔画、
// 抛物飞行、把单笔旋转后画在弹道位置、沿路取一段里程上的敌人。集中在这里，
// 各塔文件只写自己的招式。火、水沿用各自的原版实现，不改走这里。
const GlyphKit = {
  // 射程内敌群最密的路段落点：{ x, y, ang, s, track } 或 null
  // opts.radius 评分半径；opts.avoid = { x, y, r } 排除离该点 r 以内的落点（炎的第二落点）
  densest(t, opts = {}) {
    const cfg = t.gl.cfg;
    const game = t.game;
    const reach = cfg.range * (cfg.landRangeMul || 1);
    const r = opts.radius || cfg.range * 0.4;
    const step = cfg.landStep || 12;
    const minS = cfg.landMinS || 0;
    const avoid = opts.avoid;
    let best = null;
    let bestScore = 0;
    for (const track of GlyphWorld.tracks(game)) {
      const from = track.loop ? 0 : minS;
      const to = track.loop ? track.total : track.total - 40 * CONFIG.GLYPH_SCALE;
      for (const p of track.sample(step, from, to)) {
        if (Math.hypot(p.x - t.x, p.y - t.y) > reach) continue;
        if (avoid && Math.hypot(p.x - avoid.x, p.y - avoid.y) < avoid.r) continue;
        let score = 0;
        for (const e of GlyphWorld.enemiesInRange(game, p.x, p.y, r)) score += e.weight;
        if (score > bestScore) { bestScore = score; best = p; best.track = track; }
      }
    }
    return best;
  },

  // 离 (x, y) 最近的路径：{ track, s }
  nearestTrack(game, x, y) {
    let best = null;
    for (const track of GlyphWorld.tracks(game)) {
      const s = track.nearestS(x, y);
      const p = track.pointAt(s);
      const d = Math.hypot(p.x - x, p.y - y);
      if (!best || d < best.d) best = { track, s, d };
    }
    return best;
  },

  // 里程归一：环形路径（征服）取模，直路夹到 [0, total]
  wrapS(track, s) {
    if (track.loop) return ((s % track.total) + track.total) % track.total;
    return Math.max(0, Math.min(track.total, s));
  },

  // 沿路有向距离 b − a；环形路径取绝对值较短的那一圈
  pathDelta(track, a, b) {
    let d = b - a;
    if (track.loop) {
      const T = track.total;
      d = ((d % T) + T * 1.5) % T - T / 2;
    }
    return d;
  },

  // 走在 track 上、沿路距离 s0 在 [−back, front] 以内的存活敌人（不含被浪卷走的）
  alongTrack(game, track, s0, back, front) {
    const out = [];
    const f = front == null ? back : front;
    for (const e of game.enemies) {
      if (e.dead || e.carried || e.track !== track) continue;
      const d = this.pathDelta(track, s0, e.s);
      if (d >= -back && d <= f) out.push(e);
    }
    return out;
  },

  // 整字大招：按笔顺把 idx 中的笔画全部消耗，delay 秒后在 total 秒内依次写回
  consumeAll(t, delay, total, idx) {
    const list = idx || t.gl.glyph.strokes.map((_, i) => i);
    const step = total / list.length;
    list.forEach((i, k) => GlyphTower.consume(t, i, delay + k * step, step));
  },

  // 射程内满足 pick 评分最高的敌人；pick(e) 返回分数
  best(pool, pick) {
    let out = null;
    let score = -Infinity;
    for (const e of pool) {
      const v = pick(e);
      if (v > score) { score = v; out = e; }
    }
    return out;
  },

  // 抛物弹道推进：s 带 sx, sy, tx, ty, t, dur；返回进度 k（0..1）
  lob(s, dt, arc) {
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k;
    s.y = s.sy + (s.ty - s.sy) * k - Math.sin(Math.PI * k) * arc;
    return k;
  },

  // 直线弹道推进 + 拖尾；越界或寿命到返回 true
  fly(s, dt, trailLen) {
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.trail) {
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > (trailLen || 8)) s.trail.shift();
    }
    const b = GlyphWorld.bounds(s.game);
    return s.life <= 0 || s.x < -50 || s.x > b.w + 50 || s.y < -50 || s.y > b.h + 50;
  },

  // 半径 r 内、第一个碰到的敌人（不在 skip 里）
  touch(s, r, skip) {
    for (const e of GlyphWorld.enemiesInRange(s.game, s.x, s.y, r + 40)) {
      if (skip && skip.has(e)) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) <= r + e.size * 0.4) return e;
    }
    return null;
  },

  // 把塔身第 i 笔画在 (x, y)：ang 为飞行方向（笔画走向对齐它），rot 不为空时直接按 rot 旋转
  drawStrokeAt(ctx, gl, i, x, y, o) {
    const stroke = gl.glyph.strokes[i];
    const info = Brush.prepare(stroke);
    const mid = info.pts[Math.floor(info.pts.length / 2)];
    const head = info.pts[0];
    const tail = info.pts[info.pts.length - 1];
    const strokeAng = Math.atan2(tail.y - head.y, tail.x - head.x);
    const size = gl.size * (o.scale || 1);
    const k = size / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot != null ? o.rot : o.ang - strokeAng);
    Brush.drawStroke(ctx, stroke, {
      x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color: o.color, glow: o.glow,
      glowBlur: o.glowBlur || 10, alpha: o.alpha, dry: false,
    });
    ctx.restore();
  },

  // 抛物飞行中的整字：地面影子 + 字
  drawLobGlyph(ctx, s, glyph, size, color, glow) {
    const S = CONFIG.GLYPH_SCALE;
    const f = Math.min(1, s.t / s.dur);
    const gx = s.sx + (s.tx - s.sx) * f;
    const gy = s.sy + (s.ty - s.sy) * f;
    const sc = s.scale || 1;
    ctx.fillStyle = 'rgba(40,30,20,0.15)';
    ctx.beginPath();
    ctx.ellipse(gx, gy + 10 * S, 30 * S * sc, 9 * S * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    Brush.drawGlyph(ctx, glyph, { x: s.x, y: s.y, size: size * sc, rot: s.rot || 0, color, glow, glowBlur: 22 });
  },

  // 地面圆形淡晕（陷坑、旋风、林地等）；k 为 0..1 的消退进度
  drawPool(ctx, x, y, r, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.7, `rgba(${rgb},${alpha * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  // 沿路一段 [s0, s1] 画一条带状淡色（藤蔓、燎原、箭雨的地面范围）
  drawBand(ctx, track, s0, s1, width, color) {
    const S = CONFIG.GLYPH_SCALE;
    const step = 10 * S;
    ctx.fillStyle = color;
    const from = track.loop ? s0 : Math.max(0, s0);
    const to = track.loop ? s1 : Math.min(track.total, s1);
    for (let s = from; s <= to; s += step) {
      const p = track.pointAt(this.wrapS(track, s));
      ctx.beginPath();
      ctx.arc(p.x, p.y, width, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
