// 水墨战场画卷：远山 → 雾 → 墨廊 → 妖潮/首领 → 塔字与弹道 → 标题。所有上架美术图共用这一套构图语法，
// 各张图只在 layouts.js 里给出不同的参数（坐标用画布宽高的比例）。
const Tableau = (() => {
  const HORDE = ['尸', '鬼', '骨', '狐', '蛛', '铠', '骑', '巫', '魇', '鲛', '蛙', '龟', '瘴', '饕', '尸', '鬼', '骨', '巨'];

  function title(ctx, W, H, t) {
    const chars = ['墨', '守', '成', '规'], s = t.size;
    const color = t.color || Ink.INK;
    const opt = (i) => ({ color, seed: 300 + i, bleedAlpha: t.bleedAlpha || 0.3, fade: t.fade, streak: t.vertical ? 1.2 : 0.3 });
    // 书写节奏：首字略大，后三字左右轻微错落
    const sizes = [1.16, 1, 1, 1.04], jitter = [0, 0.05, -0.04, 0.03];
    if (t.vertical) {
      let y = t.y;
      chars.forEach((ch, i) => {
        const cs = s * sizes[i];
        Ink.inkChar(ctx, ch, t.x + jitter[i] * s, y + cs * 0.5, cs, opt(i));
        y += cs * (t.gap || 0.98);
      });
      if (t.seal !== false) Ink.seal(ctx, '守', t.x + s * 0.68, y - s * 0.25, s * 0.36, { seed: 77 });
    } else {
      let x = t.x;
      chars.forEach((ch, i) => {
        const cs = s * sizes[i];
        Ink.inkChar(ctx, ch, x + cs * 0.5, t.y + jitter[i] * s, cs, opt(i));
        x += cs * (t.gap || 0.98);
      });
      if (t.seal !== false) Ink.seal(ctx, '守', x + s * 0.12, t.y + s * 0.3, s * 0.36, { seed: 77 });
    }
  }

  function draw(ctx, W, H, L) {
    const P = (p) => ({ x: p[0] * W, y: p[1] * H });
    Ink.paper(ctx, W, H, L.seed || 7);
    if (L.sky) L.sky(ctx, W, H);
    (L.mountains || []).forEach((m) => Ink.mountains(ctx, W, H, { ...m, y0: m.y0 * H, y1: m.y1 * H, amp: m.amp * H,
      x0: m.x0 == null ? null : m.x0 * W, x1: m.x1 == null ? null : m.x1 * W }));
    (L.mist || []).forEach((m) => Ink.mistBand(ctx, W, m[0] * H, m[1] * H, m[2], m[3]));

    // 墨廊与透视：t=0 在远处雾里，t=1 在近景
    const path = Ink.smoothPts(L.path.map(P), 18);
    const [wf, wn] = L.width.map((v) => v * W);
    const widthAt = (t) => wf + (wn - wf) * Math.pow(t, L.widthPow || 1.25);
    Ink.corridor(ctx, path, widthAt, { blur: wn * 0.12, ink: L.corridorInk });
    (L.mistOverPath || []).forEach((m) => Ink.mist(ctx, m[0] * W, m[1] * H, m[2] * W, m[3] * H, m[4]));

    // 妖潮：沿路排开，远处淡而小，近处浓而大；先在路面压一道妖气墨影
    const r = Ink.rng(L.seed + 50);
    const horde = [];
    if (L.horde) {
      const { from, to, count } = L.horde;
      ctx.save(); ctx.filter = `blur(${wn * 0.08}px)`;
      path.forEach((q) => {
        if (q.t < from || q.t > to) return;
        const k = Math.sin((q.t - from) / (to - from) * Math.PI);
        ctx.fillStyle = `rgba(20,18,15,${0.05 * k * (L.horde.shadow || 1)})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, widthAt(q.t) * 0.55, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      // 拒绝采样：互相保持间距、避开首领位置，近处不糊成一团
      const pool = (L.horde.chars || HORDE).filter((ch) => Ink.hasGlyph(ch));
      const bossT = L.boss ? L.boss.t : -1, cap = (L.horde.maxSize || 0.07) * W;
      for (let tries = 0; horde.length < count && tries < count * 40; tries++) {
        const t = from + (to - from) * Math.pow(r(), L.horde.bias || 0.8);
        if (Math.abs(t - bossT) < (L.horde.bossGap || 0.07)) continue;
        const q = Ink.along(path, t), w = widthAt(t);
        const off = (r() - 0.5) * w * 0.55, size = Math.min(cap, w * (0.48 + r() * 0.16));
        const x = q.x - Math.sin(q.ang) * off, y = q.y + Math.cos(q.ang) * off;
        if (horde.some((e) => Math.hypot(e.x - x, e.y - y) < (e.size + size) * 0.42)) continue;
        horde.push({ t, x, y, size, ang: q.ang, ch: pool[Math.floor(r() * pool.length)] });
      }
      horde.sort((a, b) => a.y - b.y);
      horde.forEach((e) => {
        const depth = Math.pow(e.t, 0.7);
        Ink.enemyChar(ctx, e.ch, e.x, e.y, e.size, e.ang + Math.PI * 0, {
          alpha: (0.35 + 0.6 * depth) / (L.horde.soft ? 1.4 : 1), blur: ((1 - depth) * 0.05 + (L.horde.soft ? 0.03 * L.horde.soft : 0)) * e.size, bleedAlpha: 0.4, seed: Math.floor(e.x), ghosts: 2,
          fade: 'rgba(120,108,92,0.45)' });
      });
    }
    // 首领：四字横排，压一层浓墨气，朱砂点睛
    if (L.boss) {
      const b = L.boss, q = Ink.along(path, b.t), w = widthAt(b.t), s = w * (b.scale || 0.95);
      const chars = b.chars.split(''), span = s * 0.92 * chars.length;
      const bx = q.x - span / 2 + s * 0.46 + (b.dx || 0) * W, by = q.y + (b.dy || 0) * H;
      ctx.save(); ctx.globalAlpha = 0.42; ctx.filter = `blur(${s * 0.32}px)`;
      ctx.fillStyle = '#1d1b18'; ctx.beginPath(); ctx.ellipse(bx + span / 2 - s * 0.46, by + s * 0.1, span * 0.62, s * 0.58, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.28; ctx.filter = `blur(${s * 0.2}px)`; ctx.fillStyle = '#b4473a';
      ctx.beginPath(); ctx.ellipse(bx + span / 2 - s * 0.46, by + s * 0.42, span * 0.5, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      chars.forEach((ch, i) => Ink.enemyChar(ctx, ch, bx + i * s * 0.92, by + (i % 2 ? s * 0.04 : -s * 0.03), s, q.ang,
        { seed: 900 + i, bleedAlpha: 0.5, ghosts: 3, color: '#14120f', alpha: b.alpha || 1, fade: 'rgba(90,40,30,0.35)' }));
      horde.boss = { x: bx + span / 2 - s * 0.46, y: by, s };
    }

    // 弹道：从塔飞向敌潮（在塔字之前画，塔字压在出手处）
    const towers = (L.towers || []).map((t) => ({ ...t, x: t.at[0] * W, y: t.at[1] * H, size: t.size * H }));
    (L.shots || []).forEach((s, i) => {
      const tw = towers[s.from];
      let target = s.boss && horde.boss ? horde.boss : horde.filter((e) => e.t > (s.minT || 0.3)).sort((a, b) =>
        Math.hypot(a.x - tw.x, a.y - tw.y) - Math.hypot(b.x - tw.x, b.y - tw.y))[s.nth || 0];
      if (!target) return;
      const tx = target.x + (s.dx || 0) * W, ty = target.y + (s.dy || 0) * H;
      const col = CONFIG.GLYPH_COLORS;
      if (s.kind === 'thunder') {
        bolt(ctx, tw.x, tw.y - tw.size * 0.2, tx, ty, tw.size * 0.06, col.thunder, col.thunderGlow, L.seed + i);
      } else if (s.stroke != null) {
        const pts = Ink.arcPts(tw.x, tw.y, tx, ty, s.bend || 0.2, 30, s.from0 || 0.15, s.to || 0.9);
        Ink.strokeShot(ctx, tw.type, s.stroke, pts, tw.size * (s.scale || 0.3), { trail: s.trail ? col[s.trail] : null });
        if (s.hit) Ink.splash(ctx, tx, ty, Math.atan2(ty - tw.y, tx - tw.x), tw.size * 0.05, { color: col[tw.type], alpha: 0.6, seed: 40 + i, drops: 10 });
      } else {
        const color = col[s.kind] || col.fire, glow = col[s.kind + 'Glow'];
        const pts = Ink.arcPts(tw.x, tw.y, tx, ty, s.bend || 0.2, 30, s.from0 || 0.35, s.to || 0.92);
        Ink.trail(ctx, pts, (s.width || 0.08) * tw.size, s.kind === 'fire' ? col.fireHot : color, glow, 0.95);
        if (s.hit) Ink.splash(ctx, tx, ty, Math.atan2(ty - tw.y, tx - tw.x), tw.size * 0.06, { color, alpha: 0.7, seed: 40 + i, drops: 10 });
      }
    });
    towers.forEach((t) => Ink.towerGlyph(ctx, t.type, t.x, t.y, t.size, t));
    (L.splashes || []).forEach((s, i) => Ink.splash(ctx, s[0] * W, s[1] * H, s[2], s[3] * H, { seed: 60 + i, alpha: s[4] || 0.85, color: s[5] }));
    (L.fore || []).forEach((f, i) => {
      if (f.kind === 'rock') Ink.rock(ctx, f.at[0] * W, f.at[1] * H, f.w * H, f.h * H, { seed: 70 + i, ink: f.ink });
      else Ink.orchid(ctx, f.at[0] * W, f.at[1] * H, f.h * H, { seed: 80 + i, lean: f.lean, blades: f.blades, color: f.color });
    });
    if (L.vignette !== false) Ink.vignette(ctx, W, H, L.vignette || 0.2);
    if (L.title && L.title.wash) {   // 标题下的一抹淡墨，托住字
      const t = L.title, x = t.x * W, y = t.y * H, s = t.size * H;
      ctx.save(); ctx.globalAlpha = t.wash; ctx.filter = `blur(${s * 0.5}px)`; ctx.fillStyle = '#6b6458';
      ctx.beginPath(); t.vertical ? ctx.ellipse(x + s * 0.1, y + s * 2.1, s * 0.75, s * 2.3, 0.05, 0, Math.PI * 2) : ctx.ellipse(x + s * 2.1, y, s * 2.4, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
    if (L.title) title(ctx, W, H, { ...L.title, x: L.title.x * W, y: L.title.y * H, size: L.title.size * H });
  }

  // 雷：折线电光，主干 + 分叉，带光晕
  function bolt(ctx, x0, y0, x1, y1, w, color, glow, seed) {
    const r = Ink.rng(seed), pts = [[x0, y0]], n = 9;
    for (let i = 1; i < n; i++) {
      const t = i / n, j = (r() - 0.5) * Math.hypot(x1 - x0, y1 - y0) * 0.12;
      pts.push([x0 + (x1 - x0) * t - (y1 - y0) / Math.hypot(x1 - x0, y1 - y0) * j, y0 + (y1 - y0) * t + (x1 - x0) / Math.hypot(x1 - x0, y1 - y0) * j]);
    }
    pts.push([x1, y1]);
    const line = (lw, c, blur, a) => {
      ctx.save(); ctx.globalAlpha = a; if (blur) ctx.filter = `blur(${blur}px)`;
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
    };
    line(w * 3, glow, w * 2, 0.9); line(w, color, 0, 1); line(w * 0.35, '#f4f1ff', 0, 0.9);
  }

  return { draw, title };
})();
