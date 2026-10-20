// 上架素材水墨渲染套件：宣纸、远山、雾、路廊、泼墨、朱印、标题书法、塔字与敌人字
// 规范见 docs/上架素材美术规范.md。塔字一律走游戏自身的 CONFIG.GLYPHS + Brush，与实机一致。
const Ink = (() => {
  const C = () => CONFIG.GLYPH_COLORS;
  const PAPER = '#f4efe4';
  const INK = '#1d1b18';
  const BRUSH_FONT = '"Ma Shan Zheng", "ZCOOL XiaoWei", serif';

  function rng(seed) {
    let a = (seed || 1) >>> 0;
    return () => {
      a += 0x6D2B79F5; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // 1D 分形噪声（山脊用）
  function ridgeNoise(r, n) {
    const oct = [];
    for (let o = 0; o < 5; o++) oct.push(Array.from({ length: (4 << o) + 2 }, r));
    return (x) => {
      let v = 0, amp = 1, tot = 0;
      oct.forEach((arr, o) => {
        const f = x * (arr.length - 2), i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t);
        v += (arr[i] * (1 - s) + arr[i + 1] * s) * amp; tot += amp; amp *= 0.5;
      });
      return v / tot;
    };
  }

  /* ---------- 宣纸 ---------- */
  function paper(ctx, W, H, seed = 7, tone = PAPER) {
    const r = rng(seed);
    ctx.fillStyle = tone; ctx.fillRect(0, 0, W, H);
    // 低频茶渍：大而淡的暖色斑
    const k = Math.sqrt(W * H) / 1440;
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, rad = (160 + r() * 520) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const warm = r() < 0.6;
      g.addColorStop(0, warm ? `rgba(176,146,98,${0.035 + r() * 0.04})` : `rgba(255,253,246,${0.08 + r() * 0.08})`);
      g.addColorStop(1, 'rgba(176,146,98,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // 细纤维噪点：逐像素亮度扰动 + 少量深色杂质
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const n = (r() - 0.5) * 9 + (r() < 0.0012 ? -40 * r() : 0);
      d[p] += n; d[p + 1] += n; d[p + 2] += n * 0.92;
    }
    ctx.putImageData(img, 0, 0);
    // 长纤维丝
    ctx.save(); ctx.lineCap = 'round';
    const fibers = Math.round(W * H / 2600);
    for (let i = 0; i < fibers; i++) {
      const x = r() * W, y = r() * H, len = (6 + r() * 26) * Math.max(1, k * 0.8), a = r() * Math.PI * 2;
      const bend = (r() - 0.5) * len * 0.6;
      ctx.strokeStyle = r() < 0.5 ? `rgba(120,100,70,${0.05 + r() * 0.07})` : `rgba(255,255,250,${0.18 + r() * 0.2})`;
      ctx.lineWidth = 0.4 + r() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * len / 2 - Math.sin(a) * bend, y + Math.sin(a) * len / 2 + Math.cos(a) * bend,
        x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function vignette(ctx, W, H, strength = 0.2, cx = 0.5, cy = 0.5) {
    const R = Math.hypot(W, H) * 0.62;
    const g = ctx.createRadialGradient(W * cx, H * cy, R * 0.35, W * cx, H * cy, R);
    g.addColorStop(0, 'rgba(120,96,60,0)');
    g.addColorStop(1, `rgba(120,96,60,${strength})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 远山：层层淡墨 ---------- */
  // o: { y0, y1（山脚雾线）, amp, x0, x1, seed, ink(0..1), blur, peaks, tint }
  function mountains(ctx, W, H, o) {
    const r = rng(o.seed || 3), nz = ridgeNoise(r);
    const x0 = o.x0 == null ? -20 : o.x0, x1 = o.x1 == null ? W + 20 : o.x1;
    const ys = [];
    const step = Math.max(2, W / 900);
    for (let x = x0; x <= x1; x += step) {
      const u = (x - x0) / (x1 - x0);
      let h = nz(u * (o.freq || 1));
      // 主峰：用高斯包络抬起几座峰，避免山脊太平
      (o.peaks || []).forEach(([px, ph, pw]) => { h += ph * Math.exp(-(((u - px) / pw) ** 2)); });
      ys.push([x, o.y0 - h * o.amp]);
    }
    const layer = canvas(W, H), c = layer.getContext('2d');
    const tint = o.tint || '30,27,22';
    const g = c.createLinearGradient(0, o.y0 - o.amp * 1.4, 0, o.y1);
    g.addColorStop(0, `rgba(${tint},${o.ink})`);
    g.addColorStop(0.45, `rgba(${tint},${o.ink * 0.55})`);
    g.addColorStop(1, `rgba(${tint},0)`);
    c.beginPath(); c.moveTo(x0, o.y1 + 40);
    ys.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(x1, o.y1 + 40); c.closePath();
    c.fillStyle = g; c.fill();
    // 山脊皴笔：沿脊线一道浓一些的墨，宽度随噪声起伏
    c.lineCap = 'round';
    for (let i = 1; i < ys.length; i++) {
      const w = (o.crest || 3) * (0.4 + nz(i / ys.length * 3) * 1.2);
      c.strokeStyle = `rgba(${tint},${o.ink * 0.9})`;
      c.lineWidth = w;
      c.beginPath(); c.moveTo(ys[i - 1][0], ys[i - 1][1] + w * 0.3); c.lineTo(ys[i][0], ys[i][1] + w * 0.3); c.stroke();
    }
    // 皴擦：脊线下方的短斜笔，表现山体
    const strokes = Math.round((x1 - x0) / 9 * (o.texture == null ? 1 : o.texture));
    for (let i = 0; i < strokes; i++) {
      const j = Math.floor(r() * ys.length), [x, y] = ys[j];
      const dy = r() * o.amp * 0.9, len = 6 + r() * 22;
      c.strokeStyle = `rgba(${tint},${o.ink * (0.15 + r() * 0.35) * (1 - dy / (o.amp * 1.1))})`;
      c.lineWidth = 0.8 + r() * 2;
      c.beginPath(); c.moveTo(x, y + dy); c.lineTo(x - len * 0.5, y + dy + len * 0.8); c.stroke();
    }
    mottle(layer, (o.seed || 3) + 100, o.mottle == null ? 0.55 : o.mottle, 5);
    ctx.save();
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
    return ys;
  }

  // 雾：纸色的柔团，压在山脚与远景上
  function mist(ctx, x, y, w, h, alpha = 0.8, color = '244,239,228') {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(0.6, `rgba(${color},${alpha * 0.55})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function mistBand(ctx, W, y, h, alpha = 0.85, seed = 5) {
    const r = rng(seed);
    for (let x = -W * 0.1; x < W * 1.1; x += h * (0.8 + r() * 1.4)) {
      if (r() < 0.3) continue;   // 雾有断处，避免一道横贯的白带
      mist(ctx, x + r() * h * 0.5, y + (r() - 0.5) * h * 0.9, h * (1.6 + r() * 2), h * (0.6 + r() * 0.7), alpha * (0.45 + r() * 0.55));
    }
  }

  /* ---------- 路廊：游戏的三层淡墨廊道 ---------- */
  function smoothPts(pts, seg = 16) {
    const out = [], p = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(p[i - 1].x, p[i].x, p[i + 1].x, p[i + 2].x), y: f(p[i - 1].y, p[i].y, p[i + 1].y, p[i + 2].y) });
      }
    }
    out.push(pts[pts.length - 1]);
    let L = 0; out.forEach((q, i) => { if (i) L += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y); q.l = L; });
    out.forEach((q) => { q.t = q.l / L; });
    return out;
  }
  function along(path, t) {
    for (let i = 1; i < path.length; i++) {
      if (path[i].t >= t) {
        const a = path[i - 1], b = path[i], k = (t - a.t) / ((b.t - a.t) || 1);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
      }
    }
    const e = path[path.length - 1]; return { x: e.x, y: e.y, ang: 0 };
  }
  /* ---------- 云纹噪声：多尺度随机格放大叠加，给墨面加浓淡 ---------- */
  function cloud(W, H, seed, cell = 6, contrast = 1) {
    const r = rng(seed), out = canvas(W, H), o = out.getContext('2d');
    o.fillStyle = '#808080'; o.fillRect(0, 0, W, H);
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    let amp = 0.5;
    for (let s = cell; s < Math.max(W, H) / 2; s *= 2) {
      const gw = Math.ceil(W / (Math.max(W, H) / s)) + 2, gh = Math.ceil(H / (Math.max(W, H) / s)) + 2;
      const g = canvas(gw, gh), gc = g.getContext('2d'), img = gc.createImageData(gw, gh);
      for (let p = 0; p < img.data.length; p += 4) { const v = r() * 255; img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255; }
      gc.putImageData(img, 0, 0);
      o.globalAlpha = amp * contrast; o.drawImage(g, -W / gw, -H / gh, W * (gw / (gw - 2)), H * (gh / (gh - 2)));
      amp *= 0.62;
    }
    return out;
  }
  // 用云纹给 layer 的不透明区做浓淡（保留形状，只调透明度）
  function mottle(layer, seed, strength = 0.6, cell = 6) {
    const c = layer.getContext('2d'), n = cloud(layer.width, layer.height, seed, cell, 1.6);
    const nd = n.getContext('2d').getImageData(0, 0, n.width, n.height).data;
    const img = c.getImageData(0, 0, layer.width, layer.height), d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      if (!d[p + 3]) continue;
      const v = nd[p] / 255;   // 0..1，均值约 0.5
      d[p + 3] = Math.max(0, Math.min(255, d[p + 3] * (1 - strength + strength * 2 * v)));
    }
    c.putImageData(img, 0, 0);
    return layer;
  }

  // widthAt(t) 给出 t 处路宽（远小近大）。路是一道淡墨扫出的廊：中间浅、两侧干笔、远处融进雾
  function corridor(ctx, path, widthAt, o = {}) {
    const ink = o.ink == null ? 1 : o.ink;
    const W = ctx.canvas.width, H = ctx.canvas.height, layer = canvas(W, H), c = layer.getContext('2d');
    const solid = (scale, color) => {
      c.fillStyle = color;
      path.forEach((q) => { c.beginPath(); c.arc(q.x, q.y, widthAt(q.t) * scale / 2, 0, Math.PI * 2); c.fill(); });
    };
    // 外晕
    solid(1.35, '#1e1b16');
    ctx.save(); ctx.globalAlpha = 0.06 * ink; ctx.filter = `blur(${o.blur || 10}px)`; ctx.drawImage(layer, 0, 0); ctx.restore();
    // 廊面：云纹浓淡 + 中间提亮，近处更浓
    c.clearRect(0, 0, W, H);
    path.forEach((q) => { c.fillStyle = `rgba(30,27,22,${0.35 + 0.65 * q.t})`; c.beginPath(); c.arc(q.x, q.y, widthAt(q.t) / 2, 0, Math.PI * 2); c.fill(); });
    c.globalCompositeOperation = 'destination-out'; solid(0.55, 'rgba(0,0,0,0.5)'); c.globalCompositeOperation = 'source-over';
    mottle(layer, o.seed || 31, 0.75, 5);
    ctx.save(); ctx.globalAlpha = 0.2 * ink; ctx.filter = 'blur(1.5px)'; ctx.drawImage(layer, 0, 0); ctx.restore();
    // 两侧干笔：多条细丝沿边缘走，偶尔断开，远处更淡
    const r = rng(o.seed || 31);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const off = 0.42 + r() * 0.14, gaps = [[r(), 0.03 + r() * 0.07], [r(), 0.02 + r() * 0.05]];
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i];
          if (gaps.some(([g0, gl]) => b.t > g0 && b.t < g0 + gl)) continue;
          const nx = -(b.y - a.y), ny = b.x - a.x, d = Math.hypot(nx, ny) || 1;
          const wa = widthAt(a.t) * off * side, wb = widthAt(b.t) * off * side;
          ctx.strokeStyle = `rgba(30,27,22,${(0.04 + 0.22 * b.t) * ink * (k ? 0.55 : 1)})`;
          ctx.lineWidth = (k ? 0.5 : 0.9) + (k ? 1.2 : 2.6) * b.t * (o.lineScale || 1);
          ctx.beginPath(); ctx.moveTo(a.x + nx / d * wa, a.y + ny / d * wa); ctx.lineTo(b.x + nx / d * wb, b.y + ny / d * wb); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  /* ---------- 近景：山石与兰草（地图点景同款，放大为前景） ---------- */
  function rock(ctx, x, y, w, h, o = {}) {
    // 轮廓：极坐标噪声 + 平滑，底边压平；左上受光、右下积墨
    const r = rng(o.seed || 71), n = 48, raw = [];
    const bumps = Array.from({ length: 7 }, () => r());
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI, u = i / n;
      const k = bumps[Math.floor(u * 6)] * (1 - (u * 6 % 1)) + bumps[Math.floor(u * 6) + 1] * (u * 6 % 1);
      const rr = 0.78 + k * 0.32;
      raw.push([x + Math.cos(a) * w / 2 * rr, y + Math.sin(a) * h * rr]);
    }
    const layer = canvas(w * 1.4, h * 1.6), c = layer.getContext('2d'), ox = x - w * 0.7, oy = y - h * 1.45;
    c.translate(-ox, -oy);
    const ink = o.ink || 0.75;
    const g = c.createLinearGradient(x - w / 2, y - h, x + w * 0.3, y);
    g.addColorStop(0, `rgba(30,27,22,${ink * 0.18})`); g.addColorStop(0.5, `rgba(30,27,22,${ink * 0.5})`); g.addColorStop(1, `rgba(30,27,22,${ink * 0.85})`);
    c.beginPath(); raw.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    c.fillStyle = g; c.fill();
    c.save(); c.clip(); c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {   // 披麻皴：顺着石势的弧笔
      const px = x - w * 0.5 + r() * w, py = y - h * (0.05 + r() * 0.95), len = h * (0.12 + r() * 0.3);
      c.strokeStyle = `rgba(30,27,22,${0.08 + r() * 0.3})`; c.lineWidth = 0.8 + r() * w * 0.008;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + len * 0.25, py + len * 0.5, px + len * 0.05, py + len); c.stroke();
    }
    c.restore();
    c.strokeStyle = `rgba(25,22,18,${ink})`; c.lineCap = 'round';
    for (let i = 1; i < raw.length * 0.75; i++) {   // 轮廓干笔：左上实、往右渐虚
      c.lineWidth = Math.max(1.2, w * 0.02 * (1 - i / raw.length));
      c.beginPath(); c.moveTo(raw[i - 1][0], raw[i - 1][1]); c.lineTo(raw[i][0], raw[i][1]); c.stroke();
    }
    mottle(layer, (o.seed || 71) + 3, 0.6, 4);
    ctx.drawImage(layer, ox, oy);
  }
  function orchid(ctx, x, y, h, o = {}) {
    const r = rng(o.seed || 81), n = o.blades || 7;
    ctx.save(); ctx.fillStyle = o.color || 'rgba(29,27,24,0.85)';
    for (let i = 0; i < n; i++) {
      const lean = (o.lean || 0) + (r() - 0.5) * 1.6, len = h * (0.55 + r() * 0.5);
      const tx = x + Math.sin(lean) * len, ty = y - Math.cos(lean) * len * 0.8;
      const cx1 = x + Math.sin(lean * 0.4) * len * 0.5, cy1 = y - len * 0.75;
      const w = h * (0.018 + r() * 0.012);
      // 一片兰叶：起笔细、中段宽、收笔出锋
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, y);
      ctx.quadraticCurveTo(cx1 - w * 1.4, cy1, tx, ty);
      ctx.quadraticCurveTo(cx1 + w * 1.4, cy1 + w, x + w * 0.3, y);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 泼墨 ---------- */
  function blot(ctx, x, y, rad, r, color) {
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, rr = rad * (0.75 + r() * 0.5);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.fillStyle = color; ctx.fill();
  }
  function splash(ctx, x, y, ang, size, o = {}) {
    const r = rng(o.seed || 11), color = o.color || INK, a0 = o.alpha == null ? 0.85 : o.alpha;
    ctx.save();
    ctx.globalAlpha = a0 * 0.25; ctx.filter = `blur(${size * 0.15}px)`;
    blot(ctx, x, y, size * 1.15, r, color);
    ctx.filter = 'none'; ctx.globalAlpha = a0;
    blot(ctx, x, y, size, r, color);
    // 溅点：沿方向成簇，越远越小
    const n = o.drops || 14;
    for (let i = 0; i < n; i++) {
      const dist = size * (1.2 + r() * 3.4), spread = (r() - 0.5) * 0.9;
      const s = size * (0.04 + (1 - dist / (size * 4.6)) * 0.22 * r());
      const px = x + Math.cos(ang + spread) * dist, py = y + Math.sin(ang + spread) * dist;
      blot(ctx, px, py, Math.max(0.8, s), r, color);
      // 拖尾：溅点与主墨团之间的细丝
      if (r() < 0.35) {
        ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.6, s * 0.5); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(ang + spread) * s * 4, py - Math.sin(ang + spread) * s * 4); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- 斑驳蒙版：给印章、标题做颗粒与干笔 ---------- */
  function grain(c, w, h, seed, amount, streakAng) {
    const r = rng(seed);
    c.save(); c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < amount; i++) {
      const x = r() * w, y = r() * h, s = 0.4 + r() * 1.6;
      c.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.6})`;
      c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
    }
    if (streakAng != null) {
      c.lineCap = 'round';
      for (let i = 0; i < amount / 10; i++) {
        const x = r() * w, y = r() * h, len = w * (0.04 + r() * 0.12);
        c.strokeStyle = `rgba(0,0,0,${0.12 + r() * 0.3})`; c.lineWidth = 0.5 + r() * 1.4;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(streakAng) * len, y + Math.sin(streakAng) * len); c.stroke();
      }
    }
    c.restore();
  }

  /* ---------- 朱印（朱文方印，与主菜单「守」印一致） ---------- */
  function seal(ctx, ch, x, y, size, o = {}) {
    const pad = size * 0.2, cv = canvas(size + pad * 2, size + pad * 2), c = cv.getContext('2d');
    const color = o.color || C().seal;
    c.translate(pad, pad);
    c.strokeStyle = color; c.lineWidth = size * 0.075; c.lineJoin = 'round';
    const r = rng(o.seed || 21), j = () => (r() - 0.5) * size * 0.025;
    c.beginPath(); c.moveTo(j(), j()); c.lineTo(size + j(), j()); c.lineTo(size + j(), size + j()); c.lineTo(j(), size + j()); c.closePath(); c.stroke();
    c.fillStyle = color; c.font = `${size * 0.78}px ${BRUSH_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, size / 2, size * 0.53);
    grain(c, size, size, (o.seed || 21) + 1, size * 4, null);
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot == null ? -0.06 : o.rot);
    ctx.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
    ctx.drawImage(cv, -size / 2 - pad, -size / 2 - pad);
    ctx.restore();
  }

  /* ---------- 书法字（标题、敌人） ---------- */
  // 字体是否真的含这个字：与两种不同回退字体的渲染结果都一致才算缺字
  const glyphCache = {};
  function hasGlyph(ch, family = 'Ma Shan Zheng') {
    const key = family + ch;
    if (key in glyphCache) return glyphCache[key];
    const c = canvas(64, 64).getContext('2d');
    const sig = (font) => { c.clearRect(0, 0, 64, 64); c.font = `48px ${font}`; c.fillText(ch, 4, 52); return c.getImageData(0, 0, 64, 64).data.join(''); };
    const ok = sig(`"${family}", monospace`) !== sig('monospace') && sig(`"${family}", serif`) !== sig('serif');
    return (glyphCache[key] = ok);
  }
  // 把单字写到离屏：墨色深浅随笔势变化 + 干笔颗粒
  function charLayer(ch, size, o) {
    const pad = size * 0.25, cv = canvas(size + pad * 2, size * 1.1 + pad * 2), c = cv.getContext('2d');
    c.font = `${size}px ${o.font || BRUSH_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = o.color || INK;
    c.fillText(ch, cv.width / 2, cv.height / 2);
    if (o.tone !== false) {
      // 浓淡：右下的收笔略淡，模拟墨将尽
      c.globalCompositeOperation = 'source-atop';
      const g = c.createLinearGradient(pad, pad, cv.width - pad, cv.height - pad);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, o.fade || 'rgba(110,100,86,0.35)');
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      c.globalCompositeOperation = 'source-over';
    }
    if (o.dry !== false) grain(c, cv.width, cv.height, o.seed || ch.charCodeAt(0), size * 2.2, o.streak == null ? 0.35 : o.streak);
    return { cv, pad };
  }
  // 洇墨：先画放大模糊的晕边，再画实字
  function inkChar(ctx, ch, x, y, size, o = {}) {
    const { cv } = charLayer(ch, size, o);
    ctx.save();
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    const a = o.alpha == null ? 1 : o.alpha;
    if (o.bleed !== false) {
      ctx.globalAlpha = a * (o.bleedAlpha || 0.32);
      ctx.filter = `blur(${size * (o.bleedR || 0.025)}px)`;
      ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    }
    if (o.blur) ctx.filter = `blur(${o.blur}px)`; else ctx.filter = 'none';
    ctx.globalAlpha = a;
    ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    ctx.restore();
  }
  // 敌人字：残影拖尾（沿行进反方向）+ 主体
  function enemyChar(ctx, ch, x, y, size, ang, o = {}) {
    const ghosts = o.ghosts == null ? 3 : o.ghosts;
    for (let i = ghosts; i >= 1; i--) {
      inkChar(ctx, ch, x - Math.cos(ang) * size * 0.22 * i, y - Math.sin(ang) * size * 0.22 * i, size,
        { ...o, alpha: (o.alpha == null ? 1 : o.alpha) * 0.12 * (ghosts + 1 - i) / ghosts, blur: size * 0.03 * i, bleed: false, dry: false });
    }
    inkChar(ctx, ch, x, y, size, o);
  }

  /* ---------- 塔字（游戏 Brush 笔画） ---------- */
  function towerGlyph(ctx, type, x, y, size, o = {}) {
    const glyph = CONFIG.GLYPHS[type], col = C();
    const color = o.color || col[type] || INK;
    const glow = o.glow === false ? null : (o.glow || col[type + 'Glow']);
    const draw = (c, extra) => Brush.drawGlyph(c, glyph, { x, y, size, color, paper: o.paper || PAPER, glowBlur: size * 0.12, ...extra },
      (i) => {
        if (o.hide && o.hide.includes(i)) return { hidden: true };   // 已射出的笔画（实机：普攻消耗笔画）
        if (o.rewrite && o.rewrite[i] != null) return { progress: o.rewrite[i] };   // 正在写回的笔画
        return o.progress == null ? null : { progress: Math.max(0, Math.min(1, o.progress * glyph.strokes.length - i)) };
      });
    ctx.save();
    // 底下的「气」：纸白的留白光团，让塔字跳出背景
    if (o.halo !== false) mist(ctx, x, y, size * 2.1, size * 1.9, o.haloAlpha || 0.75, '250,247,238');
    // 光晕（火、雷等），用 screen 叠一层大模糊
    if (glow) {
      ctx.save(); ctx.globalAlpha = o.glowAlpha || 0.55; ctx.filter = `blur(${size * 0.09}px)`;
      draw(ctx, { wash: false, dry: false, glow: null, color: glow.replace(/[\d.]+\)$/, '1)') });
      ctx.restore();
    }
    // 洇边
    ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = `blur(${size * 0.018}px)`;
    draw(ctx, { dry: false }); ctx.restore();
    // 圆相蓄力环（实机同款）
    if (o.ring) Brush.drawRing(ctx, x, y, size * CONFIG.GLYPH_TOWER.ringRadius, o.ring, `rgba(29,27,24,${o.ringAlpha || 0.55})`, size * 0.035, 1.3);
    draw(ctx, {});
    ctx.restore();
  }

  // 弹道拖尾（火星、水箭）：Brush.drawTrail + 光晕
  function trail(ctx, pts, width, color, glow, alpha = 1) {
    if (glow) { ctx.save(); ctx.filter = `blur(${width * 0.9}px)`; Brush.drawTrail(ctx, pts, width * 2.2, glow, alpha * 0.8); ctx.restore(); }
    Brush.drawTrail(ctx, pts, width, color, alpha);
  }
  // 笔画弹道：拖尾 + 笔画本身沿飞行方向旋转（照搬 js/glyph/fire.js 的 drawShot）
  function strokeShot(ctx, type, idx, pts, glyphSize, o = {}) {
    const col = C(), stroke = CONFIG.GLYPHS[type].strokes[idx];
    const color = o.color || col[type], glow = o.glow || col[type + 'Glow'];
    const head = pts[pts.length - 1], prev = pts[pts.length - 3] || pts[0];
    ctx.save(); ctx.filter = `blur(${glyphSize * 0.05}px)`;
    Brush.drawTrail(ctx, pts, glyphSize * 0.16, o.trail || col.fireHot, 0.35); ctx.restore();
    Brush.drawTrail(ctx, pts, glyphSize * 0.07, o.trail || col.fireHot, 0.6);
    const info = Brush.prepare(stroke), mid = info.pts[Math.floor(info.pts.length / 2)];
    const a = info.pts[0], b = info.pts[info.pts.length - 1];
    const size = glyphSize * (o.scale || 1.35), k = size / 100;
    ctx.save(); ctx.translate(head.x, head.y);
    ctx.rotate(Math.atan2(head.y - prev.y, head.x - prev.x) - Math.atan2(b.y - a.y, b.x - a.x));
    Brush.drawStroke(ctx, stroke, { x: (50 - mid.x) * k, y: (50 - mid.y) * k, size, color, glow, glowBlur: glyphSize * 0.08, dry: false });
    ctx.restore();
  }
  function arcPts(x0, y0, x1, y1, bend, n = 24, from = 0, to = 1) {
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend, out = [];
    for (let i = 0; i <= n; i++) {
      const t = from + (to - from) * i / n, u = 1 - t;
      out.push({ x: u * u * x0 + 2 * u * t * mx + t * t * x1, y: u * u * y0 + 2 * u * t * my + t * t * y1 });
    }
    return out;
  }

  return { rng, canvas, cloud, mottle, rock, orchid, paper, vignette, mountains, mist, mistBand, smoothPts, along, corridor, splash, grain,
    seal, hasGlyph, charLayer, inkChar, enemyChar, towerGlyph, trail, strokeShot, arcPts, PAPER, INK, BRUSH_FONT };
})();
