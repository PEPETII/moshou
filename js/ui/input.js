// UI：输入、拖拽和融合交互
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
      // 如果拖拽刚完成，忽略点击
      if (this.dragJustCompleted) return;

      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;

      if (this.selectedTowerType) {
        const placed = this.game.placeTower(this.selectedTowerType, gx, gy);
        if (placed) {
        }
      } else {
        const tower = this.game.getTowerAt(gx, gy);
        if (tower) {
          this.selectedTower = tower;
          this.showTowerInfo(tower, e.clientX, e.clientY);
        } else {
          this.selectedTower = null;
          this.hideTowerInfo();
        }
      }
    };
    this.addTrackedEventListener(this.canvas, "click", clickHandler);

    const contextMenuHandler = (e) => {
      e.preventDefault();
      this.selectedTowerType = null;
      document
        .querySelectorAll(".tower-select")
        .forEach((t) => t.classList.remove("selected"));
    };
    this.addTrackedEventListener(this.canvas, "contextmenu", contextMenuHandler);

    // === 触摸事件支持 ===
    // 防止触摸时页面滚动
    const touchStartHandler = (e) => {
      e.preventDefault();
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', touchStartHandler, { passive: false });

    const touchMoveHandler = (e) => {
      e.preventDefault();

      // 更新悬停格子位置，用于预选炮塔时的攻击范围预览
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const result = getGridFromEvent(touch, this.canvas);
        if (result) {
          this.hoveredCell = { gx: result.gx, gy: result.gy };
        } else {
          this.hoveredCell = null;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', touchMoveHandler, { passive: false });

    // 触摸结束处理
    // 注意：touchend 使用 passive: true 以提高滚动性能，因为不需要阻止默认行为
    const touchEndHandler = (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const result = getGridFromEvent(touch, this.canvas);
        if (!result) return;

        const { gx, gy } = result;

        if (this.selectedTowerType) {
          this.game.placeTower(this.selectedTowerType, gx, gy);
        } else {
          const tower = this.game.getTowerAt(gx, gy);
          if (tower) {
            this.selectedTower = tower;
            this.showTowerInfo(tower, touch.clientX, touch.clientY);
          } else {
            this.selectedTower = null;
            this.hideTowerInfo();
          }
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchend', touchEndHandler, { passive: true });

    // 长按显示炮塔信息（移动端)
    this.longPressTimer = null;
    this.longPressDelay = CONFIG.GAMEPLAY?.longPressDelay || 500; // 长按阈值(ms)

    const longPressTouchStartHandler = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);

      if (tower && !this.selectedTowerType) {
        this.longPressTimer = setTimeout(() => {
          this.selectedTower = tower;
          this.showTowerInfo(tower, touch.clientX, touch.clientY);
        }, this.longPressDelay);
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', longPressTouchStartHandler, { passive: false });

    const longPressTouchEndHandler = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchend', longPressTouchEndHandler, { passive: false });

    const longPressTouchMoveHandler = (e) => {
      // 多点触控时清除长按定时器
      if (e.touches.length !== 1 && this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', longPressTouchMoveHandler, { passive: false });

    // 触摸取消时清理长按定时器
    const longPressTouchCancelHandler = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchcancel', longPressTouchCancelHandler, { passive: false });

    const startWaveBtn = document.getElementById("start-wave");
    if (startWaveBtn) {
      this.addTrackedEventListener(startWaveBtn, "click", () => {
        this.game.startWave();
      });
    }

    const upgradeBtn = document.querySelector(".upgrade-btn");
    if (upgradeBtn) {
      this.addTrackedEventListener(upgradeBtn, "click", () => {
        if (this.selectedTower) {
          const upgraded = this.selectedTower.upgrade();
          if (upgraded) {
          }
          this.showTowerInfo(
            this.selectedTower,
            parseFloat(this.towerInfo.style.left) +
              this.towerInfo.offsetWidth / 2,
            parseFloat(this.towerInfo.style.top) +
              this.towerInfo.offsetHeight / 2,
          );
          this.game.updateUI();
        }
      });
    }

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

    // === 拖拽融合事件监听 ===
    this.setupDragAndDrop();
  
};
// === 拖拽融合系统 ===
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
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const targetTower = this.game.getTowerAt(gx, gy);
          if (targetTower && targetTower !== this.draggingTower) {
            this.attemptFusion(this.draggingTower, targetTower);
          }
        }

        // 标记拖拽刚完成，防止触发点击事件
        this.dragJustCompleted = true;
        setTimeout(() => { this.dragJustCompleted = false; }, 50);
      }

      // 重置拖拽状态并清理缓存
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'mouseup', mouseUpHandler);

    // 鼠标离开画布时取消拖拽
    const dragMouseLeaveHandler = () => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'mouseleave', dragMouseLeaveHandler);

    // === 触摸拖拽支持 ===
    const dragTouchStartHandler = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.game.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        this.isDragging = false;
        // 缓存拖拽所需的 canvas 尺寸信息
        this._cacheDragMetrics();
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchstart', dragTouchStartHandler, { passive: false });

    const dragTouchMoveHandler = (e) => {
      // 多点触控时取消拖拽状态
      if (e.touches.length !== 1) {
        this.draggingTower = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.isDragging = false;
        return;
      }
      if (this.draggingTower) {
        const touch = e.touches[0];
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };

        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);

        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    };
    this.addTrackedEventListener(this.canvas, 'touchmove', dragTouchMoveHandler, { passive: false });

    const dragTouchEndHandler = (e) => {
      // 多点触控场景下，如果还有剩余触摸点，不处理拖拽结束
      if (e.touches.length > 0) {
        return;
      }
      if (this.draggingTower && this.isDragging) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const result = getGridFromEvent(touch, this.canvas);
          if (result) {
            const { gx, gy } = result;
            const targetTower = this.game.getTowerAt(gx, gy);
            if (targetTower && targetTower !== this.draggingTower) {
              this.attemptFusion(this.draggingTower, targetTower);
            }
          }
        }

        // 标记拖拽刚完成，防止触发点击事件
        this.dragJustCompleted = true;
        setTimeout(() => { this.dragJustCompleted = false; }, 50);
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'touchend', dragTouchEndHandler, { passive: false });

    // 触摸取消时清理拖拽状态
    const touchCancelHandler = () => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    };
    this.addTrackedEventListener(this.canvas, 'touchcancel', touchCancelHandler, { passive: false });
  
};
UI.prototype.attemptFusion = function(tower1, tower2) {
    const preview = this.game.getFusionPreview(tower1, tower2);
    if (!preview) {
      // 无法融合，显示提示
      this.showFusionFailed();
      return;
    }

    // 显示融合确认弹窗
    this.showFusionConfirm(tower1, tower2, preview);
  
};
UI.prototype.showFusionConfirm = function(tower1, tower2, preview) {
    const canFuse = this.game.canFuse(tower1, tower2);

    let message = `将 ${tower1.char} 和 ${tower2.char} 融合成 ${preview.char}\n`;
    message += `效果: ${preview.desc}\n`;
    message += `费用: ${preview.cost}金\n`;
    if (preview.tier) {
      message += `阶位: T${preview.tier}${preview.isEvolution ? ' (进化)' : ''}\n`;
    }
    if (preview.onPath) {
      message += `约束: 该融合塔必须位于路径格\n`;
    }

    if (!canFuse && !preview.canAfford) {
      message += `\n⚠️ 金币不足!`;
    } else if (!canFuse && preview.canAfford) {
      message += `\n⚠️ 当前组合不满足融合条件（进化白名单或路径限制）`;
    }

    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    const btnEl = document.getElementById('modal-btn');

    titleEl.textContent = '融合炮塔';
    textEl.textContent = message;
    btnEl.textContent = canFuse ? '确认融合' : '取消';
    btnEl.disabled = false;
    modal.classList.remove('hidden');

    // 清理之前可能存在的事件监听器
    this._cleanupFusionModalListeners();

    // 保存融合信息
    this.pendingFusion = canFuse ? { tower1, tower2 } : null;
    this._fusionProcessing = false; // 初始化处理标志位

    // 使用 addEventListener 绑定事件，避免覆盖其他处理器
    this._fusionConfirmHandler = () => {
      // 防抖：防止重复处理
      if (this._fusionProcessing) return;
      this._fusionProcessing = true;
      
      // 禁用按钮防止重复点击
      btnEl.disabled = true;
      
      if (this.pendingFusion) {
        this.game.fuseTowers(this.pendingFusion.tower1, this.pendingFusion.tower2);
        this.pendingFusion = null;
        this.selectedTower = null;
        this.hideTowerInfo();
      }
      this.hideModal();
    };
    
    btnEl.addEventListener('click', this._fusionConfirmHandler);
  
};
// 清理融合模态框的事件监听器
UI.prototype._cleanupFusionModalListeners = function() {
    const btnEl = document.getElementById('modal-btn');
    if (this._fusionConfirmHandler && btnEl) {
      btnEl.removeEventListener('click', this._fusionConfirmHandler);
      this._fusionConfirmHandler = null;
    }
    this.pendingFusion = null;
    this._fusionProcessing = false; // 重置处理标志位
  
};
UI.prototype.showFusionFailed = function() {
    // 简单的失败提示（可以用更优雅的方式）
    console.log('这两个炮塔无法融合');
  
};
// 绘制拖拽预览（由 Game.draw 调用）
UI.prototype.drawDragPreview = function(ctx) {
    if (!this.isDragging || !this.draggingTower) return;

    // 使用缓存的 rect 和比例计算，避免每帧重新计算
    const x = (this.dragCurrentPos.x - this._dragRectLeft) * this._dragScaleX;
    const y = (this.dragCurrentPos.y - this._dragRectTop) * this._dragScaleY;

    const rangeInPixels = this.draggingTower.range * CONFIG.CELL_SIZE;
    ctx.beginPath();
    ctx.arc(x, y, rangeInPixels, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 28px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.draggingTower.isFusion ? '#888' : '#ffff00';
    ctx.fillText(this.draggingTower.char, x, y);
    ctx.restore();
  
};
// 缓存拖拽所需的 canvas 尺寸信息
UI.prototype._cacheDragMetrics = function() {
    const rect = this.canvas.getBoundingClientRect();
    this._dragRectLeft = rect.left;
    this._dragRectTop = rect.top;
    this._dragScaleX = 1 / (rect.width / this.canvas.width);
    this._dragScaleY = 1 / (rect.height / this.canvas.height);
  
};
// 清理拖拽缓存
UI.prototype._clearDragCache = function() {
    this._dragRectLeft = null;
    this._dragRectTop = null;
    this._dragScaleX = null;
    this._dragScaleY = null;
  
};
