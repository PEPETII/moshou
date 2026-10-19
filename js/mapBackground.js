/**
 * 背景地图：宣纸底纹 + 远山 + 苔石 + 墨廊路径
 * ------------------------------------------------------------------
 * 与 demo（字形弹道原型）的水墨地图同源：
 *   纸   —— 纤维、茶渍、暗角
 *   山   —— 远端墨影，沿底边起伏
 *   苔   —— 散点墨苔，避开路径
 *   路   —— 三层淡墨廊道 + 边缘飞白 + 行进箭标
 *
 * 所有产物按「目标尺寸」生成离屏画布并缓存，绘制时只做一次 drawImage，
 * 因此既能在静态层用，也能在每帧重绘的征服模式里用。
 * 坐标一律由调用方传入的网格路径换算，不在此处假设任何地图尺寸。
 */
(function (g) {
  'use strict';

  var PAPER = '#f4efe4';       // 与 CONFIG.COLORS.bg 一致
  var INK = '30,27,22';
  var REF_AREA = 960 * 432;    // demo 基准面积，用于密度换算

  var cache = { terrain: {}, corridor: {} };
  var MAX_ENTRIES = 4;

  /* ---------- 基础工具 ---------- */

  function rng(seed) {
    var a = (seed || 1) >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function swapIfFull(store) {
    if (Object.keys(store).length > MAX_ENTRIES) {
      for (var k in store) delete store[k];
    }
  }

  function normPaths(path) {
    if (!path || !path.length) return [];
    return Array.isArray(path[0]) ? path : [path];
  }

  function toPixel(path, cell) {
    var out = [], i, c;
    for (i = 0; i < path.length; i++) {
      c = path[i];
      out.push(
        typeof gridToPixel === 'function'
          ? gridToPixel(c.x, c.y)
          : { x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 }
      );
    }
    return out;
  }

  function pathKey(paths) {
    var s = '', p, i;
    for (p = 0; p < paths.length; p++) {
      for (i = 0; i < paths[p].length; i++) s += paths[p][i].x + ',' + paths[p][i].y + ';';
      s += '|';
    }
    return s;
  }

  /** 按固定步长沿折线取样，返回 {x,y,ang} 序列 */
  function sampleLine(pts, step) {
    var out = [], i, k, n, t, x1, y1, x2, y2, d, ang;
    for (i = 0; i < pts.length - 1; i++) {
      x1 = pts[i].x; y1 = pts[i].y;
      x2 = pts[i + 1].x; y2 = pts[i + 1].y;
      d = Math.hypot(x2 - x1, y2 - y1);
      if (d < 0.001) continue;
      ang = Math.atan2(y2 - y1, x2 - x1);
      n = Math.max(1, Math.ceil(d / step));
      for (k = 0; k < n; k++) {
        t = k / n;
        out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, ang: ang });
      }
    }
    if (pts.length) {
      var last = pts[pts.length - 1];
      var prev = pts[pts.length - 2] || last;
      out.push({ x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x) });
    }
    return out;
  }

  /* ---------- 纸 ---------- */

  function paintPaper(ctx, w, h) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    var k = (w * h) / REF_AREA;
    var R = rng(20261017);
    var i, px, py, len, ang, rad, gr;

    // 纤维
    var fibers = Math.min(12000, Math.round(2400 * k));
    ctx.lineWidth = 1;
    for (i = 0; i < fibers; i++) {
      px = R() * w; py = R() * h;
      len = 2 + R() * 11; ang = R() * Math.PI;
      ctx.strokeStyle = 'rgba(122,106,84,' + (0.012 + R() * 0.034).toFixed(3) + ')';
      ctx.lineWidth = 0.6 + R() * 0.9;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      ctx.stroke();
    }

    // 茶渍
    var stains = Math.min(60, Math.round(24 * k));
    for (i = 0; i < stains; i++) {
      px = R() * w; py = R() * h; rad = Math.min(170, (30 + R() * 70) * Math.sqrt(k));
      gr = ctx.createRadialGradient(px, py, rad * 0.15, px, py, rad);
      gr.addColorStop(0, 'rgba(152,128,94,0.032)');
      gr.addColorStop(1, 'rgba(152,128,94,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.2832); ctx.fill();
    }

    // 暗角
    gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.78);
    gr.addColorStop(0, 'rgba(60,50,38,0)');
    gr.addColorStop(1, 'rgba(60,50,38,0.13)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }

  /* ---------- 远山 ---------- */

  function paintMountains(ctx, w, h, baseY) {
    var R = rng(77003);
    var count = Math.max(3, Math.round(w / 230));
    var slot = w / count;
    var i, cx, bw, bh, alpha;

    ctx.save();
    for (i = 0; i < count; i++) {
      cx = slot * i + slot * (0.1 + R() * 0.8);
      bw = slot * (1.2 + R() * 0.8);
      bh = h * (0.07 + R() * 0.06);
      alpha = 0.03 + R() * 0.025;
      ctx.fillStyle = 'rgba(' + INK + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, baseY);
      ctx.quadraticCurveTo(cx, baseY - bh, cx + bw / 2, baseY);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 苔石 ---------- */

  function paintMoss(ctx, w, h, pathPts, cell) {
    var R = rng(51219);
    var samples = [];
    var p, i;
    for (p = 0; p < pathPts.length; p++) {
      samples = samples.concat(sampleLine(pathPts[p], 22));
    }
    var count = Math.min(220, Math.round((w * h) / REF_AREA * 46));
    var clear = cell * 1.35;
    var guard = 0;

    while (count > 0 && guard < count * 6) {
      guard++;
      var px = 14 + R() * (w - 28);
      var py = 14 + R() * (h - 28);
      var far = true;
      for (i = 0; i < samples.length; i++) {
        if (Math.abs(samples[i].x - px) < clear && Math.abs(samples[i].y - py) < clear) {
          far = false;
          break;
        }
      }
      if (!far) continue;
      ctx.beginPath();
      ctx.arc(px, py, 0.9 + R() * 2.4, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + INK + ',' + (0.03 + R() * 0.07).toFixed(3) + ')';
      ctx.fill();
      count--;
    }
  }

  /* ---------- 地形（纸 + 山 + 苔） ---------- */

  function terrainCanvas(w, h, opts) {
    var paths = normPaths(opts && opts.path);
    var cell = (opts && opts.cell) || 48;
    var key = w + 'x' + h + '|' + (opts && opts.base) + '|' + (opts && opts.moss === false ? 0 : 1) + '|' + pathKey(paths);
    if (cache.terrain[key]) return cache.terrain[key];

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');

    paintPaper(ctx, w, h);
    var baseY = (opts && opts.base) || h * 0.995;
    paintMountains(ctx, w, h, baseY);
    if (!(opts && opts.moss === false)) {
      var pix = [];
      for (var i = 0; i < paths.length; i++) pix.push(toPixel(paths[i], cell));
      paintMoss(ctx, w, h, pix, cell);
    }

    swapIfFull(cache.terrain);
    cache.terrain[key] = cv;
    return cv;
  }

  /* ---------- 墨廊 ---------- */

  function corridorCanvas(w, h, paths, cell) {
    var key = w + 'x' + h + '|' + cell + '|' + pathKey(paths);
    if (cache.corridor[key]) return cache.corridor[key];

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var ROAD = '56,48,36';
    var i, p, pix, j;
    var supportsFilter = typeof ctx.filter === 'string';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1) 外晕：整条廊道做一次模糊，避免"刷出来的一条硬边"
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      if (supportsFilter) ctx.filter = 'blur(9px)';
      ctx.beginPath();
      ctx.moveTo(pix[0].x, pix[0].y);
      for (j = 1; j < pix.length; j++) ctx.lineTo(pix[j].x, pix[j].y);
      ctx.lineWidth = cell * 1.24;
      ctx.strokeStyle = 'rgba(' + ROAD + ',0.040)';
      ctx.stroke();
      if (supportsFilter) ctx.filter = 'none';
    }

    // 2) 墨心：三层叠加，中路略浅，像被水洗过
    var bands = [
      [cell * 1.02, '0.026'],
      [cell * 0.88, '0.014']
    ];
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      for (i = 0; i < bands.length; i++) {
        ctx.beginPath();
        ctx.moveTo(pix[0].x, pix[0].y);
        for (j = 1; j < pix.length; j++) ctx.lineTo(pix[j].x, pix[j].y);
        ctx.lineWidth = bands[i][0];
        ctx.strokeStyle = 'rgba(' + ROAD + ',' + bands[i][1] + ')';
        ctx.stroke();
      }
    }

    // 3) 积墨：沿路不均匀地压几团，破掉平涂感
    var R = rng(31415);
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      var line0 = sampleLine(pix, cell * 1.9);
      for (i = 0; i < line0.length; i++) {
        if (R() > 0.55) continue;
        var rr = cell * (0.22 + R() * 0.2);
        if (supportsFilter) ctx.filter = 'blur(6px)';
        ctx.beginPath();
        ctx.arc(line0[i].x + (R() - 0.5) * cell * 0.3, line0[i].y + (R() - 0.5) * cell * 0.3, rr, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + ROAD + ',' + (0.012 + R() * 0.02).toFixed(3) + ')';
        ctx.fill();
        if (supportsFilter) ctx.filter = 'none';
      }
    }

    // 4) 边缘飞白：间距带随机，避免整齐的点线
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      var line = sampleLine(pix, 5);
      for (i = 0; i < line.length; i++) {
        if (R() > 0.62) continue;
        var nx = -Math.sin(line[i].ang), ny = Math.cos(line[i].ang);
        for (var side = -1; side <= 1; side += 2) {
          if (R() > 0.72) continue;
          var off = cell * 0.47 + (R() - 0.5) * cell * 0.14;
          ctx.beginPath();
          ctx.arc(line[i].x + nx * off * side, line[i].y + ny * off * side,
            0.4 + R() * 1.6, 0, 6.2832);
          ctx.fillStyle = 'rgba(' + INK + ',' + (0.035 + R() * 0.085).toFixed(3) + ')';
          ctx.fill();
        }
      }
    }

    // 5) 行进方向箭标
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      var marks = sampleLine(pix, 112);
      for (i = 1; i < marks.length - 1; i++) {
        var m = marks[i];
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.ang);
        ctx.beginPath();
        ctx.moveTo(-4, -5);
        ctx.lineTo(3, 0);
        ctx.lineTo(-4, 5);
        ctx.strokeStyle = 'rgba(' + INK + ',0.17)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }
    }

    swapIfFull(cache.corridor);
    cache.corridor[key] = cv;
    return cv;
  }

  /* ---------- 对外接口 ---------- */

  /** 铺地形底纹（含远山与苔石），不画路径 */
  function drawTerrain(ctx, w, h, opts) {
    ctx.drawImage(terrainCanvas(w, h, opts || {}), 0, 0);
  }

  /** 按给定网格路径画墨廊；坐标由调用方提供，本函数不改动任何路径数据 */
  function drawPathCorridor(ctx, path, cell) {
    var paths = normPaths(path);
    if (!paths.length) return;
    var cv = corridorCanvas(ctx.canvas.width, ctx.canvas.height, paths, cell || 48);
    ctx.drawImage(cv, 0, 0);
  }

  /** 全屏界面底图：地形 + 弥散墨晕，无路径 */
  function drawScreen(ctx, w, h) {
    ctx.drawImage(terrainCanvas(w, h, { base: h * 0.98, moss: true, path: null }), 0, 0);
    // 左上角一团极淡的墨晕，避免大面积空白
    var gr = ctx.createRadialGradient(w * 0.18, h * 0.12, 0, w * 0.18, h * 0.12, Math.max(w, h) * 0.42);
    gr.addColorStop(0, 'rgba(30,27,22,0.035)');
    gr.addColorStop(1, 'rgba(30,27,22,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }

  function clearCache() {
    cache.terrain = {};
    cache.corridor = {};
  }

  g.MapBackground = {
    drawTerrain: drawTerrain,
    drawPathCorridor: drawPathCorridor,
    drawScreen: drawScreen,
    clearCache: clearCache,
    PAPER: PAPER
  };
})(window);
