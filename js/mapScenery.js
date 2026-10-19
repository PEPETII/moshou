/**
 * 地图空白点缀（工单：战斗界面水墨视觉统一，4.4 中景）
 * ------------------------------------------------------------------
 * 在路径禁区之外的大块空白里放山石皴擦、兰草枯枝和一方淡印，解决大面积留白。
 *   禁区   —— 路径格及其八邻域；最左、最右两列不放（避开镜头提示）
 *   布局   —— 贪心取面积最大、互不重叠的空白矩形（不小于 3×2 格），最多 4 组
 *   主体   —— 靠下 2/3，上方留白；透明度：主体 ≤ 0.16，细节 ≤ 0.10
 * 只由 MapBackground.terrainCanvas 调用，画进地形缓存，不每帧绘制；
 * 层级低于网格、墨廊、塔与敌人，因此不影响放置与命中。
 * 随机种子由路径数据派生，同一关每次进入画面一致。
 */
(function (g) {
  'use strict';

  var INK = '30,27,22';
  var SEAL = '180,71,58';   // 与 --ink-seal 一致
  var MIN_COLS = 3;
  var MIN_ROWS = 2;
  var MAX_GROUPS = 4;

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

  function hashString(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** 禁区矩阵：true 表示该格不能放装饰 */
  function buildBlocked(paths, cols, rows) {
    var blocked = [], r, c, p, i, dx, dy, cx, cy;
    for (r = 0; r < rows; r++) {
      blocked.push([]);
      for (c = 0; c < cols; c++) blocked[r].push(c === 0 || c === cols - 1);
    }
    for (p = 0; p < paths.length; p++) {
      for (i = 0; i < paths[p].length; i++) {
        cx = paths[p][i].x;
        cy = paths[p][i].y;
        for (dy = -1; dy <= 1; dy++) {
          for (dx = -1; dx <= 1; dx++) {
            r = cy + dy;
            c = cx + dx;
            if (r >= 0 && r < rows && c >= 0 && c < cols) blocked[r][c] = true;
          }
        }
      }
    }
    return blocked;
  }

  /** 空白矩形：前缀和判断是否全部未被禁区占用；按面积从大到小，互不重叠地取 */
  function findBlocks(blocked, cols, rows) {
    var sum = [], r, c, x0, y0, x1, y1, bad, cand = [], out = [], i, o, ok;
    for (r = 0; r <= rows; r++) {
      sum.push([]);
      for (c = 0; c <= cols; c++) sum[r].push(0);
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        sum[r + 1][c + 1] = sum[r][c + 1] + sum[r + 1][c] - sum[r][c] + (blocked[r][c] ? 1 : 0);
      }
    }
    for (y0 = 0; y0 < rows; y0++) {
      for (x0 = 0; x0 < cols; x0++) {
        for (y1 = y0 + MIN_ROWS - 1; y1 < rows; y1++) {
          for (x1 = x0 + MIN_COLS - 1; x1 < cols; x1++) {
            bad = sum[y1 + 1][x1 + 1] - sum[y0][x1 + 1] - sum[y1 + 1][x0] + sum[y0][x0];
            if (bad === 0) {
              cand.push({ x0: x0, y0: y0, x1: x1, y1: y1, area: (x1 - x0 + 1) * (y1 - y0 + 1) });
            }
          }
        }
      }
    }
    cand.sort(function (a, b) { return b.area - a.area || a.y0 - b.y0 || a.x0 - b.x0; });
    for (i = 0; i < cand.length && out.length < MAX_GROUPS; i++) {
      o = cand[i];
      ok = true;
      for (var j = 0; j < out.length; j++) {
        var q = out[j];
        if (!(o.x1 < q.x0 || o.x0 > q.x1 || o.y1 < q.y0 || o.y0 > q.y1)) { ok = false; break; }
      }
      if (ok) out.push(o);
    }
    return out;
  }

  /** 一组点缀：山石（淡墨团 + 皴擦）、兰草（弧线 + 叶点），偶尔加一方淡印 */
  function paintGroup(ctx, rect, cell, R) {
    var px = rect.x0 * cell;
    var py = rect.y0 * cell;
    var bw = (rect.x1 - rect.x0 + 1) * cell;
    var bh = (rect.y1 - rect.y0 + 1) * cell;
    var s = Math.min(bw, bh);
    var baseY = py + bh * 0.96;
    var cx = px + bw * (0.3 + R() * 0.4);
    var rocks = 2 + Math.floor(R() * 2);
    var k, i, j, rx, ry, ox, bx, hh, tx, ty, lx, ly;

    ctx.save();

    // 山石：压扁的淡墨团，上方再压几笔皴擦（主体 ≤ 0.16，皴擦 ≤ 0.10）
    for (k = 0; k < rocks; k++) {
      ox = (k - (rocks - 1) / 2) * s * 0.42 + (R() - 0.5) * s * 0.1;
      rx = s * (0.16 + R() * 0.08);
      ry = rx * (0.55 + R() * 0.2);
      ctx.beginPath();
      ctx.ellipse(cx + ox, baseY - ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + INK + ',' + (0.07 + R() * 0.07).toFixed(3) + ')';
      ctx.fill();
      for (i = 0; i < 3; i++) {
        tx = cx + ox + (R() - 0.5) * rx * 1.2;
        ty = baseY - ry * (0.4 + R() * 0.8);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + rx * (0.3 + R() * 0.3), ty - ry * (0.2 + R() * 0.3));
        ctx.strokeStyle = 'rgba(' + INK + ',' + (0.05 + R() * 0.05).toFixed(3) + ')';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // 兰草：从底部生出的三笔弧线，末端点几个叶点（≤ 0.10）
    for (i = 0; i < 3; i++) {
      bx = R() < 0.5 ? px + bw * (0.12 + R() * 0.08) : px + bw * (0.8 + R() * 0.08);
      hh = s * (0.35 + R() * 0.25);
      tx = bx + (R() - 0.5) * s * 0.4;
      ty = baseY - hh;
      ctx.beginPath();
      ctx.moveTo(bx, baseY);
      ctx.quadraticCurveTo(bx + (R() - 0.5) * s * 0.3, baseY - hh * 0.6, tx, ty);
      ctx.strokeStyle = 'rgba(' + INK + ',' + (0.07 + R() * 0.03).toFixed(3) + ')';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      for (j = 0; j < 3; j++) {
        lx = tx + (R() - 0.5) * s * 0.16;
        ly = ty + (R() - 0.3) * s * 0.12;
        ctx.beginPath();
        ctx.arc(lx, ly, 1 + R() * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + INK + ',' + (0.05 + R() * 0.04).toFixed(3) + ')';
        ctx.fill();
      }
    }

    // 闲章：约三分之一的组在留白处盖一方极淡的朱印
    if (R() < 0.34) {
      var sz = Math.max(6, s * 0.12);
      ctx.fillStyle = 'rgba(' + SEAL + ',0.10)';
      ctx.fillRect(px + bw * 0.78, py + bh * 0.14, sz, sz);
    }

    ctx.restore();
  }

  /**
   * 在地形缓存上画点缀。
   * @param {CanvasRenderingContext2D} ctx  地形缓存的上下文（逻辑坐标）
   * @param {number} w                       世界宽（像素）
   * @param {number} h                       世界高（像素）
   * @param {Array}  paths                   网格路径，已规范化为二维数组
   * @param {number} cell                    单格像素
   * @param {string} seedKey                 随机种子来源（路径指纹）
   */
  function paint(ctx, w, h, paths, cell, seedKey) {
    if (!paths || !paths.length || !cell) return;
    var cols = Math.floor(w / cell);
    var rows = Math.floor(h / cell);
    if (cols < MIN_COLS || rows < MIN_ROWS) return;

    var blocked = buildBlocked(paths, cols, rows);
    var blocks = findBlocks(blocked, cols, rows);
    var R = rng(hashString(seedKey || '') ^ 0x5CE9E7);
    for (var i = 0; i < blocks.length; i++) paintGroup(ctx, blocks[i], cell, R);
  }

  g.MapScenery = { paint: paint };
})(window);
