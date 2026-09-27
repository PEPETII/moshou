// 征服模式：触摸输入（移动端主路径）
//
// 与塔防模式（js/ui/input-touch.js）保持同一套交互契约，避免两个模式手感不一致：
//   1. 按住即预览：触摸端没有 hover，落点高亮是唯一的"松手前确认"通道。
//      旧实现里 hoveredCell 只在 mousemove 赋值，导致拖拽预览在手机上永不出现。
//   2. 拾取塔带容差（DeviceProfile.tapTolerance = 0.75 格）：点中已有炮塔是无副作用的读取，
//      宽容一些更符合手指精度；严格命中会让"点塔边缘"变成完全无反应。
//   3. 位移超过 slop（触屏 12px）才算拖拽，避免手指自然抖动把"轻点看信息"变成"移动炮塔"。
//   4. 移动炮塔取抬起点（拖到哪放哪，不消耗资源，符合直觉），但失败必须给出原因。
//   5. 失败必须有可见反馈：触屏没有 hover，静默 return 在玩家视角等于"点了没反应"。
(function initConquestTouch() {
  'use strict';

  var FALLBACK = { slop: 12, tapTolerance: 0.75, previewHoldMs: 260, isTouch: true };

  function profile() {
    return window.DeviceProfile || FALLBACK;
  }

  function findTouchById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  // 轻提示：优先复用塔防模式的 toast（UI.prototype.showToast），没有 UI 实例时降级
  ConquestGame.prototype._notify = function (message, type) {
    if (!message) return;
    var ui = window.gameInstance && window.gameInstance.ui;
    if (ui && typeof ui.showToast === 'function') {
      ui.showToast(message, type || 'warning');
      return;
    }
    console.warn('[征服模式] ' + message);
  };

  // 在触点附近拾取炮塔：先严格格命中，再按容差取最近的一座
  ConquestGame.prototype._pickTowerNear = function (clientX, clientY, options) {
    var opts = options || {};
    var towers = this.towers || [];
    if (!towers.length) return null;

    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    var px = (clientX - rect.left) * (this.canvas.width / rect.width);
    var py = (clientY - rect.top) * (this.canvas.height / rect.height);

    var direct = this.getTowerAt(
      Math.floor(px / CONFIG.CELL_SIZE),
      Math.floor(py / CONFIG.CELL_SIZE)
    );
    if (direct && direct !== opts.exclude) return direct;

    var tolerance = opts.tolerance;
    if (!(tolerance > 0)) return null;

    var maxDistance = tolerance * CONFIG.CELL_SIZE;
    var best = null;
    var bestDistance = Infinity;

    for (var i = 0; i < towers.length; i++) {
      var tower = towers[i];
      if (tower === opts.exclude) continue;
      var pos = gridToPixel(tower.gx, tower.gy);
      var d = distance(px, py, pos.x, pos.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = tower;
      }
    }

    return bestDistance <= maxDistance ? best : null;
  };

  // 把手指所在格写成 hoveredCell，供 drawDragPlacementPreview 绘制落点
  ConquestGame.prototype._hoverCellAt = function (clientX, clientY) {
    var cell = getGridFromEvent({ clientX: clientX, clientY: clientY }, this.canvas);
    this.hoveredCell = cell ? { gx: cell.gx, gy: cell.gy } : null;
    return cell;
  };

  // 松手后短暂保留落点高亮，便于玩家确认结果
  ConquestGame.prototype._scheduleHoverClear = function () {
    if (this._hoverClearTimer) {
      clearTimeout(this._hoverClearTimer);
      this._hoverClearTimer = null;
    }
    var hold = profile().previewHoldMs || 0;
    if (hold <= 0) {
      this.hoveredCell = null;
      return;
    }
    this._hoverClearTimer = setTimeout(
      function () {
        this.hoveredCell = null;
        this._hoverClearTimer = null;
      }.bind(this),
      hold
    );
  };

  ConquestGame.prototype._clearTouchState = function () {
    if (this._hoverClearTimer) {
      clearTimeout(this._hoverClearTimer);
      this._hoverClearTimer = null;
    }
    this._touchState = null;
    this.hoveredCell = null;
    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this._dragSource = null;
    this._clearDragCache();
  };

  // 移动失败的原因文本（触屏无 hover，必须给出可读原因）
  ConquestGame.prototype._moveBlockReason = function (tower, gx, gy) {
    if (!this._placementGridSet.has(gx + ',' + gy)) return '只能移动到内圈空地';
    var occupant = this.getTowerAt(gx, gy);
    if (occupant && occupant !== tower) return '该格已有炮塔';
    return '无法移动到该格';
  };

  ConquestGame.prototype.setupTouchInteraction = function () {
    var self = this;
    var canvas = this.canvas;

    var resetDrag = function () {
      self.draggingTower = null;
      self.dragStartPos = null;
      self.dragCurrentPos = null;
      self.isDragging = false;
      self._dragSource = null;
      self._clearDragCache();
    };

    // 移动端提供“点选后再点目标”的融合路径。
    // 拖拽仍然保留，用于移动炮塔和熟悉桌面操作的玩家；两条路径共享同一套融合校验。
    var handleTap = function (tower, clientX, clientY) {
      var selected = null;
      for (var i = 0; i < self.towers.length; i++) {
        if (self.towers[i].selected) {
          selected = self.towers[i];
          break;
        }
      }

      if (tower && selected && selected !== tower) {
        self.attemptFusion(selected, tower);
        return;
      }

      if (tower) {
        self.showTowerInfo(tower, clientX, clientY);
      } else {
        self.hideTowerInfo();
      }
    };

    var onTouchStart = function (e) {
      // 阻止默认行为同时抑制合成鼠标事件，避免同一操作走两套处理链
      e.preventDefault();

      if (self.gameEnded) return;
      if (e.touches.length !== 1) {
        self._touchState = null;
        resetDrag();
        self.hoveredCell = null;
        return;
      }

      var touch = e.touches[0];
      var cell = self._hoverCellAt(touch.clientX, touch.clientY);
      if (!cell) {
        self._touchState = null;
        return;
      }

      if (self._hoverClearTimer) {
        clearTimeout(self._hoverClearTimer);
        self._hoverClearTimer = null;
      }

      self._touchState = {
        id: touch.identifier,
        origin: { x: touch.clientX, y: touch.clientY },
        cell: { gx: cell.gx, gy: cell.gy },
        tower: self._pickTowerNear(touch.clientX, touch.clientY, {
          tolerance: profile().tapTolerance
        }),
        moved: false,
        dragging: false
      };
    };

    var onTouchMove = function (e) {
      e.preventDefault();

      var st = self._touchState;
      if (!st || e.touches.length !== 1) {
        self._touchState = null;
        resetDrag();
        self.hoveredCell = null;
        return;
      }

      var touch = findTouchById(e.touches, st.id) || e.touches[0];
      var dist = calculateDragDistance(
        st.origin.x, st.origin.y, touch.clientX, touch.clientY
      );
      if (dist > profile().slop) st.moved = true;

      // 手指当前所在格 → 落点预览（移动端唯一的"松手前确认"通道）
      self._hoverCellAt(touch.clientX, touch.clientY);

      if (st.moved && st.tower && !st.tower.isFusion) {
        if (!st.dragging) {
          st.dragging = true;
          self._dragSource = 'touch';
          self._cacheDragMetrics();
        }
        self.draggingTower = st.tower;
        self.dragStartPos = { x: st.origin.x, y: st.origin.y };
        self.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        self.isDragging = true;
      }
    };

    var onTouchEnd = function (e) {
      e.preventDefault();

      var st = self._touchState;
      self._touchState = null;
      if (!st) {
        resetDrag();
        return;
      }

      var touch = e.changedTouches[0];

      // ① 拖拽：优先按容差找融合目标，其次移动到抬起点所在格
      if (st.dragging && touch) {
        // 融合目标同样带容差：手指偏移常超过半格，严格格命中会让融合几乎点不中。
        // 误选的代价只是弹出确认框，而确认框现在有"取消"，可以放心放宽。
        var target = self._pickTowerNear(touch.clientX, touch.clientY, {
          exclude: st.tower,
          tolerance: profile().tapTolerance
        });
        if (target) {
          self.attemptFusion(st.tower, target);
        } else {
          var cell = getGridFromEvent(touch, canvas);
          if (cell) {
            if (cell.gx === st.tower.gx && cell.gy === st.tower.gy) {
              // 原地放回，不算失败
            } else if (self.canPlaceAt(cell.gx, cell.gy)) {
              self.moveTower(st.tower, cell.gx, cell.gy);
            } else {
              self._notify(self._moveBlockReason(st.tower, cell.gx, cell.gy), 'warning');
            }
          }
        }
        resetDrag();
        self._scheduleHoverClear();
        return;
      }

      // ② 滑动取消：手指滑过再抬起视为放弃操作
      if (st.moved) {
        if (st.tower && st.tower.isFusion) {
          self._notify('融合塔不可移动', 'warning');
        }
        resetDrag();
        self._scheduleHoverClear();
        return;
      }

      // ③ 干净轻点：点塔看信息，点空白关闭面板
      if (st.tower) {
        handleTap(st.tower, st.origin.x, st.origin.y);
      } else {
        self.hideTowerInfo();
      }
      resetDrag();
      self._scheduleHoverClear();
    };

    var onTouchCancel = function () {
      self._touchState = null;
      resetDrag();
      if (self._hoverClearTimer) {
        clearTimeout(self._hoverClearTimer);
        self._hoverClearTimer = null;
      }
      self.hoveredCell = null;
    };

    this.addTrackedEventListener(canvas, 'touchstart', onTouchStart, { passive: false });
    this.addTrackedEventListener(canvas, 'touchmove', onTouchMove, { passive: false });
    this.addTrackedEventListener(canvas, 'touchend', onTouchEnd, { passive: false });
    this.addTrackedEventListener(canvas, 'touchcancel', onTouchCancel, { passive: true });
  };
})();
