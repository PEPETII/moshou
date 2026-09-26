// 未归类兼容方法
/**
   * 添加受追踪的事件监听器
   * @param {EventTarget} target - 事件目标
   * @param {string} type - 事件类型
   * @param {Function} listener - 事件监听器
   * @param {Object|boolean} options - 事件选项
   */
ConquestGame.prototype.addTrackedEventListener = function(target, type, listener, options) {
    if (!target) {
      console.warn(`[征服模式] UI事件绑定失败: 目标元素不存在 (事件类型: ${type})`);
      return;
    }

    // 防御性检查：防止重复添加相同的事件监听器
    const isDuplicate = this._eventListeners.some(
      (item) => item.target === target && item.type === type && item.listener === listener
    );
    if (isDuplicate) {
      console.warn(`重复的事件监听器被阻止: ${type} on`, target);
      return;
    }

    target.addEventListener(type, listener, options);
    this._eventListeners.push({ target, type, listener, options });
  
};
/**
   * 销毁游戏对象，清理所有事件监听器
   */
ConquestGame.prototype.destroy = function() {
    // 停止游戏循环
    this.stop();

    // 清理 spawn 定时器
    if (this.spawnTimerId) {
      clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }

    // 移除所有追踪的事件监听器
    if (this._eventListeners && this._eventListeners.length > 0) {
      for (const { target, type, listener, options } of this._eventListeners) {
        if (target) {
          try {
            target.removeEventListener(type, listener, options);
          } catch (e) {
            console.warn(`移除事件监听器失败: ${type}`, e);
          }
        }
      }
    }

    // 清空事件监听器数组
    this._eventListeners = [];
    this._uiEventsActive = false;

    // 清理融合模态框监听器
    this._cleanupFusionModalListeners();

    // 清理键盘快捷键
    this.cleanupKeyboardShortcuts();

    // 清理拖拽状态
    this.draggingTower = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.isDragging = false;
    this._clearDragCache();
  
};
ConquestGame.prototype.getDefaultLevelConfig = function() {
    return {
      id: 1,
      startGold: 300,
      summonCost: 80,
      maxWave: 3,
      maxAliveEnemies: 50,
      waves: [
        { type: "corpse", count: 30 },
        { type: "ghost", count: 30 },
        { type: "armor", count: 30 },
      ],
    };
  
};
ConquestGame.prototype.buildPath = function() {
    const path = [];
    for (let x = 0; x < this.COLS; x++) path.push({ x, y: 0 });
    for (let y = 1; y < this.ROWS; y++) path.push({ x: this.COLS - 1, y });
    for (let x = this.COLS - 2; x >= 0; x--) path.push({ x, y: this.ROWS - 1 });
    for (let y = this.ROWS - 2; y >= 1; y--) path.push({ x: 0, y });
    path.push({ x: 0, y: 0 });
    return path;
  
};
ConquestGame.prototype.buildPlacementGrid = function() {
    const grid = [];
    for (let x = 1; x < this.COLS - 1; x++) {
      for (let y = 1; y < this.ROWS - 1; y++) {
        grid.push({ x, y });
      }
    }
    return grid;
  
};
ConquestGame.prototype.setupUI = function() {
    this.addTrackedEventListener(document.getElementById("conquest-summon-btn"), "click", this._boundSummonTower);

    this.addTrackedEventListener(document.getElementById("conquest-wave-btn"), "click", this._boundStartWave);

    this.addTrackedEventListener(document.getElementById("conquest-fusion-encyclopedia-btn"), "click", this._boundShowFusionEncyclopedia);

    this.addTrackedEventListener(document.getElementById("conquest-menu-btn"), "click", this._boundReturnToLevelSelect);

    this.addTrackedEventListener(this.canvas, "mousemove", (e) => {
      const result = getGridFromEvent(e, this.canvas);
      if (result) {
        this.hoveredCell = { gx: result.gx, gy: result.gy };
      } else {
        this.hoveredCell = null;
      }

      if (this.draggingTower && !this.draggingTower.isFusion) {
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);
        if (checkDragThreshold(dist, this.dragThreshold)) {
          this.isDragging = true;
        }
      }
    });

    this.addTrackedEventListener(this.canvas, "mouseleave", () => {
      this.hoveredCell = null;
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    });

    this.addTrackedEventListener(this.canvas, "mousedown", (e) => {
      if (this.gameEnded) return;
      const result = getGridFromEvent(e, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragCurrentPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
        this._cacheDragMetrics();
      }
    });

    this.addTrackedEventListener(this.canvas, "mouseup", (e) => {
      if (this.gameEnded) {
        this.draggingTower = null;
        this.isDragging = false;
        return;
      }

      if (this.draggingTower && this.isDragging) {
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const targetTower = this.getTowerAt(gx, gy);
          if (targetTower && targetTower !== this.draggingTower) {
            this.attemptFusion(this.draggingTower, targetTower);
          } else if (this.canPlaceAt(gx, gy)) {
            this.moveTower(this.draggingTower, gx, gy);
          }
        }
      } else if (this.draggingTower && !this.isDragging) {
        const result = getGridFromEvent(e, this.canvas);
        if (result) {
          const { gx, gy } = result;
          const tower = this.getTowerAt(gx, gy);
          if (tower) {
            this.showTowerInfo(tower, e.clientX, e.clientY);
          } else {
            this.hideTowerInfo();
          }
        }
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
    });

    this.addTrackedEventListener(this.canvas, "contextmenu", (e) => {
      e.preventDefault();
      this.hideTowerInfo();
    });

    this.addTrackedEventListener(this.canvas, "touchstart", (e) => {
      e.preventDefault();
      if (this.gameEnded) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const result = getGridFromEvent(touch, this.canvas);
      if (!result) return;

      const { gx, gy } = result;
      const tower = this.getTowerAt(gx, gy);
      if (tower) {
        this.draggingTower = tower;
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        this.isDragging = false;
        this._cacheDragMetrics();
      }
    }, { passive: false });

    this.addTrackedEventListener(this.canvas, "touchmove", (e) => {
      e.preventDefault();
      // 多点触控时取消拖拽状态
      if (e.touches.length !== 1) {
        this.draggingTower = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.isDragging = false;
        this._clearDragCache();
        return;
      }
      if (this.draggingTower && !this.draggingTower.isFusion) {
        const touch = e.touches[0];
        this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };
        const dist = calculateDragDistance(this.dragStartPos.x, this.dragStartPos.y, this.dragCurrentPos.x, this.dragCurrentPos.y);
        // 触摸端使用更宽松的滑点，避免手指自然抖动被判成拖拽
        if (checkDragThreshold(dist, this.dragThresholdTouch)) {
          this.isDragging = true;
        }
      }
    }, { passive: false });

    this.addTrackedEventListener(this.canvas, "touchend", (e) => {
      e.preventDefault();
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
            const targetTower = this.getTowerAt(gx, gy);
            if (targetTower && targetTower !== this.draggingTower) {
              this.attemptFusion(this.draggingTower, targetTower);
            } else if (this.canPlaceAt(gx, gy)) {
              this.moveTower(this.draggingTower, gx, gy);
            }
          }
        }
      } else if (this.draggingTower && !this.isDragging) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const result = getGridFromEvent(touch, this.canvas);
          if (result) {
            const { gx, gy } = result;
            const tower = this.getTowerAt(gx, gy);
            if (tower) {
              this.showTowerInfo(tower, touch.clientX, touch.clientY);
            } else {
              this.hideTowerInfo();
            }
          }
        }
      }

      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    }, { passive: false });

    // 触摸取消时清理拖拽状态（不需要阻止默认行为，使用 passive: true）
    this.addTrackedEventListener(this.canvas, "touchcancel", (e) => {
      this.draggingTower = null;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.isDragging = false;
      this._clearDragCache();
    }, { passive: true });

    this._uiEventsActive = true;
  
};
ConquestGame.prototype.setupKeyboardShortcuts = function() {
    this._keyboardHandler = (e) => {
      // 如果游戏已结束，不响应快捷键
      if (this.gameEnded) return;

      // 检查是否有模态框显示
      const modal = document.getElementById("modal");
      const isModalVisible = modal && !modal.classList.contains("hidden");

      // 检查是否有炮塔信息面板显示
      const towerInfo = document.getElementById("conquest-tower-info");
      const isTowerInfoVisible = towerInfo && !towerInfo.classList.contains("hidden");

      // 检查是否有输入框聚焦
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.contentEditable === "true"
      );

      // ESC键：关闭弹窗或返回菜单
      if (e.key === "Escape") {
        if (isModalVisible) {
          // 关闭模态框
          modal.classList.add("hidden");
          // 清理融合模态框监听器
          this._cleanupFusionModalListeners();
          // 隐藏返回按钮（如果存在）
          const returnBtn = document.getElementById("modal-return-btn");
          if (returnBtn) returnBtn.style.display = "none";
        } else if (isTowerInfoVisible) {
          // 关闭炮塔信息面板
          this.hideTowerInfo();
        } else {
          // 返回主菜单
          this.returnToMenu();
        }
        return;
      }

      // 模态框显示时不响应其他游戏快捷键
      if (isModalVisible) return;

      // 输入框聚焦时不响应快捷键
      if (isInputFocused) return;

      switch (e.key) {
        case " ": // 空格键：开始波次
        case "Spacebar": // 兼容旧浏览器
          e.preventDefault(); // 防止页面滚动
          if (!this.waveInProgress && this.wave < this.maxWave) {
            this.startWave();
          }
          break;

        case "s":
        case "S": // S键：召唤炮塔
          this.summonTower();
          break;
      }
    };

    this.addTrackedEventListener(document, "keydown", this._keyboardHandler);
  
};
ConquestGame.prototype.cleanupKeyboardShortcuts = function() {
    // 键盘事件监听器现在由 _eventListeners 数组统一管理
    // 此方法保留用于兼容性，实际清理在 destroy() 中完成
    this._keyboardHandler = null;
  
};
ConquestGame.prototype.canPlaceAt = function(gx, gy) {
    if (this._placementGridSet.has(`${gx},${gy}`)) {
      for (const t of this.towers) {
        if (t.gx === gx && t.gy === gy) return false;
      }
      return true;
    }
    return false;
  
};
ConquestGame.prototype.moveTower = function(tower, gx, gy) {
    if (!this.canPlaceAt(gx, gy)) return;
    // 更新索引：删除旧位置，添加新位置
    this._towerIndex.delete(`${tower.gx},${tower.gy}`);
    tower.gx = gx;
    tower.gy = gy;
    this._towerIndex.set(`${gx},${gy}`, tower);
    const pos = gridToPixel(gx, gy);
    tower.x = pos.x;
    tower.y = pos.y;
    this.particleSystem.createExplosion(pos.x, pos.y, 8, CONFIG.COLORS.towerShadow);
    this.updateUI();
  
};
ConquestGame.prototype.getFusionType = function(type1, type2) {
    return fusionSystem.getFusionType(type1, type2);
  
};
ConquestGame.prototype.canFuse = function(tower1, tower2) {
    const result = fusionSystem.canFuse(tower1.type, tower2.type, {
      tower1,
      tower2,
      gold: this.gold,
    });
    return result.canFuse;
  
};
ConquestGame.prototype.showTowerInfo = function(tower, x, y) {
    const info = document.getElementById("conquest-tower-info");
    if (!info) return;

    const config = tower.isFusion
      ? CONFIG.FUSION_TOWERS[tower.fusionType]
      : CONFIG.TOWERS[tower.type];

    info.querySelector(".info-char").textContent = tower.char;
    info.querySelector(".info-level").textContent = tower.isFusion ? "融合 Lv.1" : `Lv.${tower.level}`;

    let stats = "";
    if (tower.isFusion) {
      stats += `组合: ${tower.components.map((c) => CONFIG.TOWERS[c]?.char || c).join("+")}<br>`;
    }
    if (tower.damage > 0) stats += `伤害: ${tower.damage}<br>`;
    if (tower.range) stats += `范围: ${tower.range}格<br>`;
    if (tower.cooldown) stats += `攻速: ${(tower.cooldown / 1000).toFixed(1)}秒<br>`;
    if (tower.slow) stats += `减速: ${Math.round(tower.slow * 100)}%<br>`;
    if (tower.hp) stats += `生命: ${tower.hp}/${tower.maxHp}<br>`;
    if (tower.burn) stats += `灼烧: 是<br>`;
    if (tower.pierce) stats += `穿透: 是<br>`;
    info.querySelector(".info-stats").innerHTML = stats;

    const sellBtn = info.querySelector(".sell-btn");
    sellBtn.textContent = `出售 +${tower.getSellValue()}金`;
    sellBtn.onclick = () => {
      this.sellTower(tower);
      this.hideTowerInfo();
    };

    // 添加右键取消选择提示
    let rightClickHint = info.querySelector(".right-click-hint");
    if (!rightClickHint) {
      rightClickHint = document.createElement("div");
      rightClickHint.className = "right-click-hint";
      rightClickHint.style.cssText = "font-size:11px;color:#666;text-align:center;margin-top:8px;font-family:'ZCOOL XiaoWei',serif;";
      info.appendChild(rightClickHint);
    }
    rightClickHint.textContent = "右键取消选择";

    const upgradeBtn = info.querySelector(".upgrade-btn");
    if (tower.isFusion || tower.level >= tower.maxLevel) {
      upgradeBtn.textContent = tower.isFusion ? "融合不可升级" : "已满级";
      upgradeBtn.disabled = true;
    } else {
      upgradeBtn.textContent = `升级 ${tower.upgradeCost * tower.level}金`;
      upgradeBtn.disabled = this.gold < tower.upgradeCost * tower.level;
      upgradeBtn.onclick = () => {
        const upgraded = tower.upgrade();
        if (upgraded) {
          this.updateUI();
          this.showTowerInfo(tower, x, y);
        }
      };
    }

    // 使用游戏容器尺寸计算面板位置，避免页面缩放或键盘弹出导致计算错误
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    const maxX = rect.width - 180;
    const maxY = rect.height - 150;
    info.style.left = Math.min(x, maxX) + "px";
    info.style.top = Math.min(y, maxY) + "px";
    info.classList.remove("hidden");

    tower.selected = true;
    for (const t of this.towers) {
      if (t !== tower) t.selected = false;
    }
  
};
ConquestGame.prototype.hideTowerInfo = function() {
    const info = document.getElementById("conquest-tower-info");
    if (info) info.classList.add("hidden");
    for (const t of this.towers) {
      t.selected = false;
    }
  
};
