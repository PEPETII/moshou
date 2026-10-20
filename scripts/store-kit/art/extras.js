// 非画卷类的美术图：Logo（浅色高明度 / 深色两版，透明底、内容贴边）
(() => {
  // 横排标题 + 朱印，画到足够大的透明画布，再按不透明像素包围盒裁切
  function renderLogo(ctx, W, H, L) {
    const work = Ink.canvas(L.size * 6, L.size * 2.2), c = work.getContext('2d');
    const draw = (color, extra) => Tableau.title(c, work.width, work.height,
      { x: L.size * 0.25, y: work.height / 2, size: L.size, color, bleedAlpha: 0.35, ...extra });
    if (L.light) {
      // 浅色版：先压一圈浓墨描边与柔影，保证叠在任何底图上都清楚，再写纸白字
      c.save(); c.filter = `blur(${L.size * 0.035}px)`; draw('#14120f', { seal: false }); c.restore();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
        c.save(); c.translate(dx * L.size * 0.022, dy * L.size * 0.022); draw('#1d1b18', { seal: false, dry: false }); c.restore();
      }
      draw('#f7f2e6', { fade: 'rgba(220,208,186,0.5)' });
    } else {
      draw('#1d1b18');
    }
    // 包围盒裁切
    const d = c.getImageData(0, 0, work.width, work.height).data;
    let x0 = work.width, y0 = work.height, x1 = 0, y1 = 0;
    for (let y = 0; y < work.height; y++) for (let x = 0; x < work.width; x++) {
      if (d[(y * work.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    ctx.canvas.width = cw; ctx.canvas.height = ch;
    ctx.drawImage(work, x0, y0, cw, ch, 0, 0, cw, ch);
  }
  // size：单字字号。横排约 4.4 字宽，size=660 时宽约 2900、高约 780，两条尺寸要求都满足
  LAYOUTS.logo = { w: 10, h: 10, size: 660, light: true, render: renderLogo };
  LAYOUTS.logoDark = { w: 10, h: 10, size: 660, light: false, render: renderLogo };
})();

// 宣传片开场（逐帧）：宣纸远山上，游戏笔刷逐笔写出「火」，随后两点化作火星飞出画外
(() => {
  let bg = null;
  function backdrop(W, H) {
    if (bg) return bg;
    bg = Ink.canvas(W, H);
    const c = bg.getContext('2d');
    Ink.paper(c, W, H, 51);
    Ink.mountains(c, W, H, { y0: H * 0.62, y1: H * 0.85, amp: H * 0.2, ink: 0.1, tint: '86,100,100', blur: 5, seed: 52, crest: 2, peaks: [[0.2, 0.5, 0.08], [0.78, 0.6, 0.07]] });
    Ink.mountains(c, W, H, { y0: H * 0.74, y1: H * 0.95, amp: H * 0.1, ink: 0.16, blur: 1.5, seed: 53, crest: 3 });
    Ink.mistBand(c, W, H * 0.74, H * 0.07, 0.7, 54);
    return bg;
  }
  const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  function renderOpener(ctx, W, H, L, t) {
    const WRITE = 2.3, FLY = 2.65;
    ctx.save();
    const z = 1 + 0.035 * (t / 3.6);                     // 缓慢推近
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(backdrop(W, H), 0, 0);
    const x = W * 0.5, y = H * 0.47, size = H * 0.52;
    const flying = t > FLY;
    // 写完后火光渐起
    const glowAlpha = 0.15 + 0.4 * ease((t - WRITE) / 0.6);
    Ink.towerGlyph(ctx, 'fire', x, y, size, {
      progress: Math.min(1, t / WRITE), glowAlpha, haloAlpha: 0.6,
      hide: flying ? [0, 1] : null,
      ring: t > WRITE ? ease((t - WRITE) / 0.9) * 0.93 : 0, ringAlpha: 0.3,
    });
    if (flying) {
      const k = ease((t - FLY) / 0.95);
      for (const [i, ty, bend] of [[0, 0.3, 0.18], [1, 0.62, -0.14]]) {
        const sx = x + (i ? size * 0.2 : -size * 0.22), sy = y - size * 0.12;
        const pts = Ink.arcPts(sx, sy, W * 1.12, H * ty, bend, 30, Math.max(0, k - 0.35), Math.max(0.02, k));
        Ink.strokeShot(ctx, 'fire', i, pts, size, { scale: 1.1 });
      }
    }
    // 收笔时的一点泼墨
    if (t > WRITE - 0.2) Ink.splash(ctx, x - size * 0.42, y + size * 0.46, 2.6, size * 0.035 * ease((t - WRITE + 0.2) / 0.3), { seed: 55, alpha: 0.8 });
    ctx.restore();
    Ink.vignette(ctx, W, H, 0.22);
  }
  LAYOUTS.opener = { w: 1920, h: 1080, duration: 3.6, render: renderOpener, animated: true };
})();
