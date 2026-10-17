// 水墨绘制工具：宣纸、远山、墨滴、毛笔路径、墨字、飞溅粒子。全部按「时间 t」确定性绘制。
(function (root) {
  const W = 1920, H = 1080;
  const FONT = '"Ma Shan Zheng", "ZCOOL XiaoWei", "KaiTi", serif';

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp01((t - a) / (b - a));
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(w = W, h = H) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // 宣纸：底色 + 细噪点 + 纤维 + 暗角
  function makePaper() {
    const c = canvas(); const g = c.getContext('2d'); const r = rng(11);
    g.fillStyle = '#f4efe4'; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H); const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 9;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.1;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(120,105,80,0.07)'; g.lineWidth = 1;
    for (let i = 0; i < 520; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI, l = 8 + r() * 26;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0);
    v.addColorStop(0, 'rgba(189,178,152,0)'); v.addColorStop(1, 'rgba(189,178,152,0.5)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  // 远山：三层淡墨，山脊为叠加正弦 + 噪声
  function makeMountains() {
    const layers = [];
    const specs = [
      { base: 690, amp: 150, color: '120,112,98', alpha: 0.34, blur: 7, seed: 3, freq: 1.0 },
      { base: 790, amp: 130, color: '96,90,78', alpha: 0.38, blur: 5, seed: 8, freq: 1.4 },
      { base: 900, amp: 100, color: '70,66,58', alpha: 0.42, blur: 3, seed: 15, freq: 1.9 },
    ];
    for (const s of specs) {
      const c = canvas(); const g = c.getContext('2d'); const r = rng(s.seed);
      const ph = [r() * 6, r() * 6, r() * 6];
      const ridge = (x) => s.base - s.amp * (0.55 * Math.abs(Math.sin(x / (330 / s.freq) + ph[0])) + 0.3 * Math.abs(Math.sin(x / (170 / s.freq) + ph[1])) + 0.15 * Math.sin(x / (61 / s.freq) + ph[2]));
      g.filter = `blur(${s.blur}px)`;
      const grad = g.createLinearGradient(0, s.base - s.amp, 0, H);
      grad.addColorStop(0, `rgba(${s.color},${s.alpha})`); grad.addColorStop(0.7, `rgba(${s.color},${s.alpha * 0.25})`); grad.addColorStop(1, `rgba(${s.color},0)`);
      g.fillStyle = grad; g.beginPath(); g.moveTo(-20, H);
      for (let x = -20; x <= W + 20; x += 8) g.lineTo(x, ridge(x));
      g.lineTo(W + 20, H); g.closePath(); g.fill();
      layers.push(c);
    }
    return layers;
  }

  // 折线累计长度
  function pathInfo(pts) {
    const segs = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({ x0, y0, x1, y1, len, start: total });
      total += len;
    }
    return { segs, total };
  }
  function pointAt(info, d) {
    const dd = Math.max(0, Math.min(info.total, d));
    for (const s of info.segs) {
      if (dd <= s.start + s.len) {
        const k = (dd - s.start) / s.len;
        return { x: s.x0 + (s.x1 - s.x0) * k, y: s.y0 + (s.y1 - s.y0) * k, dx: (s.x1 - s.x0) / s.len, dy: (s.y1 - s.y0) / s.len };
      }
    }
    const l = info.segs[info.segs.length - 1];
    return { x: l.x1, y: l.y1, dx: (l.x1 - l.x0) / l.len, dy: (l.y1 - l.y0) / l.len };
  }

  // 毛笔路径图层：增量绘制到离屏画布（时间回退时重绘）
  function PathLayer(pts, width) {
    this.info = pathInfo(pts);
    this.canvas = canvas(); this.g = this.canvas.getContext('2d');
    this.width = width; this.drawn = 0; this.rand = rng(21);
    this.seed = 21;
  }
  PathLayer.prototype.upTo = function (len) {
    if (len < this.drawn - 0.5) { this.g.clearRect(0, 0, W, H); this.drawn = 0; this.rand = rng(this.seed); }
    const g = this.g; const step = 3;
    for (let d = this.drawn; d <= len; d += step) {
      const p = pointAt(this.info, d);
      // 笔宽与偏摆用平滑函数，避免「串珠」感；边缘再叠一圈浓淡不一的飞白
      const wob = Math.sin(d / 61) * 2.4 + Math.sin(d / 19) * 1.1;
      const w = this.width * (0.94 + 0.05 * Math.sin(d / 83) + 0.02 * Math.sin(d / 23));
      g.fillStyle = 'rgb(112,106,94)'; g.beginPath(); g.arc(p.x + wob, p.y - wob * 0.6, w * 0.53, 0, 6.3); g.fill();
      g.fillStyle = 'rgb(138,131,119)'; g.beginPath(); g.arc(p.x + wob * 0.8, p.y - wob * 0.5, w * 0.47, 0, 6.3); g.fill();
      if (this.rand() < 0.5) {
        const o = (this.rand() - 0.5) * w * 0.9;
        g.fillStyle = this.rand() < 0.5 ? 'rgba(160,153,140,0.55)' : 'rgba(96,90,80,0.35)';
        g.beginPath(); g.ellipse(p.x - p.dy * o, p.y + p.dx * o, 2 + this.rand() * 7, 1 + this.rand() * 2, Math.atan2(p.dy, p.dx), 0, 6.3); g.fill();
      }
    }
    this.drawn = Math.max(this.drawn, len);
  };

  // 墨字：模糊 → 清晰、缩放、透明度；可选「笔触揭开」遮罩
  function glyph(g, ch, x, y, size, color, o) {
    o = o || {};
    g.save();
    g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.scale) g.scale(o.scale, o.scale);
    if (o.blur) g.filter = `blur(${o.blur}px)`;
    g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.shadowBlur || 12; }
    g.fillStyle = color;
    g.fillText(ch, 0, size * 0.04);
    g.restore();
  }

  // 柔边圆（用径向渐变，比 filter blur 便宜）
  function softDot(g, x, y, r, rgb, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
  }

  // 飞溅粒子：由 (种子, 数量) 确定，按出生时刻计算位置（无状态）
  function splash(g, t, born, x, y, o) {
    const age = t - born;
    if (age < 0 || age > (o.life || 1.2)) return;
    const r = rng(o.seed || 1);
    const n = o.n || 18;
    for (let i = 0; i < n; i++) {
      const a = r() * 6.2832, sp = (o.speed || 300) * (0.25 + r() * 0.9), rad = (o.size || 6) * (0.35 + r());
      const drag = 3.2;
      const dist = sp * (1 - Math.exp(-drag * age)) / drag;
      const px = x + Math.cos(a) * dist, py = y + Math.sin(a) * dist + (o.gravity || 0) * age * age;
      const fade = 1 - Math.pow(age / (o.life || 1.2), 2);
      g.fillStyle = `rgba(${o.rgb || '28,26,23'},${(o.alpha === undefined ? 0.85 : o.alpha) * fade})`;
      g.beginPath(); g.ellipse(px, py, rad, rad * (1 + Math.min(0.8, age * 0.6)), a, 0, 6.3); g.fill();
    }
  }

  root.INK = { W, H, FONT, clamp01, lerp, prog, ease, rng, canvas, makePaper, makeMountains, pathInfo, pointAt, PathLayer, glyph, softDot, splash };
})(window);
