// 毛笔笔画渲染（工单 05：照搬原型 brush.js，仅把配色改读 CONFIG.GLYPH_COLORS）：笔画折线 → Catmull-Rom 平滑 → 按笔压生成轮廓填充
// 同一份笔画数据既用于画塔身，也用于取弹道几何（起点、走向、终点）
const Brush = (() => {
  const cache = new Map();

  function catmull(pts, seg) {
    const out = [];
    const p = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function prepare(stroke) {
    if (cache.has(stroke)) return cache.get(stroke);
    const raw = catmull(stroke.pts, 12);
    const pts = [];
    let len = 0;
    raw.forEach((q, i) => {
      if (i > 0) len += Math.hypot(q[0] - raw[i - 1][0], q[1] - raw[i - 1][1]);
      pts.push({ x: q[0], y: q[1], l: len });
    });
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      q.t = len ? q.l / len : 0;
      q.tx = (b.x - a.x) / d; q.ty = (b.y - a.y) / d;
      q.nx = -q.ty; q.ny = q.tx;
    });
    // 飞白丝的位置按笔画 id 固定，避免逐帧闪烁
    let seed = 0;
    for (const ch of stroke.id) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
    const dry = [0, 1, 2].map((k) => ({ off: ((seed * (k + 3)) % 100) / 100 - 0.5, from: 0.45 + k * 0.12 }));
    const info = { pts, len, dry };
    cache.set(stroke, info);
    return info;
  }

  const smooth = (t) => t * t * (3 - 2 * t);

  function widthAt(stroke, t) {
    const [w0, w1, w2] = stroke.w;
    const base = t < 0.5 ? w0 + (w1 - w0) * smooth(t / 0.5) : w1 + (w2 - w1) * smooth((t - 0.5) / 0.5);
    const press = w0 * 0.28 * Math.exp(-(((t - 0.05) / 0.06) ** 2)); // 起笔顿笔
    return Math.max(0.6, base + press);
  }

  function pointAt(stroke, t) {
    const { pts } = prepare(stroke);
    const target = Math.max(0, Math.min(1, t));
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].t >= target) {
        const a = pts[i - 1], b = pts[i];
        const k = (target - a.t) / ((b.t - a.t) || 1);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, tx: b.tx, ty: b.ty };
      }
    }
    const e = pts[pts.length - 1];
    return { x: e.x, y: e.y, tx: e.tx, ty: e.ty };
  }

  // 字身坐标 → 舞台坐标（与 drawStroke 的变换一致）
  function toWorld(p, o) {
    const s = o.size / 100, r = o.rot || 0;
    const lx = (p.x - 50) * s, ly = (p.y - 50) * s;
    return { x: o.x + lx * Math.cos(r) - ly * Math.sin(r), y: o.y + lx * Math.sin(r) + ly * Math.cos(r) };
  }

  function tracePath(ctx, stroke, progress) {
    const { pts } = prepare(stroke);
    const left = [], right = [];
    for (const q of pts) {
      if (q.t > progress) break;
      const w = widthAt(stroke, q.t) / 2;
      left.push([q.x + q.nx * w, q.y + q.ny * w]);
      right.push([q.x - q.nx * w, q.y - q.ny * w]);
    }
    if (left.length < 2) return false;
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    return true;
  }

  function drawStroke(ctx, stroke, o) {
    const progress = o.progress == null ? 1 : o.progress;
    if (progress <= 0.01) return;
    const info = prepare(stroke);
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.size / 100, o.size / 100);
    ctx.translate(-50, -50);
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (!tracePath(ctx, stroke, progress)) { ctx.restore(); return; }
    // 墨晕：先描一圈淡墨
    if (o.wash !== false) {
      ctx.strokeStyle = o.color;
      ctx.globalAlpha *= 0.14;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha /= 0.14;
    }
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 18; }
    ctx.fillStyle = o.color;
    ctx.fill();
    const head = prepare(stroke).pts[0];
    ctx.beginPath();
    ctx.arc(head.x, head.y, widthAt(stroke, 0.02) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 书写中的笔尖：一团略大的湿墨
    if (progress < 1) {
      const tip = pointAt(stroke, progress);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, widthAt(stroke, progress) * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    // 飞白：在笔画后段用纸色划出几条干笔丝
    if (o.dry !== false && progress > 0.5) {
      ctx.strokeStyle = o.paper || CONFIG.GLYPH_COLORS.paper;
      ctx.lineWidth = 0.7;
      ctx.globalAlpha *= 0.6;
      for (const d of info.dry) {
        ctx.beginPath();
        let started = false;
        for (const q of info.pts) {
          if (q.t < d.from || q.t > progress) continue;
          const w = widthAt(stroke, q.t) / 2 * d.off * 1.5;
          const px = q.x + q.nx * w, py = q.y + q.ny * w;
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // styleFn(i, stroke) 返回该笔的覆盖参数，hidden 为真则跳过
  function drawGlyph(ctx, glyph, o, styleFn) {
    glyph.strokes.forEach((stroke, i) => {
      const st = styleFn ? styleFn(i, stroke) : null;
      if (st && st.hidden) return;
      drawStroke(ctx, stroke, Object.assign({}, o, st || {}));
    });
  }

  // 圆相：一笔写成的墨圈，作蓄力环
  function drawRing(ctx, x, y, r, frac, color, width, seed) {
    if (frac <= 0.005) return;
    const a0 = -Math.PI * 0.62;
    const span = Math.PI * 2 * 0.93 * Math.min(1, frac);
    const n = Math.max(10, Math.floor(80 * frac));
    const outer = [], inner = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = a0 + span * t;
      const rr = r * (1 + 0.025 * Math.sin(a * 3 + (seed || 0)));
      const w = width * (0.3 + 0.85 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)));
      outer.push([x + Math.cos(a) * (rr + w / 2), y + Math.sin(a) * (rr + w / 2)]);
      inner.push([x + Math.cos(a) * (rr - w / 2), y + Math.sin(a) * (rr - w / 2)]);
    }
    ctx.beginPath();
    ctx.moveTo(outer[0][0], outer[0][1]);
    outer.forEach((p) => ctx.lineTo(p[0], p[1]));
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // 拖尾：一串点画成从粗到细的锋，用于火星、水箭
  function drawTrail(ctx, pts, width, color, alpha) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d;
      const w = width * (0.15 + 0.85 * (i / (pts.length - 1))) / 2;
      left.push([pts[i].x + nx * w, pts[i].y + ny * w]);
      right.push([pts[i].x - nx * w, pts[i].y - ny * w]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    left.forEach((p) => ctx.lineTo(p[0], p[1]));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();
    const h = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(h.x, h.y, width * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { prepare, widthAt, pointAt, toWorld, drawStroke, drawGlyph, drawRing, drawTrail };
})();
