/**
 * 背景地图：宣纸底纹 + 远山 + 苔石 + 墨廊路径
 * ------------------------------------------------------------------
 * 与 demo（字形弹道原型）的水墨地图同源：
 *   纸   —— 纤维、茶渍（暗角改由 DOM 层统一绘制，见 scene.css）
 *   山   —— 远层青灰淡彩 + 近层淡墨，沿底边起伏
 *   苔   —— 散点墨苔，避开路径
 *   景   —— 空白处的山石、兰草与淡印（js/mapScenery.js）
 *   路   —— 三层淡墨廊道，按里程由浅入深 + 两侧墨线 + 行进箭标
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

  /**
   * 纸纤维：随机方向的短淡墨丝。wrap 为真时，跨边的纤维在对边补画，得到可无缝平铺的纹理。
   * 每根纤维取随机数的顺序固定（位置、长度、角度、浓淡、粗细），地图纸纹与旧版逐像素一致。
   */
  function paintFibers(ctx, w, h, R, count, wrap) {
    var i, px, py, len, ang, ex, ey, dx, dy;
    ctx.lineWidth = 1;
    for (i = 0; i < count; i++) {
      px = R() * w; py = R() * h;
      len = 2 + R() * 11; ang = R() * Math.PI;
      ctx.strokeStyle = 'rgba(122,106,84,' + (0.012 + R() * 0.034).toFixed(3) + ')';
      ctx.lineWidth = 0.6 + R() * 0.9;
      ex = Math.cos(ang) * len; ey = Math.sin(ang) * len;
      for (dx = -1; dx <= 1; dx++) {
        for (dy = -1; dy <= 1; dy++) {
          if ((dx || dy) && !wrap) continue;
          // 只在纤维确实跨出该方向的边时补画
          if (dx && !(dx < 0 ? px + Math.max(0, ex) > w : px + Math.min(0, ex) < 0)) continue;
          if (dy && !(dy < 0 ? py + ey > h : false)) continue;
          ctx.beginPath();
          ctx.moveTo(px + dx * w, py + dy * h);
          ctx.lineTo(px + dx * w + ex, py + dy * h + ey);
          ctx.stroke();
        }
      }
    }
  }

  function paintPaper(ctx, w, h) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    var k = (w * h) / REF_AREA;
    var R = rng(20261017);
    var i, px, py, len, ang, rad, gr;

    // 纤维
    paintFibers(ctx, w, h, R, Math.min(12000, Math.round(2400 * k)), false);

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

    // 暗角不在这里画：世界尺寸的暗角会在地图上留下一圈深边，改由战场容器统一绘制
  }

  /* ---------- 远山 ---------- */

  // 一层山峦：高度 = h × (hMin ~ hMin + hVar)，不超过画布的 18%
  function paintRange(ctx, w, h, baseY, R, hMin, hVar, rgb, aMin, aVar) {
    var count = Math.max(3, Math.round(w / 230));
    var slot = w / count;
    var i, cx, bw, bh, alpha;

    for (i = 0; i < count; i++) {
      cx = slot * i + slot * (0.1 + R() * 0.8);
      bw = slot * (1.2 + R() * 0.8);
      bh = h * (hMin + R() * hVar);
      alpha = aMin + R() * aVar;
      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, baseY);
      ctx.quadraticCurveTo(cx, baseY - bh, cx + bw / 2, baseY);
      ctx.fill();
    }
  }

  function paintMountains(ctx, w, h, baseY) {
    ctx.save();
    // 远层：青灰淡彩，透明度 0.03～0.05，最高约 17% 画布
    paintRange(ctx, w, h, baseY, rng(77011), 0.1, 0.07, '95,120,132', 0.03, 0.02);
    // 近层：淡墨，透明度 0.03～0.055，最高约 13% 画布
    paintRange(ctx, w, h, baseY, rng(77003), 0.07, 0.06, INK, 0.03, 0.025);
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

  // scale：高清倍率。位图 = 逻辑尺寸 × scale，内部按逻辑坐标绘制，调用方按逻辑尺寸贴回
  function hiDpiCanvas(w, h, scale) {
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
    var ctx = cv.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    return { cv: cv, ctx: ctx };
  }

  // 每帧调用（征服模式）时，同一份路径数组直接复用上次结果，省去拼接指纹字符串
  var lastTerrain = null;

  function terrainCanvas(w, h, opts) {
    var paths = normPaths(opts && opts.path);
    var cell = (opts && opts.cell) || 48;
    var scale = (opts && opts.scale) || 1;
    var base = opts && opts.base;
    var moss = !(opts && opts.moss === false);
    if (lastTerrain && lastTerrain.src === (opts && opts.path) && lastTerrain.w === w && lastTerrain.h === h &&
        lastTerrain.scale === scale && lastTerrain.base === base && lastTerrain.moss === moss && lastTerrain.cell === cell) {
      return lastTerrain.cv;
    }
    var key = w + 'x' + h + '@' + scale + '|' + base + '|' + (moss ? 1 : 0) + '|' + pathKey(paths);
    if (cache.terrain[key]) {
      lastTerrain = { src: opts && opts.path, w: w, h: h, scale: scale, base: base, moss: moss, cell: cell, cv: cache.terrain[key] };
      return cache.terrain[key];
    }

    var made = hiDpiCanvas(w, h, scale);
    var cv = made.cv;
    var ctx = made.ctx;

    paintPaper(ctx, w, h);
    var baseY = base || h * 0.995;
    paintMountains(ctx, w, h, baseY);
    var pix = [];
    if (moss) {
      for (var i = 0; i < paths.length; i++) pix.push(toPixel(paths[i], cell));
      paintMoss(ctx, w, h, pix, cell);
    }
    // 空白点缀：只在有路径的关卡里布置（菜单底图不传路径）
    if (window.MapScenery && paths.length) MapScenery.paint(ctx, w, h, paths, cell, pathKey(paths));

    swapIfFull(cache.terrain);
    lastTerrain = { src: opts && opts.path, w: w, h: h, scale: scale, base: base, moss: moss, cell: cell, cv: cv };
    cache.terrain[key] = cv;
    return cv;
  }

  /* ---------- 墨廊 ---------- */

  /**
   * 沿路径分段取浓淡：t 从入口 0 到出口 1，透明度 = base × (0.75 + 0.5t)，即 ±25% 的渐变。
   * 分成若干段各画一笔，段间只重叠一个采样点，避免整条线一个透明度的平涂感。
   */
  function strokeGradedBand(ctx, pix, width, rgb, base) {
    var n = pix.length, K = 8, k, i0, i1, j, t;
    ctx.lineWidth = width;
    for (k = 0; k < K; k++) {
      i0 = Math.floor(k * (n - 1) / K);
      i1 = Math.min(n - 1, Math.floor((k + 1) * (n - 1) / K) + 1);
      t = (k + 0.5) / K;
      ctx.beginPath();
      ctx.moveTo(pix[i0].x, pix[i0].y);
      for (j = i0 + 1; j <= i1; j++) ctx.lineTo(pix[j].x, pix[j].y);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + (base * (0.75 + 0.5 * t)).toFixed(4) + ')';
      ctx.stroke();
    }
  }

  /** 两侧墨线：沿路径偏移取点；每段 2～6 个采样，粗细起伏，偶尔断开成枯笔 */
  function paintInkEdges(ctx, pix, cell, R) {
    var line = sampleLine(pix, 6);
    var side, i, j, run, nx, ny, off;
    for (side = -1; side <= 1; side += 2) {
      off = cell * 0.47;
      i = 0;
      while (i < line.length - 1) {
        run = 2 + Math.floor(R() * 5);
        if (R() < 0.2) { i += run; continue; }
        ctx.beginPath();
        for (j = i; j < Math.min(line.length, i + run); j++) {
          nx = -Math.sin(line[j].ang) * off * side;
          ny = Math.cos(line[j].ang) * off * side;
          if (j === i) ctx.moveTo(line[j].x + nx, line[j].y + ny);
          else ctx.lineTo(line[j].x + nx, line[j].y + ny);
        }
        ctx.lineWidth = 0.7 + R() * 0.9;
        ctx.strokeStyle = 'rgba(' + INK + ',' + (0.09 + R() * 0.07).toFixed(3) + ')';
        ctx.stroke();
        i += run;
      }
    }
  }

  function corridorCanvas(w, h, paths, cell, scale) {
    scale = scale || 1;
    var key = w + 'x' + h + '@' + scale + '|' + cell + '|' + pathKey(paths);
    if (cache.corridor[key]) return cache.corridor[key];

    var made = hiDpiCanvas(w, h, scale);
    var cv = made.cv;
    var ctx = made.ctx;
    var ROAD = '56,48,36';
    var i, p, pix, j;
    var supportsFilter = typeof ctx.filter === 'string';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1) 外晕：整条廊道做一次模糊，避免"刷出来的一条硬边"
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      if (supportsFilter) ctx.filter = 'blur(' + 9 * scale + 'px)';
      ctx.beginPath();
      ctx.moveTo(pix[0].x, pix[0].y);
      for (j = 1; j < pix.length; j++) ctx.lineTo(pix[j].x, pix[j].y);
      ctx.lineWidth = cell * 1.24;
      ctx.strokeStyle = 'rgba(' + ROAD + ',0.040)';
      ctx.stroke();
      if (supportsFilter) ctx.filter = 'none';
    }

    // 2) 墨心：两层叠加，按里程由浅入深（入口淡、近出口浓），远近有层次
    var bands = [
      [cell * 1.02, 0.026],
      [cell * 0.88, 0.014]
    ];
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      for (i = 0; i < bands.length; i++) {
        strokeGradedBand(ctx, pix, bands[i][0], ROAD, bands[i][1]);
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
        if (supportsFilter) ctx.filter = 'blur(' + 6 * scale + 'px)';
        ctx.beginPath();
        ctx.arc(line0[i].x + (R() - 0.5) * cell * 0.3, line0[i].y + (R() - 0.5) * cell * 0.3, rr, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + ROAD + ',' + (0.012 + R() * 0.02).toFixed(3) + ')';
        ctx.fill();
        if (supportsFilter) ctx.filter = 'none';
      }
    }

    // 4) 两侧墨线：粗细起伏，并有枯笔断口（飞白）
    for (p = 0; p < paths.length; p++) {
      pix = toPixel(paths[p], cell);
      if (pix.length < 2) continue;
      paintInkEdges(ctx, pix, cell, R);
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
    ctx.drawImage(terrainCanvas(w, h, opts || {}), 0, 0, w, h);
  }

  /**
   * 按给定网格路径画墨廊；坐标由调用方提供，本函数不改动任何路径数据。
   * size 可选 {w, h}：世界尺寸大于视口时（征服模式）由调用方传入，否则取目标画布的逻辑尺寸。
   */
  function drawPathCorridor(ctx, path, cell, size) {
    var paths = normPaths(path);
    if (!paths.length) return;
    // 目标画布若是高清位图，按其逻辑尺寸与倍率生成墨廊
    var c = ctx.canvas;
    var w = (size && size.w) || c.logicalWidth || c.width;
    var h = (size && size.h) || c.logicalHeight || c.height;
    var cv = corridorCanvas(w, h, paths, cell || 48, c.renderScale || 1);
    ctx.drawImage(cv, 0, 0, w, h);
  }

  /** 全屏界面底图：地形 + 弥散墨晕，无路径 */
  function drawScreen(ctx, w, h) {
    ctx.drawImage(terrainCanvas(w, h, { base: h * 0.98, moss: true, path: null }), 0, 0, w, h);
    // 左上角一团极淡的墨晕，避免大面积空白
    var gr = ctx.createRadialGradient(w * 0.18, h * 0.12, 0, w * 0.18, h * 0.12, Math.max(w, h) * 0.42);
    gr.addColorStop(0, 'rgba(30,27,22,0.035)');
    gr.addColorStop(1, 'rgba(30,27,22,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }

  /* ---------- 供 DOM 共用的纹理（P6） ---------- */

  var shared = {};

  /**
   * 可平铺的纸纤维纹理：透明底，只有纤维（不画底色与茶渍），可叠在任何纸色上。
   * 密度与地图纸纹相同；size 为逻辑边长，位图按设备像素比放大。只生成一次。
   */
  function paperTile(size) {
    size = size || 320;
    if (shared.tile && shared.tile.size === size) return shared.tile.cv;
    var scale = Math.min(2, g.devicePixelRatio || 1);
    var made = hiDpiCanvas(size, size, scale);
    var count = Math.round(2400 * (size * size) / REF_AREA);
    paintFibers(made.ctx, size, size, rng(20261019), count, true);
    shared.tile = { size: size, cv: made.cv };
    return made.cv;
  }

  /**
   * 卷底远山带：透明底，与地图底边的远山同一算法（同种子、同透明度），供 DOM 页面铺在底部。
   * 山高按地图视口高（432）计算，使页面底部的山与战场底边的山比例一致。
   */
  function scrollFoot(w, h) {
    w = w || 960; h = h || 120;
    var key = w + 'x' + h;
    if (shared.foot && shared.foot.key === key) return shared.foot.cv;
    var made = hiDpiCanvas(w, h, Math.min(2, g.devicePixelRatio || 1));
    paintMountains(made.ctx, w, 432, h);
    shared.foot = { key: key, cv: made.cv };
    return made.cv;
  }

  function clearCache() {
    cache.terrain = {};
    cache.corridor = {};
    lastTerrain = null;
  }

  g.MapBackground = {
    drawTerrain: drawTerrain,
    drawPathCorridor: drawPathCorridor,
    drawScreen: drawScreen,
    paperTile: paperTile,
    scrollFoot: scrollFoot,
    clearCache: clearCache,
    PAPER: PAPER
  };
})(window);
