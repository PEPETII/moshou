// 图鉴字形书写预览（工单 P2）：按笔顺逐笔写出 CONFIG.GLYPHS 中的字
// 书写中的笔画用元素色，写完的笔画回到墨色——与塔身「写出整字」的观感一致。
// 米字格由 CSS 画在画布背景上；画布只负责笔画。
const CodexGlyph = (() => {
  let raf = 0;
  let current = null;

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    current = null;
  }

  // 按画布的 CSS 尺寸与设备像素比设置位图尺寸，返回逻辑边长
  function fit(canvas) {
    const size = Math.max(1, Math.round(canvas.clientWidth || 120));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, size };
  }

  function timing() {
    return { per: CONFIG.CODEX.strokeSeconds, gap: CONFIG.CODEX.strokeGap };
  }

  // 第 i 笔在时刻 t（秒）的书写进度 0..1
  function strokeProgress(i, t) {
    const { per, gap } = timing();
    return Math.max(0, Math.min(1, (t - i * (per + gap)) / per));
  }

  // 画出时刻 t 的状态；返回正在书写的笔序号，全部写完返回 -1
  function renderAt(canvas, glyph, opts, t) {
    const { ctx, size } = fit(canvas);
    const ink = CONFIG.GLYPH_COLORS.ink;
    const paper = getComputedStyle(canvas).getPropertyValue('--paper-1').trim() || CONFIG.GLYPH_COLORS.paper;
    ctx.clearRect(0, 0, size, size);
    let writing = -1;
    glyph.strokes.forEach((stroke, i) => {
      const progress = strokeProgress(i, t);
      if (progress < 1 && writing < 0) writing = i;
      Brush.drawStroke(ctx, stroke, {
        x: size / 2,
        y: size / 2,
        size: size * 0.86,
        progress,
        color: progress < 1 ? opts.color : ink,
        paper,
      });
    });
    return writing;
  }

  function totalSeconds(glyph) {
    const { per, gap } = timing();
    return glyph.strokes.length * (per + gap);
  }

  /**
   * 在 canvas 上书写 glyph。opts.color：书写中的元素色；opts.onStroke(i)：当前笔序（-1 表示写完）。
   * 减少动效时直接画出整字。
   */
  function play(canvas, glyph, opts) {
    stop();
    const reduced = window.InkUI && typeof InkUI.motionReduced === 'function' && InkUI.motionReduced();
    const notify = (i) => { if (opts.onStroke) opts.onStroke(i); };
    if (reduced) {
      renderAt(canvas, glyph, opts, totalSeconds(glyph));
      notify(-1);
      return;
    }
    const token = {};
    current = token;
    const start = performance.now();
    let last = null;
    const frame = (now) => {
      if (current !== token) return;
      const t = (now - start) / 1000;
      const writing = renderAt(canvas, glyph, opts, t);
      if (writing !== last) { last = writing; notify(writing); }
      if (t < totalSeconds(glyph)) raf = requestAnimationFrame(frame);
      else { raf = 0; current = null; }
    };
    renderAt(canvas, glyph, opts, 0);
    notify(0);
    raf = requestAnimationFrame(frame);
  }

  return { play, stop, renderAt, totalSeconds };
})();
