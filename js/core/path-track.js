// 路程系统（工单 04）：把格子路径预处理成像素线段表，敌人用路径里程 s 表示位置。
// 击退就是减小 s；拐角处沿折线走，不会穿墙。
//
// 用法：
//   const track = PathTrack.forPath(cells, { extendEntry: true });  // 按路径数组缓存
//   const p = track.pointAt(s);   // { x, y, ang }
//   track.cellIndexAt(s);         // 当前所在的格子下标（供路径阻挡塔使用）
class PathTrack {
  /**
   * @param {Array<{x:number,y:number}>} points 像素折线点（至少两个）
   * @param {Object} [opts]
   * @param {boolean} [opts.loop] 环形回路：s 到 total 后由调用方归零继续
   * @param {number[]} [opts.cellS] 每个格子中心对应的里程（与 points 的原始格子一一对应）
   */
  constructor(points, opts = {}) {
    this.loop = !!opts.loop;
    this.cellS = opts.cellS || [];
    this.segs = [];
    this.total = 0;
    let s = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len <= 0) continue;
      this.segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len, s0: s, ang: Math.atan2(b.y - a.y, b.x - a.x) });
      s += len;
    }
    this.total = s;
  }

  /**
   * 由格子路径建立。格子中心为路径点；共线点合并成一条线段。
   * @param {Array<{x:number,y:number}>} cells
   * @param {Object} [opts]
   * @param {number} [opts.cell] 格子边长，默认 CONFIG.CELL_SIZE
   * @param {boolean} [opts.extendEntry] 入口向画外延伸，让敌人从画外走进来
   * @param {boolean} [opts.loop]
   */
  static fromCells(cells, opts = {}) {
    const cell = opts.cell || (typeof CONFIG !== 'undefined' ? CONFIG.CELL_SIZE : 72);
    const pts = cells.map((c) => ({ x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 }));

    // 入口延伸：沿第一段反方向退出一格（中心退到画布外半格），敌人从画外走进来
    let extra = 0;
    if (opts.extendEntry && pts.length >= 2) {
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const len = Math.hypot(dx, dy) || 1;
      extra = cell;
      pts.unshift({ x: pts[0].x - (dx / len) * extra, y: pts[0].y - (dy / len) * extra });
    }

    // 每个格子中心的累计里程
    const cellS = [];
    let acc = 0;
    const base = extra ? 1 : 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (i >= base) cellS.push(acc);
    }

    // 合并共线点
    const merged = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = merged[merged.length - 1];
      const b = pts[i];
      const c = pts[i + 1];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
      if (Math.abs(cross) < 1e-6 && dot > 0) continue;
      merged.push(b);
    }
    if (pts.length > 1) merged.push(pts[pts.length - 1]);

    return new PathTrack(merged, { loop: opts.loop, cellS });
  }

  /** 按路径数组缓存（同一关卡路径只建一次）；opts 的 extendEntry/loop 参与缓存键 */
  static forPath(cells, opts = {}) {
    if (!PathTrack._cache) PathTrack._cache = new WeakMap();
    const key = `${opts.extendEntry ? 1 : 0}${opts.loop ? 1 : 0}`;
    let byKey = PathTrack._cache.get(cells);
    if (!byKey) {
      byKey = {};
      PathTrack._cache.set(cells, byKey);
    }
    if (!byKey[key]) byKey[key] = PathTrack.fromCells(cells, opts);
    return byKey[key];
  }

  _segAt(s) {
    const segs = this.segs;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].s0 <= s) lo = mid; else hi = mid - 1;
    }
    return segs[lo];
  }

  /** 里程 s 处的坐标与行进方向；s 会被夹到 [0, total] */
  pointAt(s) {
    const g = this._segAt(Math.max(0, Math.min(this.total, s)));
    const c = Math.max(0, Math.min(this.total, s));
    const k = g.len > 0 ? Math.min(1, (c - g.s0) / g.len) : 0;
    return { x: g.ax + (g.bx - g.ax) * k, y: g.ay + (g.by - g.ay) * k, ang: g.ang };
  }

  /** 离 (x, y) 最近的路径点的里程 */
  nearestS(x, y) {
    let best = 0;
    let bestD = Infinity;
    for (const g of this.segs) {
      const dx = g.bx - g.ax;
      const dy = g.by - g.ay;
      const k = Math.max(0, Math.min(1, ((x - g.ax) * dx + (y - g.ay) * dy) / (g.len * g.len)));
      const d = Math.hypot(g.ax + dx * k - x, g.ay + dy * k - y);
      if (d < bestD) { bestD = d; best = g.s0 + g.len * k; }
    }
    return best;
  }

  /** 当前所在的格子下标：最大的 i 使得 cellS[i] <= s */
  cellIndexAt(s) {
    const cs = this.cellS;
    if (!cs.length) return 0;
    let lo = 0;
    let hi = cs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cs[mid] <= s) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /** 按里程均匀采样，供「焚」等招式挑落点 */
  sample(step, from = 0, to = this.total) {
    const out = [];
    for (let s = from; s <= to; s += step) out.push({ s, ...this.pointAt(s) });
    return out;
  }
}

if (typeof window !== 'undefined') window.PathTrack = PathTrack;
