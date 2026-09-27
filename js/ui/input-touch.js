// UI：触摸输入（移动端主路径）
//
// 设计取舍（关键）
// ------------------------------------------------------------------
// 1. 放置必须"精确"：不做就近吸附。20×9 的战场在手机上单格约 31px，
//    自动吸附会把玩家没想点的格子也花掉墨水，属于不可逆损失。
//    改为用"按住即预览"让玩家在松手前看到落点与合法性，可自行微调。
// 2. 选塔可以"宽容"：点中一座已存在的塔是一次无副作用的读取，
//    允许 0.75 格容差，符合手指精度。
// 3. 落点取"按下格"而非"抬起格"：手指抖动不应改变目标。
// 4. 位移超过 slop（触屏 12px）后抬起 = 滑动取消，不落子。
//    旧实现用 5px（鼠标参数）且以抬起点落子，实测"按下 A 滑到 B 抬起"会在 B 落塔。
// 5. 点空白处 = 取消选中。旧实现只有右键能取消，触屏等于没有取消路径。
(function initTouchInteraction() {
  'use strict';

  function profile() {
    return window.DeviceProfile || { slop: 12, tapTolerance: 0.75, previewHoldMs: 260 };
  }

  UI.prototype.setupTouchInteraction = function () {
    const canvas = this.canvas;
    this._touchState = null;
    this._previewHoldTimer = null;

    const isBusy = () => this.game.inputLocked || this.game.gameEnded;

    const clearPreviewSoon = () => {
      if (this._previewHoldTimer) clearTimeout(this._previewHoldTimer);
      const hold = profile().previewHoldMs || 0;
      if (hold <= 0) {
        this.hoveredCell = null;
        return;
      }
      this._previewHoldTimer = setTimeout(() => {
        this.hoveredCell = null;
        this._previewHoldTimer = null;
      }, hold);
    };

    const clearPreviewNow = () => {
      if (this._previewHoldTimer) {
        clearTimeout(this._previewHoldTimer);
        this._previewHoldTimer = null;
      }
      this.hoveredCell = null;
    };

    const findTouch = (list, id) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].identifier === id) return list[i];
      }
      return null;
    };

    const onTouchStart = (e) => {
      // 触摸端画面已由 touch-action: none 锁定，仍需阻止默认行为以
      // 抑制合成鼠标事件（否则会同一次操作触发两套处理链）
      e.preventDefault();

      if (e.touches.length !== 1) {
        this._touchState = null;
        clearPreviewNow();
        return;
      }
      if (isBusy()) {
        this._touchState = null;
        return;
      }

      const touch = e.touches[0];
      const cell = getGridFromEvent(touch, canvas);
      if (!cell) {
        this._touchState = null;
        return;
      }

      if (this._previewHoldTimer) {
        clearTimeout(this._previewHoldTimer);
        this._previewHoldTimer = null;
      }

      this._touchState = {
        id: touch.identifier,
        origin: { x: touch.clientX, y: touch.clientY },
        cell: { gx: cell.gx, gy: cell.gy },
        currentCell: { gx: cell.gx, gy: cell.gy },
        tower: this.pickTowerNear(touch.clientX, touch.clientY, {
          tolerance: profile().tapTolerance
        }),
        moved: false,
        dragging: false
      };

      // 按住即预览：这是移动端唯一的"落子前确认"通道
      if (this.selectedTowerType) {
        this.hoveredCell = { gx: cell.gx, gy: cell.gy };
      }
    };
    this.addTrackedEventListener(canvas, 'touchstart', onTouchStart, { passive: false });

    const onTouchMove = (e) => {
      e.preventDefault();

      const st = this._touchState;
      if (!st || e.touches.length !== 1) {
        this._touchState = null;
        this._resetDragState();
        clearPreviewNow();
        return;
      }

      const touch = findTouch(e.touches, st.id) || e.touches[0];
      const dist = calculateDragDistance(
        st.origin.x, st.origin.y, touch.clientX, touch.clientY
      );

      // 触屏 slop 放宽到 12px：手指按下后的自然抖动普遍 6~10px，
      // 用鼠标的 5px 阈值会把"轻点"误判成"拖拽"，实测会导致放置直接失败
      if (dist > profile().slop) st.moved = true;

      if (this.selectedTowerType) {
        const cell = getGridFromEvent(touch, canvas);
        if (cell) {
          this.hoveredCell = { gx: cell.gx, gy: cell.gy };
          st.currentCell = { gx: cell.gx, gy: cell.gy };
        }
      }

      // 拖拽融合：只有真正移动了才进入拖拽态
      if (st.moved && st.tower && !st.tower.isFusion) {
        st.dragging = true;
        this.draggingTower = st.tower;
        this.dragStartPos = { x: st.origin.x, y: st.origin.y };
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        this.isDragging = true;
        if (!this._dragRectLeft) this._cacheDragMetrics();
      }
    };
    this.addTrackedEventListener(canvas, 'touchmove', onTouchMove, { passive: false });

    const onTouchEnd = (e) => {
      e.preventDefault();

      const st = this._touchState;
      this._touchState = null;

      if (!st) {
        this._resetDragState();
        return;
      }

      // ① 拖拽融合：用抬起点的位置找目标塔（带容差）
      if (st.dragging) {
        const touch = e.changedTouches[0];
        if (touch) {
          const target = this.pickTowerNear(touch.clientX, touch.clientY, {
            exclude: st.tower,
            tolerance: 0.5
          });
          if (target) this.attemptFusion(st.tower, target);
        }
        this._resetDragState();
        clearPreviewSoon();
        return;
      }

      // ② 滑动取消：手指滑过再抬起，视为放弃操作
      if (st.moved) {
        this._resetDragState();
        clearPreviewSoon();
        return;
      }

      // ③ 干净轻点（按下点与抬起点几乎重合）
      if (st.tower) {
        // 点中已有炮塔：显示信息面板（触摸端无 hover，这是唯一入口）
        this.selectAndShowTower(st.tower, st.origin.x, st.origin.y, 'touch');
      } else if (this.selectedTowerType) {
        // 落点用按下格，防止抬起瞬间的手指位移影响判断
        this.tryPlaceTowerAt(st.cell.gx, st.cell.gy);
      } else {
        // 点空白处 = 取消选中（同时清掉卡牌高亮）
        this.clearTowerSelection();
      }

      this._resetDragState();
      clearPreviewSoon();
    };
    this.addTrackedEventListener(canvas, 'touchend', onTouchEnd, { passive: false });

    const onTouchCancel = () => {
      this._touchState = null;
      this._resetDragState();
      clearPreviewNow();
    };
    this.addTrackedEventListener(canvas, 'touchcancel', onTouchCancel, { passive: true });
  };
})();
