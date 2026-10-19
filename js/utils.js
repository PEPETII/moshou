/**
 * 工具函数集合
 * 提供游戏中常用的数学计算和坐标转换功能
 */

/**
 * 计算两点之间的距离
 * @param {number} x1 - 起点 x 坐标
 * @param {number} y1 - 起点 y 坐标
 * @param {number} x2 - 终点 x 坐标
 * @param {number} y2 - 终点 y 坐标
 * @returns {number} 两点之间的欧几里得距离
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 计算两点之间距离的平方
 * 用于性能敏感的场景，避免开方运算
 * @param {number} x1 - 起点 x 坐标
 * @param {number} y1 - 起点 y 坐标
 * @param {number} x2 - 终点 x 坐标
 * @param {number} y2 - 终点 y 坐标
 * @returns {number} 两点之间距离的平方
 */
function distanceSq(x1, y1, x2, y2) {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

/**
 * 将网格坐标转换为像素坐标
 * @param {number} gridX - 网格 x 坐标（列）
 * @param {number} gridY - 网格 y 坐标（行）
 * @returns {Object} 像素坐标对象 {x, y}
 */
function gridToPixel(gridX, gridY) {
  return {
    x: gridX * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
    y: gridY * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
  };
}

/**
 * 将像素坐标转换为网格坐标
 * @param {number} x - 像素 x 坐标
 * @param {number} y - 像素 y 坐标
 * @returns {Object} 网格坐标对象 {gx, gy}
 */
function pixelToGrid(x, y) {
  return {
    gx: Math.floor(x / CONFIG.CELL_SIZE),
    gy: Math.floor(y / CONFIG.CELL_SIZE),
  };
}

/**
 * 线性插值函数
 * 在 a 和 b 之间根据比例 t 进行插值
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} t - 插值比例 (0-1)
 * @returns {number} 插值结果
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 将数值限制在指定范围内
 * @param {number} val - 要限制的数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的数值
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 计算拖拽距离
 * @param {number} startX - 起点 x 坐标
 * @param {number} startY - 起点 y 坐标
 * @param {number} currentX - 当前 x 坐标
 * @param {number} currentY - 当前 y 坐标
 * @returns {number} 拖拽距离
 */
function calculateDragDistance(startX, startY, currentX, currentY) {
  const dx = currentX - startX;
  const dy = currentY - startY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 检查是否超过拖拽阈值
 * @param {number} distance - 拖拽距离
 * @param {number} threshold - 阈值（像素），默认为 5
 * @returns {boolean} 是否超过阈值
 */
function checkDragThreshold(distance, threshold = 5) {
  return distance > threshold;
}

/**
 * 检查坐标是否在画布边界内
 * @param {number} x - x 坐标
 * @param {number} y - y 坐标
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @returns {boolean} 是否在边界内
 */
function isInsideCanvas(x, y, canvas) {
  return x >= 0 && x <= canvasLogicalW(canvas) && y >= 0 && y <= canvasLogicalH(canvas);
}

/**
 * 客户端坐标 → 画布（屏幕/视口）坐标，已扣除 CSS 缩放。
 * 返回 null 表示画布当前没有尺寸（隐藏中）。不含镜头偏移。
 * @returns {{x:number,y:number}|null}
 */
function clientToCanvas(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: (clientX - rect.left) * (canvasLogicalW(canvas) / rect.width),
    y: (clientY - rect.top) * (canvasLogicalH(canvas) / rect.height),
  };
}

/**
 * 客户端坐标 → 世界坐标（屏幕坐标 + 镜头偏移）。
 * 镜头取自 canvas.camera（Camera 构造时挂上）；没有镜头时偏移为 0，与旧行为一致。
 * 返回的 sx/sy 是画布坐标，x/y 是世界坐标；不在视口内时 inside=false。
 */
function clientToWorld(clientX, clientY, canvas, camera) {
  const p = clientToCanvas(clientX, clientY, canvas);
  if (!p) return null;
  const cam = camera || canvas.camera;
  const offset = cam ? cam.x : 0;
  return {
    sx: p.x,
    sy: p.y,
    x: p.x + offset,
    y: p.y,
    inside: isInsideCanvas(p.x, p.y, canvas),
  };
}

/**
 * 从鼠标或触摸事件中获取网格坐标（世界格，含镜头偏移）
 * @param {MouseEvent|TouchEvent} e - 事件对象
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {Camera} [camera] - 可省略，默认取 canvas.camera
 * @returns {Object} 包含 gx, gy 网格坐标与世界坐标 x, y 的对象，如果不在视口内返回 null
 */
function getGridFromEvent(e, canvas, camera) {
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

  const w = clientToWorld(clientX, clientY, canvas, camera);
  if (!w || !w.inside) return null;

  const gx = Math.floor(w.x / CONFIG.CELL_SIZE);
  const gy = Math.floor(w.y / CONFIG.CELL_SIZE);

  return { gx, gy, x: w.x, y: w.y, sx: w.sx, sy: w.sy };
}

/**
 * 画布的逻辑尺寸（游戏坐标系）。高清渲染后位图尺寸 = 逻辑尺寸 × 倍率，
 * 所有把 canvas 当坐标系用的地方都必须读这里，不能直接读 canvas.width/height。
 */
function canvasLogicalW(canvas) { return canvas.logicalWidth || canvas.width; }
function canvasLogicalH(canvas) { return canvas.logicalHeight || canvas.height; }

/**
 * 高清渲染倍率：战场画布按「屏幕实际像素」生成位图，避免被 CSS 放大后发糊。
 *   倍率 k = dpr × 画布 CSS 显示宽度 / 逻辑宽度，限制在 [1, MAX]，按 STEP 取整防止拖窗时反复重建。
 *   画布上挂 logicalWidth/logicalHeight/renderScale，离屏层（静态层、墨渍层、地图缓存）读 renderScale 跟随。
 * 不受变换影响的像素量（ctx.filter 的 blur、shadowBlur）需由调用方乘 renderScale。
 */
const RenderScale = {
  MAX: 3,
  STEP: 0.25,
  INTERVAL: 250, // ms，倍率最多每隔这么久重新测量一次

  measure(canvas) {
    if (typeof window === 'undefined' || !canvas.getBoundingClientRect) return 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return canvas.renderScale || 1; // 隐藏中：沿用上次倍率
    const raw = (window.devicePixelRatio || 1) * rect.width / canvasLogicalW(canvas);
    const k = Math.ceil(raw / this.STEP) * this.STEP;
    return Math.min(this.MAX, Math.max(1, k));
  },

  /** 设定逻辑尺寸并按当前倍率生成位图 */
  setup(canvas, logicalW, logicalH) {
    canvas.logicalWidth = logicalW;
    canvas.logicalHeight = logicalH;
    // 显示尺寸钉死为逻辑尺寸：未设 CSS 尺寸的画布会按位图尺寸显示，
    // 位图一放大显示也跟着变大，倍率又按显示宽度测量 → 自激放大到上限
    if (canvas.style) {
      canvas.style.width = logicalW + 'px';
      canvas.style.height = logicalH + 'px';
    }
    canvas.renderScale = 0;
    canvas._scaleCheckedAt = -Infinity;
    this.sync(canvas, true);
  },

  /** 倍率变化时重建位图；返回本次是否发生了变化 */
  sync(canvas, force) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - (canvas._scaleCheckedAt || -Infinity) < this.INTERVAL) return false;
    canvas._scaleCheckedAt = now;
    const k = this.measure(canvas);
    if (k === canvas.renderScale) return false;
    canvas.renderScale = k;
    canvas.width = Math.round(canvasLogicalW(canvas) * k);
    canvas.height = Math.round(canvasLogicalH(canvas) * k);
    return true;
  },

  /** 每帧绘制前调用：同步倍率并把坐标系设回逻辑像素 */
  begin(canvas, ctx) {
    this.sync(canvas);
    const k = canvas.renderScale || 1;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return k;
  },
};

// 导出工具函数（用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { distance, distanceSq, gridToPixel, pixelToGrid, clientToCanvas, clientToWorld, getGridFromEvent, lerp, clamp, calculateDragDistance, checkDragThreshold, isInsideCanvas, canvasLogicalW, canvasLogicalH, RenderScale };
}
