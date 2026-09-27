// UI：触摸输入（移动端主路径）
//
// Canvas 触摸只负责查看炮塔与拖动已有炮塔融合。
// 新炮塔放置由卡片 Pointer Events 处理，避免这里再出现第二套建造入口。
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

      // ② 滑动取消：空白处滑过再抬起，不触发塔信息查看
      if (st.moved) {
        this._resetDragState();
        clearPreviewSoon();
        return;
      }

      // ③ 干净轻点（按下点与抬起点几乎重合）
      if (st.tower) {
        // 点中已有炮塔：显示信息面板（触摸端无 hover，这是唯一入口）
        this.selectAndShowTower(st.tower, st.origin.x, st.origin.y, 'touch');
      } else {
        // 点空白处 = 关闭已选炮塔的信息面板
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
