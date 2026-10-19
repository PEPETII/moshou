// UI：鼠标输入、拖拽与共用交互助手
// 触摸输入见 js/ui/input-touch.js（按输入能力分流，避免两套逻辑互相干扰）
UI.prototype.setupEventListeners = function() {
    const mouseMoveHandler = (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (result) {
        this.hoveredCell = { gx: result.gx, gy: result.gy };
      } else {
        this.hoveredCell = null;
      }
    };
    this.addTrackedEventListener(this.canvas, "mousemove", mouseMoveHandler);

    const mouseLeaveHandler = () => {
      this.hoveredCell = null;
    };
    this.addTrackedEventListener(this.canvas, "mouseleave", mouseLeaveHandler);

    const clickHandler = (e) => {
      if (this.suppressNextCanvasClick) {
        this.suppressNextCanvasClick = false;
        return;
      }

      // 如果拖拽刚完成，忽略点击
      if (this.dragJustCompleted) return;

      // 镜头平移松手时合成的点击不算选塔
      const cam = this.canvas.camera;
      if (cam && cam.wasJustPanned()) return;

      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;

      const tower = this.game.getTowerAt(gx, gy);
      if (tower) {
        this.selectAndShowTower(tower, e.clientX, e.clientY, "mouse");
      } else {
        this.clearTowerSelection();
      }
    };
    this.addTrackedEventListener(this.canvas, "click", clickHandler);

    // 右键也可关闭当前炮塔信息面板。
    const contextMenuHandler = (e) => {
      e.preventDefault();
      this.clearTowerSelection();
    };
    this.addTrackedEventListener(this.canvas, "contextmenu", contextMenuHandler);

    const sellBtn = document.querySelector(".sell-btn");
    if (sellBtn) {
      this.addTrackedEventListener(sellBtn, "click", () => {
        if (this.selectedTower) {
          this.game.sellTower(this.selectedTower);
          this.selectedTower = null;
          this.hideTowerInfo();
        }
      });
    }

    // === 拖拽事件监听（鼠标） ===
    this.setupDragAndDrop();
    this.setupPlacementDragEvents();

    // === 触摸输入（仅在有触摸硬件时注册，避免与鼠标路径重复） ===
    if (window.DeviceProfile && window.DeviceProfile.hasTouch) {
      this.setupTouchInteraction();
    }

};

// === 共用交互助手 ===
/**
 * 按显式类型放置炮塔；失败时沿用现有原因提示。
 */
UI.prototype.tryPlaceTowerAt = function(gx, gy, type) {
    if (!type) return false;

    const reason = this.game.getPlacementBlockReason
      ? this.game.getPlacementBlockReason(type, gx, gy)
      : null;

    if (reason) {
      this.showToast(reason, "warning");
      return false;
    }

    return !!this.game.placeTower(type, gx, gy);
};

/**
 * 选中炮塔并显示信息面板
 * @param {Object} tower
 * @param {number} x 触点/鼠标 clientX
 * @param {number} y 触点/鼠标 clientY
 * @param {string} source "touch" | "mouse" —— 触摸端面板需要避让手指
 */
UI.prototype.selectAndShowTower = function(tower, x, y, source) {
    this.selectedTower = tower;
    this.showTowerInfo(tower, x, y, source || "mouse");
};

/**
 * 清空已选炮塔和信息面板。
 */
UI.prototype.clearTowerSelection = function() {
    this.selectedTower = null;
    this.hideTowerInfo();
};

// === 从塔卡到战场的新炮塔拖放 ===
UI.prototype.setupPlacementDragEvents = function() {
    this.addTrackedEventListener(document, "pointermove", (e) => {
      this.updatePlacementDrag(e);
    });
    this.addTrackedEventListener(document, "pointerup", (e) => {
      this.finishPlacementDrag(e);
    });
    this.addTrackedEventListener(document, "pointercancel", (e) => {
      this.cancelPlacementDrag(e.pointerId);
    });
    this.addTrackedEventListener(document, "lostpointercapture", (e) => {
      // 只认我们主动捕获的那张塔卡。触摸按下时浏览器会把指针隐式捕获在被按的子元素（.tower-char）上，
      // 改由塔卡 setPointerCapture 时，子元素会收到一次 lostpointercapture —— 那不是拖拽被打断（P4 修复）。
      const drag = this.placementDrag;
      if (drag && drag.captureEl && e.target !== drag.captureEl) return;
      this.cancelPlacementDrag(e.pointerId);
    });
};

UI.prototype.beginPlacementDrag = function(e, type) {
    if ((e.button !== undefined && e.button !== 0) || e.isPrimary === false) return;
    if (e.preventDefault) e.preventDefault();

    const config = CONFIG.TOWERS[type];
    if (!config) return;
    if (this.game.ink < config.cost) {
      this.showToast(`墨水不足（需 ${config.cost} 墨）`, "warning");
      this.refreshTowerSelectAffordability();
      return;
    }
    if (this.placementDrag && this.placementDrag.active) return;

    this.placementDrag = {
      active: true,
      type,
      pointerId: e.pointerId,
      pointerType: e.pointerType || "mouse",
      clientX: e.clientX,
      clientY: e.clientY,
      gx: null,
      gy: null,
    };
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        this.placementDrag.captureEl = e.currentTarget;
      } catch (error) {
        // Pointer 捕获不可用时，document 级监听仍可处理普通拖动。
      }
    }
    this.selectedTower = null;
    this.hideTowerInfo();
};

UI.prototype.updatePlacementDrag = function(e) {
    const drag = this.placementDrag;
    if (!drag || !drag.active || drag.pointerId !== e.pointerId) return;

    drag.clientX = e.clientX;
    drag.clientY = e.clientY;
    const cell = getGridFromEvent(e, this.canvas);
    drag.gx = cell ? cell.gx : null;
    drag.gy = cell ? cell.gy : null;
    this.hoveredCell = cell ? { gx: cell.gx, gy: cell.gy } : null;
};

// 镜头在指针不动时仍会滚动（边缘自动滚动、键盘），每帧按最新镜头重算落点格
UI.prototype.syncPlacementDragCell = function() {
    const drag = this.placementDrag;
    if (!drag || !drag.active) return;
    const cell = getGridFromEvent({ clientX: drag.clientX, clientY: drag.clientY }, this.canvas);
    drag.gx = cell ? cell.gx : null;
    drag.gy = cell ? cell.gy : null;
    this.hoveredCell = cell ? { gx: cell.gx, gy: cell.gy } : null;
};

UI.prototype.finishPlacementDrag = function(e) {
    const drag = this.placementDrag;
    if (!drag || !drag.active || drag.pointerId !== e.pointerId) return;

    this.updatePlacementDrag(e);
    const { type, gx, gy } = drag;
    this.resetPlacementDrag();

    // pointerup 后浏览器可能合成 click；不要让它变成一次额外的 Canvas 点选。
    this.suppressNextCanvasClick = true;
    setTimeout(() => { this.suppressNextCanvasClick = false; }, 0);

    if (gx !== null && gy !== null) this.tryPlaceTowerAt(gx, gy, type);
};

UI.prototype.cancelPlacementDrag = function(pointerId) {
    const drag = this.placementDrag;
    if (!drag || !drag.active) return;
    if (pointerId !== undefined && drag.pointerId !== pointerId) return;
    this.resetPlacementDrag();
};

UI.prototype.resetPlacementDrag = function() {
    this.placementDrag = {
      active: false,
      type: null,
      pointerId: null,
      pointerType: null,
      clientX: 0,
      clientY: 0,
      gx: null,
      gy: null,
    };
    this.hoveredCell = null;
};

/**
 * 在触点附近拾取炮塔（带容差）
 *
 * 容差只用于"点中一座已存在的塔"——这是一次没有副作用的读取操作，宽容一些更符合手指精度；
 * 放置炮塔则严格要求落在目标格上，避免误花墨水。
 */
UI.prototype.pickTowerNear = function(clientX, clientY, options) {
    const opts = options || {};
    const tolerance = opts.tolerance;
    const canvas = this.canvas;
    const towers = this.game.towers || [];

    if (!towers.length) return null;

    // 世界坐标 = 画布坐标 + 镜头偏移（统一走 clientToWorld）
    const world = clientToWorld(clientX, clientY, canvas);
    if (!world) return null;
    const px = world.x;
    const py = world.y;

    // 先做严格的格命中，命中就直接返回
    const gx = Math.floor(px / CONFIG.CELL_SIZE);
    const gy = Math.floor(py / CONFIG.CELL_SIZE);
    const direct = this.game.getTowerAt(gx, gy);
    if (direct && direct !== opts.exclude) return direct;

    if (!(tolerance > 0)) return null;

    const maxDistance = tolerance * CONFIG.CELL_SIZE;
    let best = null;
    let bestDistance = Infinity;

    for (const tower of towers) {
      if (tower === opts.exclude) continue;
      const pos = gridToPixel(tower.gx, tower.gy);
      const d = distance(px, py, pos.x, pos.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = tower;
      }
    }

    return bestDistance <= maxDistance ? best : null;
};

// === 拖拽系统（鼠标） ===
UI.prototype.setupDragAndDrop = function() {
    const mouseDownHandler = (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        // 缓存拖拽所需的 canvas 尺寸信息
        this._cacheDragMetrics();
      }
    };
    this.addTrackedEventListener(this.canvas, 'mousedown', mouseDownHandler);

    const dragMouseMoveHandler = (e) => {
      if (this.draggingTower) {
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };

        // 检查是否达到拖拽阈值
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);

        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'mousemove', dragMouseMoveHandler);

    const mouseUpHandler = (e) => {
      if (this.draggingTower && this.isDragging) {
        const targetTower = this.pickTowerNear(e.clientX, e.clientY, {
          exclude: this.draggingTower,
          tolerance: 0.5
        });
        if (targetTower) {
          this.rejectTowerDrop();
        }

        // 标记拖拽刚完成，防止触发点击事件
        this.dragJustCompleted = true;
        setTimeout(() => { this.dragJustCompleted = false; }, 50);
      }

      this._resetDragState();
    };
    this.addTrackedEventListener(this.canvas, 'mouseup', mouseUpHandler);

    // 鼠标离开画布时取消拖拽
    const dragMouseLeaveHandler = () => {
      this._resetDragState();
    };
    this.addTrackedEventListener(this.canvas, 'mouseleave', dragMouseLeaveHandler);
};

UI.prototype._resetDragState = function() {
    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this._clearDragCache();
};

// 炮塔不可叠放：拖到另一座塔上一律拒绝，拖拽预览消失，塔留在原位
UI.prototype.rejectTowerDrop = function() {
    this.showToast('炮塔不可叠放', 'warning');
};

// 绘制拖拽预览（由 Game.draw 调用）
UI.prototype.drawDragPreview = function(ctx) {
    if (!this.isDragging || !this.draggingTower) return;

    // 使用缓存的 rect 和比例计算，避免每帧重新计算
    // 画布坐标 + 镜头偏移 = 世界坐标（本函数在世界层内绘制）
    const cam = this.canvas.camera;
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX + (cam ? cam.x : 0);
    const y = (this.dragCurrentPos.y - this._dragRectTop) * this._dragScaleY;

    // 触摸端看不到鼠标光标，必须显式画出"松手会落在哪一格"
    const target = pixelToGrid(x, y);
    ctx.save();
    ctx.strokeStyle = "rgba(180, 71, 58, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      target.gx * CONFIG.CELL_SIZE,
      target.gy * CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE,
      CONFIG.CELL_SIZE
    );
    ctx.restore();

    const rangeInPixels = this.draggingTower.range * CONFIG.CELL_SIZE;
    ctx.beginPath();
    ctx.arc(x, y, rangeInPixels, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(176, 58, 46, 0.35)";
    ctx.stroke();
    ctx.fillStyle = "rgba(176, 58, 46, 0.1)";
    ctx.fill();

    if (this.draggingTower.gl) {
      GlyphTower.drawGhost(ctx, this.draggingTower.type, x, y, 0.6);
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = `bold 28px ${CONFIG.FONTS.BRUSH}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1c1a17';
    ctx.fillText(this.draggingTower.char, x, y);
    ctx.restore();
};

// 缓存拖拽所需的 canvas 尺寸信息
UI.prototype._cacheDragMetrics = function() {
    const rect = this.canvas.getBoundingClientRect();
    this._dragRectLeft = rect.left;
    this._dragRectTop = rect.top;
    this._dragScaleX = 1 / (rect.width / canvasLogicalW(this.canvas));
    this._dragScaleY = 1 / (rect.height / canvasLogicalH(this.canvas));
};

// 清理拖拽缓存
UI.prototype._clearDragCache = function() {
    this._dragRectLeft = null;
    this._dragRectTop = null;
    this._dragScaleX = null;
    this._dragScaleY = null;
};
